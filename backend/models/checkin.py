import enum
import uuid

from sqlalchemy import (Column, Computed, Date, DateTime, Enum, ForeignKey,
                        Integer, String)
from sqlalchemy.dialects.postgresql import UUID

try:
    from backend.models.base import Base
except ImportError:
    from .base import Base

class CheckInType(enum.Enum):
    morning = "morning"
    afternoon = "afternoon"
    evening = "evening"
    night = "night"

class CheckIn(Base):
    __tablename__ = 'check_ins'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    type = Column(Enum(CheckInType, name="check_in_type"), nullable=False)
    energy_level = Column(Integer)
    notes = Column(String)
    created_at = Column(DateTime)# Use Date if only date is needed 
    check_in_date = Column(Date, Computed("date(created_at)"), nullable=False)