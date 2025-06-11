"""
Centralized prompt templates and logic for AI-powered daily planning.
"""
from datetime import date
from typing import Any, Dict, Optional

# --- Prompt Templates ---

def add_current_time_to_template(template: str) -> str:
    # Insert 'Current time: {current_time}' after 'Date: {plan_date}'
    return template.replace(
        "- Date: {plan_date}",
        "- Date: {plan_date}\n  - Current time: {current_time}"
    )

DAILY_PLAN_BASE_TEMPLATE = add_current_time_to_template(
    """
    You are a smart daily planner assistant.
    User info:
      - Date: {plan_date}
      - Energy level: {energy_level}
      - Available hours: {available_hours}
      - Goals: {goals}
      - Preferences: {preferences}
      - History: {history}
    Please generate a detailed, plan for the remaining typical awake hours of the day as a JSON object with a 'schedule' (dict of time: activity) and optional 'notes'.
    """
)

DAILY_PLAN_WORK_TEMPLATE = add_current_time_to_template(
    """
    You are a productivity-focused daily planner assistant.
    Today is a work-focused day.
    User info:
      - Date: {plan_date}
      - Energy level: {energy_level}
      - Available hours: {available_hours}
      - Work goals: {goals}
      - Preferences: {preferences}
      - History: {history}
    Generate a structured, efficient workday plan. Prioritize deep work and key deliverables. Return a JSON object with a 'schedule' and optional 'notes'.
    """
)

DAILY_PLAN_PERSONAL_TEMPLATE = add_current_time_to_template(
    """
    You are a well-being-oriented daily planner assistant.
    Today is a personal day.
    User info:
      - Date: {plan_date}
      - Energy level: {energy_level}
      - Available hours: {available_hours}
      - Personal goals: {goals}
      - Preferences: {preferences}
      - History: {history}
    Generate a balanced, restorative plan. Emphasize self-care, hobbies, and relaxation. Return a JSON object with a 'schedule' and optional 'notes'.
    """
)

DAILY_PLAN_WELLNESS_TEMPLATE = add_current_time_to_template(
    """
    You are a wellness-oriented daily planner assistant.
    Today, the user wants to focus on health, rest, and self-care.
    User info:
      - Date: {plan_date}
      - Energy level: {energy_level}
      - Available hours: {available_hours}
      - Wellness goals: {goals}
      - Preferences: {preferences}
      - History: {history}
    Create a gentle, restorative plan with time for exercise, healthy meals, and relaxation. Return a JSON object with a 'schedule' and optional 'notes'.
    """
)

DAILY_PLAN_TRAVEL_TEMPLATE = add_current_time_to_template(
    """
    You are a travel itinerary assistant.
    Today, the user is traveling.
    User info:
      - Date: {plan_date}
      - Destinations: {goals}
      - Preferences: {preferences}
      - History: {history}
    Plan an efficient, enjoyable travel day, including transit, sightseeing, meals, and rest. Return a JSON object with a 'schedule' and optional 'notes'.
    """
)

DAILY_PLAN_STUDY_TEMPLATE = add_current_time_to_template(
    """
    You are an academic-focused daily planner assistant.
    Today is a study-intensive day.
    User info:
      - Date: {plan_date}
      - Energy level: {energy_level}
      - Available hours: {available_hours}
      - Study goals: {goals}
      - Preferences: {preferences}
      - History: {history}
    Generate a focused study plan with blocks for reading, assignments, and breaks. Return a JSON object with a 'schedule' and optional 'notes'.
    """
)

DAILY_PLAN_CREATIVE_TEMPLATE = add_current_time_to_template(
    """
    You are a creativity-boosting daily planner assistant.
    Today is dedicated to creative pursuits.
    User info:
      - Date: {plan_date}
      - Energy level: {energy_level}
      - Available hours: {available_hours}
      - Creative goals: {goals}
      - Preferences: {preferences}
      - History: {history}
    Design a plan that encourages flow, inspiration, and time for artistic work. Return a JSON object with a 'schedule' and optional 'notes'.
    """
)

