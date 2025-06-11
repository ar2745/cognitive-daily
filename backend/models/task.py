import enum
import uuid

from sqlalchemy import (ARRAY, Column, DateTime, Enum, ForeignKey, Integer,
                        String, Time)
from sqlalchemy.dialects.postgresql import UUID

try:
    from backend.models.base import Base
except ImportError:
    from .base import Base

# Enum for task priority (matches Pydantic)
class TaskPriority(enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"

# Enum for task status (matches Pydantic)
class TaskStatus(enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"
    missed = "missed"

class Task(Base):
    __tablename__ = 'tasks'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    title = Column(String, nullable=False)
    duration = Column(Integer, nullable=False)
    priority = Column(Enum(TaskPriority, name="task_priority"), nullable=False)
    tags = Column(ARRAY(String), nullable=False, default=list)
    preferred_time = Column(Time, nullable=True)  # Optional
    status = Column(Enum(TaskStatus, name="task_status"), nullable=False)
    created_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime, nullable=True)  # Nullable for incomplete tasks 