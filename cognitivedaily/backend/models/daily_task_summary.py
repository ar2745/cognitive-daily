from sqlalchemy import BigInteger, Column, Date, Integer, Numeric
from sqlalchemy.dialects.postgresql import UUID

try:
    from backend.models.base import Base
except ImportError:
    from .base import Base


class DailyTaskSummary(Base):
    __tablename__ = 'daily_task_summary'
    __table_args__ = {'extend_existing': True}
    user_id = Column(UUID(as_uuid=True), primary_key=True)
    task_date = Column(Date, primary_key=True)
    total_tasks = Column(BigInteger)
    completed_tasks = Column(BigInteger)
    avg_completion_time = Column(Numeric)
    daily_energy = Column(Integer)
    available_hours = Column(Numeric(4,2)) 