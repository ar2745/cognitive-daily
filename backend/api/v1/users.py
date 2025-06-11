import os
from datetime import date
from typing import Optional
from uuid import uuid4

import httpx
from fastapi import (APIRouter, Body, Depends, HTTPException, Query, Response,
                     status)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

try:
    from backend.core.config import get_settings
    from backend.core.database import get_db
    from backend.dependencies.auth import get_current_user
    from backend.models import checkin as checkin_model
    from backend.models import daily_plan as daily_plan_model
    from backend.models import task as task_model
    from backend.models import user as user_model
    from backend.schemas.user import (UserPreferences, UserProfileResponse,
                                      UserProfileUpdate, UserStatistics)
    from backend.services.user import (create_user_profile, get_user_by_id,
                                       get_user_statistics,
                                       update_user_profile)
except ImportError:
    from core.config import get_settings
    from core.database import get_db
    from dependencies.auth import get_current_user
    from models import checkin as checkin_model
    from models import daily_plan as daily_plan_model
    from models import task as task_model
    from models import user as user_model
    from schemas.user import (UserPreferences, UserProfileResponse,
                              UserProfileUpdate, UserStatistics)
    from services.user import (create_user_profile, get_user_by_id,
                               get_user_statistics, update_user_profile)

router = APIRouter(prefix="/users", tags=["users"])

settings = get_settings()

@router.post("/bootstrap", response_model=UserProfileResponse, status_code=201)
@router.post("/bootstrap/", response_model=UserProfileResponse, status_code=201)
async def bootstrap_user(
    user_id: str = Body(...),
    email: str = Body(...),
    name: str = Body(""),
    db: AsyncSession = Depends(get_db)
):
    user = await get_user_by_id(db, user_id)
    if user:
        raise HTTPException(status_code=400, detail="User already exists")
    # Create new user
    new_user = await create_user_profile(db, {"user_id": user_id, "email": email, "name": name})
    return UserProfileResponse(
        id=str(new_user.id),
        email=new_user.email,
        name=new_user.name,
        preferences=new_user.preferences,
        created_at=new_user.created_at,
        default_working_hours=new_user.default_working_hours,
        timezone=new_user.timezone
    )

# @router.post("/me", response_model=UserProfileResponse, status_code=201)
# async def create_my_profile(
#     db: AsyncSession = Depends(get_db),
#     current_user=Depends(get_current_user)
# ):
#     # Check if user already exists
#     user = await get_user_by_id(db, current_user["user_id"])
#     if user:
#         raise HTTPException(status_code=400, detail="User already exists")
#     # Create new user
#     new_user = await create_user_profile(db, current_user)
#     return UserProfileResponse(
#         id=str(new_user.id),
#         email=new_user.email,
#         name=new_user.name,
#         preferences=new_user.preferences,
#         created_at=new_user.created_at,
#         default_working_hours=new_user.default_working_hours
#     )

@router.get("/me", response_model=UserProfileResponse)
@router.get("/me/", response_model=UserProfileResponse)
async def get_my_profile(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    user = await get_user_by_id(db, current_user["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserProfileResponse(
        id=str(user.id),
        email=user.email,
        name=user.name,
        preferences=user.preferences,
        created_at=user.created_at,
        default_working_hours=user.default_working_hours,
        timezone=user.timezone
    )

# @router.get("/me", response_model=UserProfileResponse)
# async def get_my_profile(
#     db: Session = Depends(get_db),
#     user_id: str = Query(...)
# ):
#     user = await get_user_by_id(db, user_id)
#     if not user:
#         raise HTTPException(status_code=404, detail="User not found")
#     return UserProfileResponse(
#         id=str(user.id),
#         email=user.email,
#         name=user.name,
#         preferences=user.preferences,
#         created_at=user.created_at,
#         default_working_hours=user.default_working_hours
#     )

@router.put("/me", response_model=UserProfileResponse)
@router.put("/me/", response_model=UserProfileResponse)
async def update_my_profile(
    update: UserProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    user = await update_user_profile(db, current_user["user_id"], update)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserProfileResponse(
        id=str(user.id),
        email=user.email,
        name=user.name,
        preferences=user.preferences,
        created_at=user.created_at,
        default_working_hours=user.default_working_hours,
        timezone=user.timezone
    )

@router.get("/preferences", response_model=UserPreferences)
@router.get("/preferences/", response_model=UserPreferences)
async def get_user_preferences(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    user = await get_user_by_id(db, current_user["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # Always return a valid UserPreferences model
    return UserPreferences.parse_obj(user.preferences or {})

@router.put("/preferences", response_model=UserPreferences)
@router.put("/preferences/", response_model=UserPreferences)
async def update_user_preferences(
    preferences: UserPreferences = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    user = await get_user_by_id(db, current_user["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.preferences = preferences.dict(exclude_unset=True)
    await db.commit()
    await db.refresh(user)
    return UserPreferences.parse_obj(user.preferences)

@router.get("/statistics", response_model=UserStatistics)
@router.get("/statistics/", response_model=UserStatistics)
async def get_user_statistics_endpoint(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    stats = await get_user_statistics(db, current_user["user_id"], start_date, end_date)
    return UserStatistics(**stats)

@router.delete("/me", status_code=204)
@router.delete("/me/", status_code=204)
async def delete_my_account(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Delete the current user's account from Supabase Auth and the database (cascade).
    TODO: Test thoroughly in staging before production use!
    """
    user_id = current_user["user_id"]
    user_email = current_user.get("email")
    # 1. Delete from Supabase Auth (Admin API)
    SUPABASE_SERVICE_ROLE_KEY = settings.SUPABASE_SERVICE_ROLE_KEY
    SUPABASE_PROJECT_ID = settings.SUPABASE_PROJECT_ID
    if not SUPABASE_SERVICE_ROLE_KEY or not SUPABASE_PROJECT_ID:
        raise HTTPException(status_code=500, detail="Supabase admin credentials not configured")
    supabase_url = f"https://{SUPABASE_PROJECT_ID}.supabase.co/auth/v1/admin/users/{user_id}"
    async with httpx.AsyncClient() as client:
        resp = await client.delete(
            supabase_url,
            headers={
                "apikey": SUPABASE_SERVICE_ROLE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"
            },
            timeout=10.0
        )
        if resp.status_code not in (200, 204):
            raise HTTPException(status_code=500, detail=f"Failed to delete user from Supabase Auth: {resp.text}")
    # 2. Cascade delete from DB in a transaction
    try:
        async with db.begin():
            # Delete tasks
            await db.execute(task_model.Task.__table__.delete().where(task_model.Task.user_id == user_id))
            # Delete daily plans
            await db.execute(daily_plan_model.DailyPlan.__table__.delete().where(daily_plan_model.DailyPlan.user_id == user_id))
            # Delete checkins
            await db.execute(checkin_model.CheckIn.__table__.delete().where(checkin_model.CheckIn.user_id == user_id))
            # Delete user
            await db.execute(user_model.User.__table__.delete().where(user_model.User.id == user_id))
        await db.commit()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete user data: {str(e)}")
    return Response(status_code=204) 