DAILY_PLAN_SOCIAL_TEMPLATE = add_current_time_to_template(
    """
    You are a social-oriented daily planner assistant.
    Today is focused on social connections and events.
    User info:
      - Date: {plan_date}
      - Energy level: {energy_level}
      - Available hours: {available_hours}
      - Social goals: {goals}
      - Preferences: {preferences}
      - History: {history}
    Plan a day with time for friends, family, and meaningful interactions. Return a JSON object with a 'schedule' and optional 'notes'.
    """
)

DAILY_PLAN_RECOVERY_TEMPLATE = add_current_time_to_template(
    """
    You are a gentle, recovery-focused daily planner assistant.
    Today, the user needs rest and recuperation.
    User info:
      - Date: {plan_date}
      - Energy level: {energy_level}
      - Available hours: {available_hours}
      - Recovery goals: {goals}
      - Preferences: {preferences}
      - History: {history}
    Create a plan with minimal demands, emphasizing rest, hydration, and light activity. Return a JSON object with a 'schedule' and optional 'notes'.
    """
)

DAILY_PLAN_DEADLINE_TEMPLATE = add_current_time_to_template(
    """
    You are a deadline-driven daily planner assistant.
    Today is a high-pressure day with urgent deliverables.
    User info:
      - Date: {plan_date}
      - Energy level: {energy_level}
      - Available hours: {available_hours}
      - Deadline goals: {goals}
      - Preferences: {preferences}
      - History: {history}
    Build a time-boxed plan that prioritizes urgent tasks and minimizes distractions. Return a JSON object with a 'schedule' and optional 'notes'.
    """
)

DAILY_PLAN_WEEKEND_TEMPLATE = add_current_time_to_template(
    """
    You are a weekend-oriented daily planner assistant.
    Today is for leisure, fun, and recharging.
    User info:
      - Date: {plan_date}
      - Energy level: {energy_level}
      - Available hours: {available_hours}
      - Weekend goals: {goals}
      - Preferences: {preferences}
      - History: {history}
    Suggest a flexible, enjoyable plan with time for hobbies, rest, and socializing. Return a JSON object with a 'schedule' and optional 'notes'.
    """
)

DAILY_PLAN_PARENTING_TEMPLATE = add_current_time_to_template(
    """
    You are a family-oriented daily planner assistant.
    Today involves parenting and family activities.
    User info:
      - Date: {plan_date}
      - Energy level: {energy_level}
      - Available hours: {available_hours}
      - Family goals: {goals}
      - Preferences: {preferences}
      - History: {history}
    Plan a day that balances childcare, family time, and personal needs. Return a JSON object with a 'schedule' and optional 'notes'.
    """
)

DAILY_PLAN_MINIMALIST_TEMPLATE = add_current_time_to_template(
    """
    You are a minimalist daily planner assistant.
    Today, the user wants to focus only on essentials.
    User info:
      - Date: {plan_date}
      - Energy level: {energy_level}
      - Available hours: {available_hours}
      - Essential goals: {goals}
      - Preferences: {preferences}
      - History: {history}
    Create a simple plan with only the most important tasks, reducing overload. Return a JSON object with a 'schedule' and optional 'notes'.
    """
)

TASK_ANALYSIS_TEMPLATE = """
You are an expert productivity assistant. Analyze the following list of tasks for a user's daily plan.

User info:
  - Date: {plan_date}
  - Energy level: {energy_level}
  - Available hours: {available_hours}
  - Preferences: {preferences}

Tasks:
{tasks}

Instructions:
- Suggest improvements or optimizations for the tasks (e.g., splitting, merging, rewording).
- Prioritize the tasks based on importance, urgency, and user preferences.
- Recommend a time allocation for each task, as an integer number of minutes (e.g., 60 for 1 hour, 90 for 1.5 hours). Do not use hours or strings like '1 hour' or '90 mins'.
- Ensure the total time fits within the user's available minutes for the day.
- If any tasks are unclear or redundant, note them.
- Return your response as a JSON object with:
  - "optimized_tasks": a list of tasks with suggested order and time allocation (in minutes, integer)
  - "suggestions": a list of optimization notes or recommendations
  - "raw_response": the full text of your analysis
"""

# --- Scenario Selection Logic ---

