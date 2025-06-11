from datetime import date, datetime, time
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, validator


# Enum for task priority
class TaskPriority(str, Enum):
    LOW = 'low'
    MEDIUM = 'medium'
    HIGH = 'high'

# Enum for task status
class TaskStatus(str, Enum):
    PENDING = 'pending'
    IN_PROGRESS = 'in_progress'
    COMPLETED = 'completed'
    CANCELLED = 'cancelled'
    MISSED = 'missed'

# Base model for common task fields
class TaskBase(BaseModel):
    title: str = Field(..., example="Write project report")
    duration: int = Field(..., example=60, description="Duration in minutes")
    priority: TaskPriority = Field(..., example="medium")
    tags: Optional[List[str]] = Field(default_factory=list, example=["work", "writing"])
    preferred_time: Optional[time] = Field(None, example="09:00:00")
    status: TaskStatus = Field(..., example="pending")

    @validator('preferred_time', pre=True)
    def parse_preferred_time(cls, v):
        if v is None or isinstance(v, time):
            return v
        if isinstance(v, str):
            # Try parsing as 24-hour time first
            try:
                return time.fromisoformat(v)
            except ValueError:
                pass
            # Try parsing as 12-hour time with AM/PM
            import datetime as dt
            import re
            match = re.match(r'^(0?[1-9]|1[0-2]):([0-5][0-9])\s?(AM|PM)$', v.strip(), re.IGNORECASE)
            if match:
                hour = int(match.group(1))
                minute = int(match.group(2))
                ampm = match.group(3).upper()
                if ampm == 'PM' and hour != 12:
                    hour += 12
                if ampm == 'AM' and hour == 12:
                    hour = 0
                return dt.time(hour, minute)
        raise ValueError('preferred_time must be a valid time string (e.g., "17:30:00" or "2:15 PM") or a time object')

# Model for creating a new task (user_id is set by backend, not client)
class TaskCreate(TaskBase):
    """Model for creating a new task. user_id is set by the backend from the authenticated user."""
    pass

# Model for updating a task (all fields optional)
class TaskUpdate(BaseModel):
    title: Optional[str] = None
    duration: Optional[int] = None
    priority: Optional[TaskPriority] = None
    tags: Optional[List[str]] = None
    preferred_time: Optional[time] = None
    status: Optional[TaskStatus] = None

# Model for API responses (includes all fields)
class TaskResponse(TaskBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True 

class TaskAnalysisRequest(BaseModel):
    plan_date: date = Field(..., example="2025-05-18")
    energy_level: Optional[int] = Field(None, ge=0, le=10, example=7)
    available_hours: Optional[float] = Field(None, ge=0, le=24, example=8.0)
    preferences: Optional[Dict[str, Any]] = Field(default_factory=dict, example={"focus": "work"})
    tasks: List[str] = Field(..., example=["Write report", "Team meeting", "Code review"])

class OptimizedTask(BaseModel):
    task: str
    time_allocation: Optional[int] = Field(None, description="Time allocated to the task in hours or minutes")
    order: Optional[int] = Field(None, description="Order in the optimized list")

class TaskAnalysisResponse(BaseModel):
    optimized_tasks: List[OptimizedTask] = Field(..., description="List of optimized/prioritized tasks with time allocations")
    suggestions: List[str] = Field(..., description="AI-generated suggestions or optimization notes")
    raw_response: Optional[Any] = Field(None, description="Raw AI response for debugging (omit in production)") 