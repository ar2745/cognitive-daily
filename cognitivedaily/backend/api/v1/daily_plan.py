import logging
from datetime import date
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi_limiter.depends import RateLimiter
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

try:
    from backend.core.database import get_db
    from backend.dependencies.auth import get_current_user
    from backend.schemas.daily_plan import (DailyPlanAIGenerateRequest,
                                            DailyPlanAIGenerateResponse,
                                            DailyPlanCreate, DailyPlanResponse,
                                            DailyPlanUpdate)
    from backend.schemas.task import TaskAnalysisRequest, TaskAnalysisResponse
    from backend.services.daily_plan import DailyPlanService
    from backend.services.daily_plan_ai import (DailyPlanAIService,
                                                OllamaServiceError,
                                                OpenAIServiceError)
    from backend.services.user import get_user_by_id
except ImportError:
    from core.database import get_db
    from dependencies.auth import get_current_user
    from schemas.daily_plan import (DailyPlanAIGenerateRequest,
                                    DailyPlanAIGenerateResponse,
                                    DailyPlanCreate, DailyPlanResponse,
                                    DailyPlanUpdate)
    from schemas.task import TaskAnalysisRequest, TaskAnalysisResponse
    from services.daily_plan import DailyPlanService
    from services.daily_plan_ai import (DailyPlanAIService, OllamaServiceError,
                                        OpenAIServiceError)
    from services.user import get_user_by_id

router = APIRouter(prefix="/daily-plans", tags=["Daily Plans"])
service = DailyPlanService()

