import uuid

from sqlalchemy import (Column, Date, DateTime, ForeignKey, Integer, String,
                        Text)
from sqlalchemy.dialects.postgresql import JSONB, UUID

try:
    from backend.models.base import Base
except ImportError:
    from .base import Base


class DailyPlan(Base):
    __tablename__ = 'daily_plans'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    plan_date = Column(Date, nullable=False)  # Use Date if only date is needed
    energy_level = Column(Integer)
    available_hours = Column(Integer)
    schedule = Column(JSONB, nullable=True)   # Use JSON/JSONB if storing structured data
    created_at = Column(DateTime)
    notes = Column(Text, nullable=True) 