def select_prompt_template(scenario: str) -> str:
    """
    Select the appropriate prompt template based on the scenario.
    """
    if scenario == "work":
        return DAILY_PLAN_WORK_TEMPLATE
    elif scenario == "personal":
        return DAILY_PLAN_PERSONAL_TEMPLATE
    elif scenario == "wellness":
        return DAILY_PLAN_WELLNESS_TEMPLATE
    elif scenario == "travel":
        return DAILY_PLAN_TRAVEL_TEMPLATE
    elif scenario == "study":
        return DAILY_PLAN_STUDY_TEMPLATE
    elif scenario == "creative":
        return DAILY_PLAN_CREATIVE_TEMPLATE
    elif scenario == "social":
        return DAILY_PLAN_SOCIAL_TEMPLATE
    elif scenario == "recovery":
        return DAILY_PLAN_RECOVERY_TEMPLATE
    elif scenario == "deadline":
        return DAILY_PLAN_DEADLINE_TEMPLATE
    elif scenario == "weekend":
        return DAILY_PLAN_WEEKEND_TEMPLATE
    elif scenario == "parenting":
        return DAILY_PLAN_PARENTING_TEMPLATE
    elif scenario == "minimalist":
        return DAILY_PLAN_MINIMALIST_TEMPLATE
    else:
        return DAILY_PLAN_BASE_TEMPLATE


def build_prompt(
    plan_date: date,
    energy_level: Optional[int],
    available_hours: Optional[float],
    goals: Any,
    preferences: Any,
    history: Any,
    current_time: str = None,
    scenario: str = "base"
) -> str:
    """
    Build a prompt string for the AI model using the selected template and provided context.
    """
    template = select_prompt_template(scenario)
    # Format fields for readability
    goals_str = ", ".join(goals) if isinstance(goals, (list, tuple)) else str(goals)
    return template.format(
        plan_date=plan_date,
        current_time=current_time or "N/A",
        energy_level=energy_level if energy_level is not None else "N/A",
        available_hours=available_hours if available_hours is not None else "N/A",
        goals=goals_str,
        preferences=preferences if preferences else "{}",
        history=history if history else "{}"
    )

def build_context(
    user: Any,
    request: Any,
    recent_plans: Optional[Any] = None,
    current_time: str = None
) -> Dict[str, Any]:
    """
    Assemble all relevant context for prompt generation.
    - user: User SQLAlchemy model or Pydantic schema
    - request: DailyPlanAIGenerateRequest
    - recent_plans: Optional, list/dict of recent plans (from cache)
    - current_time: string, e.g. '14:30' or '2024-06-01T14:30:00'
    Returns a dict with all fields needed for build_prompt.
    """
    # Extract user preferences and default working hours
    preferences = getattr(user, "preferences", None) or {}
    default_hours = getattr(user, "default_working_hours", None)
    # Use request fields, falling back to user defaults if needed
    plan_date = getattr(request, "plan_date", None)
    energy_level = getattr(request, "energy_level", None)
    available_hours = getattr(request, "available_hours", None) or default_hours
    goals = getattr(request, "goals", None) or []
    req_preferences = getattr(request, "preferences", None) or {}
    # Merge user and request preferences (request takes precedence)
    merged_preferences = {**preferences, **req_preferences}
    history = getattr(request, "history", None) or {}
    if recent_plans:
        history = {**history, "recent_plans": recent_plans}
    # Scenario selection (could be based on request, user, or logic)
    scenario = getattr(request, "scenario", None) or merged_preferences.get("scenario") or "base"
    # Only include non-sensitive user info
    context = {
        "plan_date": plan_date,
        "current_time": current_time,
        "energy_level": energy_level,
        "available_hours": available_hours,
        "goals": goals,
        "preferences": merged_preferences,
        "history": history,
        "scenario": scenario
    }
    return context 

def build_task_analysis_prompt(
    plan_date,
    energy_level,
    available_hours,
    preferences,
    tasks
) -> str:
    tasks_str = "\n".join(f"- {t}" for t in tasks)
    return TASK_ANALYSIS_TEMPLATE.format(
        plan_date=plan_date,
        energy_level=energy_level if energy_level is not None else "N/A",
        available_hours=available_hours if available_hours is not None else "N/A",
        preferences=preferences if preferences else "{}",
        tasks=tasks_str
    ) 