@router.post("/", response_model=DailyPlanResponse, status_code=status.HTTP_201_CREATED)
@router.post("", response_model=DailyPlanResponse, status_code=status.HTTP_201_CREATED)
async def create_daily_plan(
    plan_in: DailyPlanCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    plan = await service.create_daily_plan(db, user_id=current_user["user_id"], plan_in=plan_in)
    return plan

@router.get("/", response_model=List[DailyPlanResponse])
@router.get("", response_model=List[DailyPlanResponse])
async def list_daily_plans(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    plan_date: Optional[date] = None,
    skip: int = 0,
    limit: int = 20
):
    plans = await service.list_daily_plans(db, user_id=current_user["user_id"], plan_date=plan_date, skip=skip, limit=limit)
    return plans

@router.get("/{plan_id}", response_model=DailyPlanResponse)
@router.get("/{plan_id}/", response_model=DailyPlanResponse)
async def get_daily_plan_by_id(
    plan_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    plan = await service.get_daily_plan_by_id(db, plan_id)
    if not plan or plan.user_id != current_user["user_id"]:
        raise HTTPException(status_code=404, detail="Daily plan not found")
    return plan

@router.put("/{plan_id}", response_model=DailyPlanResponse)
@router.put("/{plan_id}/", response_model=DailyPlanResponse)
async def update_daily_plan(
    plan_id: UUID,
    update_in: DailyPlanUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    plan = await service.get_daily_plan_by_id(db, plan_id)
    if not plan or str(plan.user_id) != str(current_user["user_id"]):
        raise HTTPException(status_code=404, detail="Daily plan not found")
    updated = await service.update_daily_plan(db, plan_id, update_in)
    return updated

@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
@router.delete("/{plan_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_daily_plan(
    plan_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    plan = await service.get_daily_plan_by_id(db, plan_id)
    if not plan or plan.user_id != current_user["user_id"]:
        raise HTTPException(status_code=404, detail="Daily plan not found")
    await service.delete_daily_plan(db, plan_id)
    return None

class EnergyLevelUpdate(BaseModel):
    energy_level: int

@router.patch("/{plan_id}/energy-level", response_model=DailyPlanResponse)
@router.patch("/{plan_id}/energy-level/", response_model=DailyPlanResponse)
async def update_energy_level(
    plan_id: UUID,
    update: EnergyLevelUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    plan = await service.get_daily_plan_by_id(db, plan_id)
    if not plan or str(plan.user_id) != str(current_user["user_id"]):
        raise HTTPException(status_code=404, detail="Daily plan not found")
    # Only update energy_level
    plan.energy_level = update.energy_level
    await db.commit()
    await db.refresh(plan)
    return plan

# Dependency to set user_id in request.state before rate limiting
async def set_user_id_in_state(request: Request, current_user=Depends(get_current_user)):
    request.state.user_id = current_user["user_id"]

# Rate limiter identifier function (must not be async)
async def rate_limit_identifier(request: Request):
    return request.state.user_id

@router.post(
    "/ai-generate",
    response_model=DailyPlanAIGenerateResponse,
    summary="AI-powered daily plan generation",
    description="Generate a daily plan using AI (OpenAI preferred, local LLM fallback). Auth required.",
    dependencies=[
        Depends(set_user_id_in_state),
        Depends(RateLimiter(times=3, seconds=60, identifier=rate_limit_identifier))
    ]
)
@router.post(
    "/ai-generate/",
    response_model=DailyPlanAIGenerateResponse,
    summary="AI-powered daily plan generation",
    description="Generate a daily plan using AI (OpenAI preferred, local LLM fallback). Auth required.",
    dependencies=[
        Depends(set_user_id_in_state),
        Depends(RateLimiter(times=3, seconds=60, identifier=rate_limit_identifier))
    ]
)
async def ai_generate_daily_plan(
    request: Request,
    request_body: DailyPlanAIGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Generate a daily plan using AI based on user context. Prioritizes OpenAI, falls back to local LLM if needed.
    Rate limited to 3 requests per minute per user.
    """
    service = DailyPlanAIService()
    try:
        user = await get_user_by_id(db, current_user["user_id"])
        plan = await service.generate_plan(user=user, request=request_body)
        return plan
    except OpenAIServiceError as oe:
        logging.error(f"OpenAI error: {oe}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OpenAI service is temporarily unavailable. Please try again later."
        )
    except OllamaServiceError as oe:
        logging.error(f"Ollama error: {oe}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Local AI service is temporarily unavailable. Please try again later."
        )
    except NotImplementedError as nie:
        logging.error(f"AI provider not implemented: {nie}")
        raise HTTPException(status_code=501, detail="AI provider not implemented.")
    except Exception as e:
        logging.error(f"AI plan generation failed: {e}")
        raise HTTPException(status_code=500, detail="AI plan generation failed.") 

@router.post(
    "/ai-analyze-tasks",
    response_model=TaskAnalysisResponse,
    summary="AI-powered task analysis and optimization",
    description="Analyze and optimize a list of tasks using AI (OpenAI preferred, local LLM fallback). Auth required.",
    dependencies=[
        Depends(set_user_id_in_state),
        Depends(RateLimiter(times=3, seconds=60, identifier=rate_limit_identifier))
    ]
)
@router.post(
    "/ai-analyze-tasks/",
    response_model=TaskAnalysisResponse,
    summary="AI-powered task analysis and optimization",
    description="Analyze and optimize a list of tasks using AI (OpenAI preferred, local LLM fallback). Auth required.",
    dependencies=[
        Depends(set_user_id_in_state),
        Depends(RateLimiter(times=3, seconds=60, identifier=rate_limit_identifier))
    ]
)
async def ai_analyze_tasks(
    request: Request,
    request_body: TaskAnalysisRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Analyze and optimize a list of tasks using AI based on user context. Prioritizes OpenAI, falls back to local LLM if needed.
    Rate limited to 3 requests per minute per user.
    """
    ai_service = DailyPlanAIService()
    try:
        user = await get_user_by_id(db, current_user["user_id"])
        result = await ai_service.analyze_tasks(
            user=user,
            tasks=request_body.tasks,
            plan_date=request_body.plan_date,
            energy_level=request_body.energy_level,
            available_hours=request_body.available_hours,
            preferences=request_body.preferences
        )
        # Convert optimized_tasks to OptimizedTask models for response validation
        optimized_tasks = [
            {
                "task": t["task"] if isinstance(t, dict) and "task" in t else str(t),
                "time_allocation": int(t["time_allocation"]) if t.get("time_allocation") is not None else None,
                "order": t.get("order") if isinstance(t, dict) else None
            } for t in result.get("optimized_tasks", [])
        ]
        return TaskAnalysisResponse(
            optimized_tasks=optimized_tasks,
            suggestions=result.get("suggestions", []),
            raw_response=result.get("raw_response")
        )
    except OpenAIServiceError as oe:
        logging.error(f"OpenAI error: {oe}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OpenAI service is temporarily unavailable. Please try again later."
        )
    except OllamaServiceError as oe:
        logging.error(f"Ollama error: {oe}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Local AI service is temporarily unavailable. Please try again later."
        )
    except NotImplementedError as nie:
        logging.error(f"AI provider not implemented: {nie}")
        raise HTTPException(status_code=501, detail="AI provider not implemented.")
    except Exception as e:
        logging.error(f"AI task analysis failed: {e}")
        raise HTTPException(status_code=500, detail="AI task analysis failed.") 