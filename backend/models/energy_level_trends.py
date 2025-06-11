from sqlalchemy import BigInteger, Column, Date, Numeric
from sqlalchemy.dialects.postgresql import UUID

try:
    from backend.models.base import Base
except ImportError:
    from .base import Base


class EnergyLevelTrends(Base):
    __tablename__ = 'energy_level_trends'
    __table_args__ = {'extend_existing': True}
    user_id = Column(UUID(as_uuid=True), primary_key=True)
    check_date = Column(Date, primary_key=True)
    avg_energy_level = Column(Numeric)
    check_in_count = Column(BigInteger)
    available_hours = Column(Numeric(4,2))
    completed_tasks = Column(BigInteger)
    total_tasks = Column(BigInteger) 