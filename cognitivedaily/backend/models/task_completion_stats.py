from sqlalchemy import BigInteger, Column, DateTime, Numeric, String
from sqlalchemy.dialects.postgresql import UUID

try:
    from backend.models.base import Base
except ImportError:
    from .base import Base


class TaskCompletionStats(Base):
    __tablename__ = 'task_completion_stats'
    __table_args__ = {'extend_existing': True}
    user_id = Column(UUID(as_uuid=True), primary_key=True)
    week_start = Column(DateTime, primary_key=True)
    total_tasks = Column(BigInteger)
    completed_tasks = Column(BigInteger)
    completion_rate = Column(Numeric)
    avg_task_duration = Column(Numeric)
    most_common_priority = Column(String) 