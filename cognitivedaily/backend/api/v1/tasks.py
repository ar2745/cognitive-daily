from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

try:
    from backend.core.database import get_db
    from backend.dependencies.auth import get_current_user
    from backend.schemas.task import TaskCreate, TaskResponse, TaskUpdate
    from backend.services.task import TaskService
    from backend.services.user import get_user_by_id
except ImportError:
    from core.database import get_db
    from dependencies.auth import get_current_user
    from schemas.task import TaskCreate, TaskResponse, TaskUpdate
    from services.task import TaskService
    from services.user import get_user_by_id

# from backend.dependencies.auth import get_current_user  # Uncomment if using auth

router = APIRouter(prefix="/tasks", tags=["tasks"])
service = TaskService()

@router.get("/", response_model=List[TaskResponse])
@router.get("", response_model=List[TaskResponse])
async def list_tasks(
    skip: int = 0,
    limit: int = 20,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    user = await get_user_by_id(db, current_user["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    tasks = await service.list_tasks(db, user.id, skip=skip, limit=limit, status=status)
    return tasks

@router.get("/{task_id}", response_model=TaskResponse)
@router.get("/{task_id}/", response_model=TaskResponse)
async def get_task(task_id: UUID, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    task = await service.get_task_by_id(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_in: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    user = await get_user_by_id(db, current_user["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    task = await service.create_task(db, user.id, task_in)
    return task

@router.post("/batch", response_model=List[TaskResponse], status_code=status.HTTP_201_CREATED)
@router.post("/batch/", response_model=List[TaskResponse], status_code=status.HTTP_201_CREATED)
async def batch_create_tasks(
    tasks_in: List[TaskCreate],
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    user = await get_user_by_id(db, current_user["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    created_tasks = []
    for task_in in tasks_in:
        task = await service.create_task(db, user.id, task_in)
        created_tasks.append(task)
    return created_tasks

@router.put("/{task_id}", response_model=TaskResponse)
@router.put("/{task_id}/", response_model=TaskResponse)
async def update_task(task_id: UUID, task_in: TaskUpdate, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    task = await service.update_task(db, task_id, task_in)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
@router.delete("/{task_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: UUID, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    deleted = await service.delete_task(db, task_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Task not found")
    return None 