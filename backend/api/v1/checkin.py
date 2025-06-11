from datetime import date
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

try:    
    from backend.core.database import get_db
    from backend.dependencies.auth import get_current_user
    from backend.schemas.checkin import (CheckInCreate, CheckInResponse,
                                         CheckInUpdate)
    from backend.services.checkin import CheckInService
except ImportError:
    from core.database import get_db
    from dependencies.auth import get_current_user
    from schemas.checkin import CheckInCreate, CheckInResponse, CheckInUpdate
    from services.checkin import CheckInService

router = APIRouter(prefix="/check-ins", tags=["Check-ins"])
service = CheckInService()

@router.post("/", response_model=CheckInResponse, status_code=status.HTTP_201_CREATED)
@router.post("", response_model=CheckInResponse, status_code=status.HTTP_201_CREATED)
async def create_check_in(
    checkin_in: CheckInCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    checkin = await service.create_check_in(db, user_id=current_user["user_id"], checkin_in=checkin_in)
    return checkin

@router.get("/today", response_model=List[CheckInResponse])
@router.get("/today/", response_model=List[CheckInResponse])
async def get_todays_check_ins(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    today: Optional[date] = None
):
    checkins = await service.get_todays_check_ins(db, user_id=current_user["user_id"], today=today)
    return checkins

@router.get("/history", response_model=List[CheckInResponse])
@router.get("/history/", response_model=List[CheckInResponse])
async def get_check_in_history(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    page: int = 1,
    page_size: int = 20,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
):
    checkins = await service.get_check_in_history(
        db,
        user_id=current_user["user_id"],
        page=page,
        page_size=page_size,
        start_date=start_date,
        end_date=end_date
    )
    return checkins

@router.get("/{checkin_id}", response_model=CheckInResponse)
@router.get("/{checkin_id}/", response_model=CheckInResponse)
async def get_check_in_by_id(
    checkin_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    checkin = await service.get_check_in_by_id(db, checkin_id)
    if not checkin or checkin.user_id != current_user["user_id"]:
        raise HTTPException(status_code=404, detail="Check-in not found")
    return checkin

@router.put("/{checkin_id}", response_model=CheckInResponse)
@router.put("/{checkin_id}/", response_model=CheckInResponse)
async def update_check_in(
    checkin_id: UUID,
    update_in: CheckInUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    checkin = await service.get_check_in_by_id(db, checkin_id)
    if not checkin or checkin.user_id != current_user["user_id"]:
        raise HTTPException(status_code=404, detail="Check-in not found")
    updated = await service.update_check_in(db, checkin_id, update_in)
    return updated

@router.delete("/{checkin_id}", status_code=status.HTTP_204_NO_CONTENT)
@router.delete("/{checkin_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_check_in(
    checkin_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    checkin = await service.get_check_in_by_id(db, checkin_id)
    if not checkin or checkin.user_id != current_user["user_id"]:
        raise HTTPException(status_code=404, detail="Check-in not found")
    await service.delete_check_in(db, checkin_id)
    return None 