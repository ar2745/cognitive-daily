from datetime import date, datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class DailyPlanBase(BaseModel):
    plan_date: date = Field(..., example="2025-05-18")
    energy_level: Optional[int] = Field(None, ge=0, le=10, example=7)
    available_hours: Optional[float] = Field(None, ge=0, le=24, example=8.0, description="Available hours for the day (float, up to 2 decimal places)")
    schedule: Optional[Dict[str, Any]] = Field(default_factory=dict, example={"08:00": "Task A", "09:00": "Task B"}, description="Structured plan schedule (JSONB)")
    notes: Optional[str] = None

class DailyPlanCreate(DailyPlanBase):
    pass

class DailyPlanUpdate(BaseModel):
    energy_level: Optional[int] = Field(None, ge=0, le=10)
    available_hours: Optional[float] = Field(None, ge=0, le=24)
    schedule: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None

class DailyPlanResponse(DailyPlanBase):
    id: UUID
    user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

# --- AI Integration Schemas ---

class DailyPlanAIGenerateRequest(BaseModel):
    plan_date: date = Field(..., example="2025-05-18")
    energy_level: Optional[int] = Field(None, ge=0, le=10, example=7)
    available_hours: Optional[float] = Field(None, ge=0, le=24, example=8.0)
    goals: Optional[List[str]] = Field(default_factory=list, example=["Finish report", "Exercise"])
    preferences: Optional[Dict[str, Any]] = Field(default_factory=dict, example={"breaks": "every 2 hours"})
    history: Optional[Dict[str, Any]] = Field(default_factory=dict, example={"yesterday": {"energy_level": 6, "schedule": {"08:00": "Emails"}}})

class DailyPlanAIGenerateResponse(BaseModel):
    schedule: Dict[str, Any] = Field(..., example={"08:00": "Task A", "09:00": "Task B"})
    notes: Optional[str] = Field(None, example="Focus on deep work in the morning.")
    raw_response: Optional[Any] = Field(None, description="Raw AI response for debugging (omit in production)")
