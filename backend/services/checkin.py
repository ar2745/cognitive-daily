from datetime import date, datetime, timedelta
from typing import List, Optional
from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

try:
    from backend.models.checkin import CheckIn, CheckInType
    from backend.schemas.checkin import CheckInCreate, CheckInUpdate
except ImportError:
    from models.checkin import CheckIn, CheckInType
    from schemas.checkin import CheckInCreate, CheckInUpdate

class CheckInService:
    """
    Service layer for Check-in business logic, handling all DB interactions directly.
    """
    async def create_check_in(self, db: AsyncSession, user_id: UUID, checkin_in: CheckInCreate, created_at: Optional[datetime] = None) -> CheckIn:
        if created_at is None:
            created_at = datetime.utcnow()
        checkin = CheckIn(
            user_id=user_id,
            type=checkin_in.type,
            energy_level=checkin_in.energy_level,
            notes=checkin_in.notes,
            created_at=created_at
        )
        db.add(checkin)
        await db.commit()
        await db.refresh(checkin)
        return checkin

    async def get_check_in_by_id(self, db: AsyncSession, checkin_id: UUID) -> Optional[CheckIn]:
        result = await db.execute(select(CheckIn).where(CheckIn.id == checkin_id))
        return result.scalars().first()

    async def get_todays_check_ins(self, db: AsyncSession, user_id: UUID, today: Optional[date] = None) -> List[CheckIn]:
        if today is None:
            today = date.today()
        result = await db.execute(
            select(CheckIn).where(
                and_(CheckIn.user_id == user_id, CheckIn.check_in_date == today)
            )
        )
        return result.scalars().all()

    async def get_check_in_history(self, db: AsyncSession, user_id: UUID, page: int = 1, page_size: int = 20, start_date: Optional[date] = None, end_date: Optional[date] = None) -> List[CheckIn]:
        query = select(CheckIn).where(CheckIn.user_id == user_id)
        if start_date:
            query = query.where(CheckIn.check_in_date >= start_date)
        if end_date:
            query = query.where(CheckIn.check_in_date <= end_date)
        query = query.order_by(CheckIn.check_in_date.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        return result.scalars().all()

    async def update_check_in(self, db: AsyncSession, checkin_id: UUID, update_in: CheckInUpdate) -> Optional[CheckIn]:
        result = await db.execute(select(CheckIn).where(CheckIn.id == checkin_id))
        checkin = result.scalars().first()
        if not checkin:
            return None
        for field, value in update_in.dict(exclude_unset=True).items():
            setattr(checkin, field, value)
        await db.commit()
        await db.refresh(checkin)
        return checkin

    async def delete_check_in(self, db: AsyncSession, checkin_id: UUID) -> bool:
        result = await db.execute(select(CheckIn).where(CheckIn.id == checkin_id))
        checkin = result.scalars().first()
        if not checkin:
            return False
        await db.delete(checkin)
        await db.commit()
        return True 