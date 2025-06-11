import json
import logging
import re
from datetime import datetime
from typing import Any

import httpx
import openai
from openai import AsyncOpenAI

try:
    from backend.core.config import get_settings
except ImportError:
    from core.config import get_settings

try:
    from backend.schemas.daily_plan import (DailyPlanAIGenerateRequest,
                                            DailyPlanAIGenerateResponse)
except ImportError:
    from schemas.daily_plan import (DailyPlanAIGenerateRequest,
                                    DailyPlanAIGenerateResponse)

# Import cache and prompt utilities
try:
    from backend.services.ai_prompts import (build_context, build_prompt,
                                             build_task_analysis_prompt)
    from backend.utils.cache import get_recent_daily_plans
except ImportError:
    from services.ai_prompts import (build_context, build_prompt,
                                     build_task_analysis_prompt)
    from utils.cache import get_recent_daily_plans

settings = get_settings()
openai_api_keyzzzz = ""

class OpenAIServiceError(Exception):
    pass

class OllamaServiceError(Exception):
    pass

class DailyPlanAIService:   
    """
    Service for AI-powered daily plan generation.
    Prioritizes OpenAI, falls back to local LLM if needed.
    """
    def __init__(self, openai_client=None, local_llm_client=None):
        self.openai_client = openai_client
        self.local_llm_client = local_llm_client
        self.logger = logging.getLogger("DailyPlanAIService")
        self.client = AsyncOpenAI(api_key=openai_api_key)

    async def generate_plan(self, user: Any, request: DailyPlanAIGenerateRequest) -> DailyPlanAIGenerateResponse:
        """
        Generate a daily plan using AI, prioritizing OpenAI and falling back to local LLM.
        """
        # Fetch recent plans from cache
        recent_plans = await get_recent_daily_plans(str(user.id))
        # Get current time as HH:MM
        now = datetime.now().strftime('%H:%M')
        # Build context for prompt, including current_time
        context = build_context(user, request, recent_plans, current_time=now)
        prompt = build_prompt(**context)
        self.logger.info(f"AI plan generation requested by user {user.id} with prompt: {prompt}")
        try:
            ai_response = await self._call_openai(prompt)
        except Exception as e:
            self.logger.warning(f"OpenAI failed: {e}, falling back to local LLM.")
            try:
                ai_response = await self._call_local_llm(prompt)
            except Exception as ollama_e:
                self.logger.error(f"Ollama LLM call failed: {ollama_e}")
                raise OllamaServiceError(str(ollama_e)) from ollama_e
            else:
                # If Ollama succeeds, still raise OpenAIServiceError to indicate fallback was used
                raise OpenAIServiceError(str(e)) from e
        plan = self._parse_ai_response(ai_response)
        self.logger.info(f"AI plan generated for user {user.id}: {plan}")
        return plan

    async def _call_openai(self, prompt: str) -> Any:
        """
        Call OpenAI GPT-4-turbo API with the given prompt. Returns the parsed response.
        """
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4-turbo",
                messages=[{"role": "system", "content": "You are a helpful daily planning assistant."},
                          {"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=1024,
            )
            content = response.choices[0].message.content
            self.logger.info(f"OpenAI response: {content}")
            return content
        except Exception as e:
            self.logger.error(f"OpenAI API call failed: {e}")
            raise

    async def _call_local_llm(self, prompt: str) -> Any:
        """
        Call local Ollama LLM server as a fallback.
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "http://localhost:11434/api/generate",
                    json={"model": "llama3", "prompt": prompt, "stream": False},
                    timeout=30
                )
                response.raise_for_status()
                data = response.json()
                # Assume Ollama returns {'response': '...'}
                return data.get("response", "")
        except Exception as e:
            self.logger.error(f"Ollama LLM call failed: {e}")
            raise

    def _parse_ai_response(self, ai_response: Any) -> DailyPlanAIGenerateResponse:
        """
        Parse the AI response into a DailyPlanAIGenerateResponse.
        """

        # Remove markdown code block if present
        cleaned = re.sub(r"^```(?:json)?\s*|```$", "", ai_response.strip(), flags=re.MULTILINE)
        try:
            parsed = json.loads(cleaned)
        except Exception:
            parsed = {"schedule": {}, "notes": None, "raw_response": ai_response}
        notes = parsed.get("notes")
        if isinstance(notes, list):
            notes = "\n".join(str(n) for n in notes)
        elif notes is not None:
            notes = str(notes)
        parsed["notes"] = notes
        return DailyPlanAIGenerateResponse(
            schedule=parsed.get("schedule", {}),
            notes=parsed.get("notes"),
            raw_response=ai_response
        ) 

    def parse_time_allocation_to_minutes(self, value):
        if isinstance(value, int):
            return value
        if isinstance(value, float):
            return int(round(value))
        if isinstance(value, str):
            value = value.strip().lower()
            match = re.match(r"([\\d\\.]+)\\s*(hour|hr|h|minute|min|m)s?", value)
            if match:
                num = float(match.group(1))
                unit = match.group(2)
                if unit.startswith('h'):
                    return int(round(num * 60))
                elif unit.startswith('m'):
                    return int(round(num))
            # Try to parse numbers only
            try:
                return int(round(float(value)))
            except Exception:
                return None
        return None

    def _parse_task_analysis_response(self, ai_response: Any) -> dict:
        """
        Parse the AI response for task analysis and optimization.
        """
        import json
        import re

        # Remove markdown code block if present
        cleaned = re.sub(r"^```(?:json)?\\s*|```$", "", ai_response.strip(), flags=re.MULTILINE)
        try:
            parsed = json.loads(cleaned)
        except Exception:
            # Fallback: return raw response in suggestions
            return {
                "optimized_tasks": [],
                "suggestions": ["Failed to parse AI response. See raw_response."],
                "raw_response": ai_response
            }
        # Post-process time_allocation to ensure integer minutes
        optimized_tasks = parsed.get("optimized_tasks", [])
        for t in optimized_tasks:
            if isinstance(t, dict):
                t["time_allocation"] = self.parse_time_allocation_to_minutes(t.get("time_allocation"))
        return {
            "optimized_tasks": optimized_tasks,
            "suggestions": parsed.get("suggestions", []),
            "raw_response": ai_response
        }

    async def analyze_tasks(self, user: Any, tasks: list, plan_date, energy_level, available_hours, preferences) -> dict:
        """
        Analyze and optimize a list of tasks using AI, returning prioritized tasks, time allocations, and suggestions.
        """
        # Filter out completed tasks and pass titles only
        incomplete_tasks = [t for t in tasks if getattr(t, 'status', None) not in ("completed", "COMPLETED")]
        task_titles = [getattr(t, 'title', str(t)) for t in incomplete_tasks]
        prompt = build_task_analysis_prompt(plan_date, energy_level, available_hours, preferences, task_titles)
        self.logger.info(f"AI task analysis requested by user {user.id} with prompt: {prompt}")
        try:
            ai_response = await self._call_openai(prompt)
        except Exception as e:
            self.logger.warning(f"OpenAI failed: {e}, falling back to local LLM.")
            try:
                ai_response = await self._call_local_llm(prompt)
            except Exception as ollama_e:
                self.logger.error(f"Ollama LLM call failed: {ollama_e}")
                raise OllamaServiceError(str(ollama_e)) from ollama_e
            else:
                raise OpenAIServiceError(str(e)) from e
        return self._parse_task_analysis_response(ai_response)
