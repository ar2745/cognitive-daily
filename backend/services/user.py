import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import Session

try:
    from backend.models.daily_task_summary import DailyTaskSummary
    from backend.models.energy_level_trends import EnergyLevelTrends
    from backend.models.user import User
    from backend.schemas.user import UserProfileUpdate
    from backend.utils.cache import cache_statistics
except ImportError:
    from models.daily_task_summary import DailyTaskSummary
    from models.energy_level_trends import EnergyLevelTrends
    from models.user import User
    from schemas.user import UserProfileUpdate
    from utils.cache import cache_statistics

async def create_user_profile(db: AsyncSession, current_user):
    # Extract info from current_user (dict from Supabase Auth)
    user = User(
        id=current_user["user_id"],
        email=current_user.get("email"),
        name=current_user.get("name", ""),
        preferences={},
        default_working_hours=8,
        created_at=datetime.now(),
        timezone=current_user.get("timezone", "UTC")
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

async def get_user_by_id(db: AsyncSession, user_id: str) -> Optional[User]:
    try:
        user_id = uuid.UUID(user_id)
    except (ValueError, TypeError, AttributeError):
        return None
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalars().first()

async def update_user_profile(db: AsyncSession, user_id: str, update: UserProfileUpdate) -> Optional[User]:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        return None
    if update.name is not None:
        user.name = update.name
    if update.preferences is not None:
        user.preferences = update.preferences
    if update.default_working_hours is not None:
        user.default_working_hours = update.default_working_hours
    if hasattr(update, 'timezone') and update.timezone is not None:
        user.timezone = update.timezone
    await db.commit()
    await db.refresh(user)
    return user

@cache_statistics(ttl=300)
async def get_user_statistics(db, user_id, start_date=None, end_date=None):
    # Completed tasks from daily_task_summary
    task_query = select(func.coalesce(func.sum(DailyTaskSummary.completed_tasks), 0)).where(
        DailyTaskSummary.user_id == user_id
    )
    if start_date:
        task_query = task_query.where(DailyTaskSummary.task_date >= start_date)
    if end_date:
        task_query = task_query.where(DailyTaskSummary.task_date <= end_date)
    completed_tasks = (await db.execute(task_query)).scalar_one()

    # Check-ins from energy_level_trends
    checkin_query = select(func.coalesce(func.sum(EnergyLevelTrends.check_in_count), 0)).where(
        EnergyLevelTrends.user_id == user_id
    )
    if start_date:
        checkin_query = checkin_query.where(EnergyLevelTrends.check_date >= start_date)
    if end_date:
        checkin_query = checkin_query.where(EnergyLevelTrends.check_date <= end_date)
    check_ins = (await db.execute(checkin_query)).scalar_one()

    # Streak calculation: consecutive days ending today with check_in_count > 0
    streak = 0
    today = date.today()
    # Get all check-in dates with count > 0, sorted descending
    streak_query = select(EnergyLevelTrends.check_date, EnergyLevelTrends.check_in_count).where(
        EnergyLevelTrends.user_id == user_id,
        EnergyLevelTrends.check_in_count > 0
    ).order_by(EnergyLevelTrends.check_date.desc())
    result = await db.execute(streak_query)
    dates = [row[0] for row in result.fetchall()]
    for i in range(len(dates)):
        if (today - timedelta(days=i)) in dates:
            streak += 1
        else:
            break

    return {
        "completed_tasks": completed_tasks,
        "check_ins": check_ins,
        "streak": streak,
        "start_date": start_date,
        "end_date": end_date
    } 