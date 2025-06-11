from datetime import date, datetime
from datetime import time as dt_time
from datetime import timedelta
from typing import List, Optional
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

try:
    from backend.models.daily_plan import DailyPlan
    from backend.models.task import Task
    from backend.schemas.daily_plan import DailyPlanCreate, DailyPlanUpdate
    from backend.schemas.task import TaskUpdate
    from backend.services.task import TaskService
    from backend.services.user import get_user_by_id
    from backend.utils.cache import store_recent_daily_plan
except ImportError:
    from models.daily_plan import DailyPlan
    from models.task import Task
    from schemas.daily_plan import DailyPlanCreate, DailyPlanUpdate
    from schemas.task import TaskUpdate
    from services.task import TaskService
    from services.user import get_user_by_id
    from utils.cache import store_recent_daily_plan

class DailyPlanService:
    """
    Service layer for DailyPlan business logic, using direct SQLAlchemy queries.
    Mirrors the style of TaskService.
    """
    async def create_daily_plan(self, db: AsyncSession, user_id: UUID, plan_in: DailyPlanCreate) -> DailyPlan:
        # Fetch all incomplete tasks for the user
        task_service = TaskService()
        tasks = await task_service.list_tasks(db, user_id, status=None)
        incomplete_tasks = [
            task for task in tasks
            if getattr(task, 'status', None) not in (
                "completed", "COMPLETED",
                "cancelled", "CANCELLED",
                "missed", "MISSED"
            )
        ]

        # Build the schedule: group by preferred_time, store rich task info
        schedule = {}
        for task in incomplete_tasks:
            if task.preferred_time:
                # Format as 'HH:MM'
                if isinstance(task.preferred_time, str):
                    slot = task.preferred_time[:5]
                else:
                    slot = task.preferred_time.strftime("%H:%M")
            else:
                slot = "unscheduled"
            schedule.setdefault(slot, []).append(task.title)

        plan = DailyPlan(
            user_id=user_id,
            plan_date=plan_in.plan_date,
            energy_level=plan_in.energy_level,
            available_hours=plan_in.available_hours,
            schedule=schedule,
            created_at=datetime.utcnow(),
            notes=plan_in.notes
        )
        db.add(plan)
        await db.commit()
        await db.refresh(plan)
        # Store a summary in cache for recent plans
        plan_summary = {
            "plan_date": str(plan.plan_date),
            "energy_level": plan.energy_level,
            "available_hours": plan.available_hours,
            "schedule": plan.schedule,
            "created_at": plan.created_at.isoformat(),
            "notes": plan.notes
        }
        await store_recent_daily_plan(str(user_id), plan_summary)
        return plan

    async def get_daily_plan_by_id(self, db: AsyncSession, plan_id: UUID) -> Optional[DailyPlan]:
        result = await db.execute(select(DailyPlan).where(DailyPlan.id == plan_id))
        plan = result.scalars().first()
        if plan:
            await self.mark_missed_tasks(db, [plan])
        return plan

    async def list_daily_plans(self, db: AsyncSession, user_id: UUID, plan_date: Optional[date] = None, skip: int = 0, limit: int = 20) -> List[DailyPlan]:
        query = select(DailyPlan).where(DailyPlan.user_id == user_id)
        if plan_date:
            query = query.where(DailyPlan.plan_date == plan_date)
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        plans = result.scalars().all()
        await self.mark_missed_tasks(db, plans)
        return plans

    async def update_daily_plan(self, db: AsyncSession, plan_id: UUID, update_in: DailyPlanUpdate) -> Optional[DailyPlan]:
        result = await db.execute(select(DailyPlan).where(DailyPlan.id == plan_id))
        plan = result.scalars().first()
        if not plan:
            return None
        update_data = update_in.dict(exclude_unset=True)
        # If schedule is not provided, regenerate it from incomplete tasks
        if "schedule" not in update_data:
            task_service = TaskService()
            tasks = await task_service.list_tasks(db, plan.user_id, status="pending")
            incomplete_tasks = tasks
            schedule = {}
            for task in incomplete_tasks:
                if task.preferred_time:
                    # Format as 'HH:MM'
                    if isinstance(task.preferred_time, str):
                        slot = task.preferred_time[:5]
                    else:
                        slot = task.preferred_time.strftime("%H:%M")
                else:
                    slot = "unscheduled"
                schedule.setdefault(slot, []).append(task.title)
            update_data["schedule"] = schedule
        for field, value in update_data.items():
            setattr(plan, field, value)
        await db.commit()
        await db.refresh(plan)
        # Store a summary in cache for recent plans (after update)
        plan_summary = {
            "plan_date": str(plan.plan_date),
            "energy_level": plan.energy_level,
            "available_hours": plan.available_hours,
            "schedule": plan.schedule,
            "created_at": plan.created_at.isoformat(),
            "notes": plan.notes
        }
        await store_recent_daily_plan(str(plan.user_id), plan_summary)
        return plan

    async def delete_daily_plan(self, db: AsyncSession, plan_id: UUID) -> bool:
        result = await db.execute(select(DailyPlan).where(DailyPlan.id == plan_id))
        plan = result.scalars().first()
        if not plan:
            return False
        await db.delete(plan)
        await db.commit()
        return True

    async def mark_missed_tasks(self, db: AsyncSession, plans: List[DailyPlan]):
        """
        For each plan for today, mark tasks as 'missed' if their scheduled end time (preferred_time + duration) is in the past and not completed/cancelled.
        Uses the user's timezone for all time-based checks.
        """
        task_service = TaskService()
        for plan in plans:
            # Fetch the user to get their timezone
            user = await get_user_by_id(db, str(plan.user_id))
            user_tz = getattr(user, 'timezone', 'UTC') or 'UTC'
            try:
                user_now = datetime.now(ZoneInfo(user_tz))
                user_today = user_now.date()
            except Exception:
                user_now = datetime.utcnow()
                user_today = user_now.date()
            if plan.plan_date != user_today:
                continue
            schedule = plan.schedule or {}
            for slot, task_titles in schedule.items():
                # slot is 'HH:MM' or 'unscheduled'
                if slot == "unscheduled":
                    continue
                try:
                    slot_time = dt_time.fromisoformat(slot)
                except Exception:
                    continue
                # For each task title in this slot
                titles = task_titles if isinstance(task_titles, list) else [task_titles]
                for title in titles:
                    # Find the task by title, preferred_time, and user
                    tasks = await task_service.list_tasks(db, plan.user_id, status=None)
                    for task in tasks:
                        if (
                            task.title == title
                            and getattr(task, "preferred_time", None) and task.preferred_time.strftime("%H:%M") == slot
                            and task.status not in ("completed", "cancelled", "missed")
                        ):
                            # Calculate end time in user's timezone
                            start_dt = datetime.combine(user_today, slot_time).replace(tzinfo=ZoneInfo(user_tz))
                            end_dt = start_dt + timedelta(minutes=task.duration or 0)
                            if user_now > end_dt:
                                await task_service.update_task(db, task.id, TaskUpdate(status="missed")) 