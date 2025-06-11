from datetime import date, datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, EmailStr, Field


class UserProfileResponse(BaseModel):
    id: str
    email: EmailStr
    name: Optional[str]
    preferences: Optional[Dict[str, Any]]
    created_at: datetime
    default_working_hours: Optional[int]
    timezone: Optional[str]

class UserProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    preferences: Optional[Dict[str, Any]] 
    default_working_hours: Optional[int] = Field(None, ge=0)
    timezone: Optional[str]

class UserPreferences(BaseModel):
    theme: Optional[str] = Field(None, max_length=50)
    notifications: Optional[bool] = Field(None)
    display_options: Optional[Dict[str, Any]] = Field(None)

class UserStatistics(BaseModel):
    completed_tasks: int = Field(..., description="Number of tasks completed in the period")
    check_ins: int = Field(..., description="Number of check-ins in the period")
    streak: Optional[int] = Field(None, description="Current streak of daily activity")
    start_date: Optional[date] = Field(None, description="Start date of the statistics period")
    end_date: Optional[date] = Field(None, description="End date of the statistics period")
