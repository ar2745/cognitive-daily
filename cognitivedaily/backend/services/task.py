from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import delete as sa_delete
from sqlalchemy import select
from sqlalchemy import update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession

try:
    from backend.models.task import Task
    from backend.schemas.task import TaskCreate, TaskUpdate
except ImportError:
    from models.task import Task
    from schemas.task import TaskCreate, TaskUpdate

class TaskService:
    """
    Service layer for Task business logic, using direct SQLAlchemy queries.
    Mirrors the style of services/user.py.
    """
    async def create_task(self, db: AsyncSession, user_id: UUID, task_in: TaskCreate) -> Task:
        task = Task(
            user_id=user_id,
            title=task_in.title,
            duration=task_in.duration,
            priority=task_in.priority,
            tags=task_in.tags,
            preferred_time=task_in.preferred_time,
            status=task_in.status,
            created_at=datetime.utcnow(),
            completed_at=None
        )
        db.add(task)
        await db.commit()
        await db.refresh(task)
        return task

    async def get_task_by_id(self, db: AsyncSession, task_id: UUID) -> Optional[Task]:
        result = await db.execute(select(Task).where(Task.id == task_id))
        return result.scalars().first()

    async def list_tasks(self, db: AsyncSession, user_id: UUID, skip: int = 0, limit: int = 20, status: Optional[str] = None) -> List[Task]:
        query = select(Task).where(Task.user_id == user_id)
        if status:
            query = query.where(Task.status == status)
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()

    async def update_task(self, db: AsyncSession, task_id: UUID, update_in: TaskUpdate) -> Optional[Task]:
        result = await db.execute(select(Task).where(Task.id == task_id))
        task = result.scalars().first()
        if not task:
            return None
        for field, value in update_in.dict(exclude_unset=True).items():
            setattr(task, field, value)
        await db.commit()
        await db.refresh(task)
        return task

    async def delete_task(self, db: AsyncSession, task_id: UUID) -> bool:
        result = await db.execute(select(Task).where(Task.id == task_id))
        task = result.scalars().first()
        if not task:
            return False
        await db.delete(task)
        await db.commit()
        return True 