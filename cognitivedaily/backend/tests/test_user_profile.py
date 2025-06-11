import json
import uuid
from datetime import date, datetime, time, timedelta, timezone

import httpx
import jwt as pyjwt
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import get_settings
from backend.models.checkin import CheckIn, CheckInType
from backend.models.task import Task, TaskPriority, TaskStatus
from backend.models.user import User

try:
    from backend.core.redis import redis_client
    from backend.utils.cache import make_cache_key
except ImportError:
    from core.redis import redis_client
    from utils.cache import make_cache_key

settings = get_settings()
BASE_URL = settings.BASE_URL

@pytest.fixture
async def test_user(test_db: AsyncSession):
    unique_email = f"testuser{uuid.uuid4()}@example.com"
    user = User(
        id=uuid.uuid4(),
        name="Test User",
        email=unique_email,
        preferences={"theme": "dark"},
        default_working_hours=8,
        created_at=datetime.now()
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)
    return user


def mock_auth_header(user):
    token = pyjwt.encode({"sub": str(user.id), "email": user.email}, settings.JWT_SECRET_KEY, algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_user_entered_into_database(test_user, test_db: AsyncSession):
    # Fetch the user from the database by email
    db_user = await test_db.get(User, test_user.id)
    assert db_user is not None, "User was not found in the database."
    assert db_user.email == test_user.email
    assert db_user.name == test_user.name
    assert db_user.preferences == test_user.preferences
    assert db_user.default_working_hours == test_user.default_working_hours
    assert db_user.created_at == test_user.created_at

@pytest.mark.asyncio
async def test_create_my_profile():
    # Generate a unique user ID and email
    user_id = str(uuid.uuid4())
    email = f"testuser{user_id}@example.com"
    token = pyjwt.encode({"sub": user_id, "email": email}, settings.JWT_SECRET_KEY, algorithm="HS256")
    headers = {"Authorization": f"Bearer {token}"}
    # Simulate what Supabase Auth would provide in current_user
    # (You may need to adjust your get_current_user mock/dependency for this test)
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        response = await client.post("/api/v1/users/me", headers=headers)
        assert response.status_code == 201

@pytest.mark.asyncio
async def test_get_my_profile(test_user):
    token_header = mock_auth_header(test_user)
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        response = await client.get("/api/v1/users/me", headers=token_header)
        assert response.status_code == 200


@pytest.mark.asyncio
async def test_update_my_profile(test_user):
    headers = mock_auth_header(test_user)
    update = {
        "name": "Updated Name",
        "preferences": {"theme": "light"},
        "default_working_hours": 6
    }
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        # Update profile
        response = await client.put("/api/v1/users/me", json=update, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"
        assert data["preferences"] == {"theme": "light"}
        assert data["default_working_hours"] == 6
        assert data["email"] == test_user.email
        assert "id" in data
        assert "created_at" in data

        # Fetch profile to verify update
        response = await client.get("/api/v1/users/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"
        assert data["preferences"] == {"theme": "light"}
        assert data["default_working_hours"] == 6

@pytest.mark.asyncio
async def test_update_my_profile_invalid_data(test_user):
    """
    Test updating profile with invalid data (e.g., negative working hours).
    Should return 422 Unprocessable Entity.
    """
    headers = mock_auth_header(test_user)
    update = {
        "name": "Invalid Update",
        "preferences": {"theme": "light"},
        "default_working_hours": -1  # Invalid value
    }
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        response = await client.put("/api/v1/users/me", json=update, headers=headers)
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data

@pytest.mark.asyncio
async def test_get_user_preferences(test_user):
    token_header = mock_auth_header(test_user)
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        response = await client.get("/api/v1/users/preferences", headers=token_header)
        assert response.status_code == 200
        data = response.json()
        assert data["theme"] == "dark"
        assert data["notifications"] is None
        assert data["display_options"] is None 

@pytest.mark.asyncio
async def test_update_user_preferences(test_user):
    token_header = mock_auth_header(test_user)
    preferences = {
        "theme": "light",
        "notifications": True,
        "display_options": {"show_notifications": True}
    }
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        response = await client.put("/api/v1/users/preferences", json=preferences, headers=token_header)
        assert response.status_code == 200
        data = response.json()
        assert data["theme"] == "light"
        assert data["notifications"] is True
        assert data["display_options"] == {"show_notifications": True}

@pytest.fixture
async def user_with_stats(test_db, test_user):
    # Insert 2 completed tasks and 1 pending task
    now = datetime.now()
    preferred_time_value = time(hour=9, minute=0)
    completed_task1 = Task(
        id=uuid.uuid4(),
        user_id=test_user.id,
        title="Task 1",
        status=TaskStatus.completed,
        created_at=now - timedelta(days=2),
        completed_at=now - timedelta(days=2),
        priority=TaskPriority.medium,
        preferred_time=preferred_time_value,
        duration=60
    )
    completed_task2 = Task(
        id=uuid.uuid4(),
        user_id=test_user.id,
        title="Task 2",
        status=TaskStatus.completed,
        created_at=now - timedelta(days=1),
        completed_at=now - timedelta(days=1),
        priority=TaskPriority.medium,
        preferred_time=time(hour=14, minute=30),
        duration=45
    )
    pending_task = Task(
        id=uuid.uuid4(),
        user_id=test_user.id,
        title="Task 3",
        status=TaskStatus.pending,
        created_at=now,
        priority=TaskPriority.low,
        preferred_time=None,
        duration=30
    )
    test_db.add_all([completed_task1, completed_task2, pending_task])

    # Insert check-ins for today and yesterday
    checkin_today = CheckIn(
        id=uuid.uuid4(),
        user_id=test_user.id,
        type=CheckInType.morning,
        energy_level=5,
        notes="",
        created_at=now.replace(hour=6, minute=0, second=0, microsecond=0)
    )
    checkin_yesterday = CheckIn(
        id=uuid.uuid4(),
        user_id=test_user.id,
        type=CheckInType.evening,
        energy_level=7,
        notes="",
        created_at=(now - timedelta(days=1)).replace(hour=19, minute=0, second=0, microsecond=0)
    )
    test_db.add_all([checkin_today, checkin_yesterday])
    await test_db.commit()
    return test_user

@pytest.mark.asyncio
async def test_stats_entered_into_database(user_with_stats, test_db: AsyncSession):
    # Use the actual user ID
    user_id = user_with_stats.id

    # Query tasks for the user
    tasks = (await test_db.execute(
        select(Task).where(Task.user_id == user_id)
    )).scalars().all()
    assert len(tasks) == 3  # 2 completed, 1 pending

    # Query check-ins for the user
    checkins = (await test_db.execute(
        select(CheckIn).where(CheckIn.user_id == user_id)
    )).scalars().all()
    assert len(checkins) == 2

    # Optionally, check the actual values
    completed_tasks = [t for t in tasks if t.status == TaskStatus.completed]
    assert len(completed_tasks) == 2

@pytest.mark.asyncio
async def test_get_user_statistics_with_data(user_with_stats):
    """
    Integration test for GET /api/v1/users/statistics
    - Verifies correct aggregation of completed tasks and check-ins
    - Asserts streak is at least 2 (based on fixture data)
    - Checks all expected fields are present and of correct type
    """
    token_header = mock_auth_header(user_with_stats)
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        response = await client.get("/api/v1/users/statistics", headers=token_header)
        assert response.status_code == 200
        data = response.json()
        # Assert all expected fields are present
        assert "completed_tasks" in data
        assert "check_ins" in data
        assert "streak" in data
        # Assert correct values based on fixture
        assert data["completed_tasks"] == 2
        assert data["check_ins"] == 2
        assert isinstance(data["streak"], int)
        assert data["streak"] >= 2  # Depending on streak logic and test date
        # Optionally check for date range fields if present
        if "start_date" in data:
            assert data["start_date"] is None or isinstance(data["start_date"], str)
        if "end_date" in data:
            assert data["end_date"] is None or isinstance(data["end_date"], str)

@pytest.mark.asyncio
async def test_get_user_statistics_no_data(test_db):
    # Create a user with no tasks or check-ins
    unique_email = f"testuser{uuid.uuid4()}@example.com"
    user = User(
        id=uuid.uuid4(),
        name="No Data User",
        email=unique_email,
        preferences={},
        default_working_hours=8,
        created_at=datetime.now()
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)
    token_header = mock_auth_header(user)
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        response = await client.get("/api/v1/users/statistics", headers=token_header)
        assert response.status_code == 200
        data = response.json()
        assert data["completed_tasks"] == 0
        assert data["check_ins"] == 0
        assert data["streak"] == 0

@pytest.mark.asyncio
async def test_get_user_statistics_with_date_filter(user_with_stats):
    token_header = mock_auth_header(user_with_stats)
    # Use a date range that only includes one completed task and one check-in (yesterday)
    yesterday = (datetime.now() - timedelta(days=1)).date()
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        response = await client.get(
            f"/api/v1/users/statistics?start_date={yesterday}&end_date={yesterday}",
            headers=token_header
        )
        assert response.status_code == 200
        data = response.json()
        # Should only count one completed task and one check-in for yesterday
        assert data["completed_tasks"] == 1
        assert data["check_ins"] == 1
        assert isinstance(data["streak"], int)

@pytest.mark.asyncio
async def test_get_user_statistics_unauthenticated():
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        response = await client.get("/api/v1/users/statistics")
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data

@pytest.mark.asyncio
async def test_user_statistics_redis_caching(user_with_stats):
    """
    Test that the statistics endpoint uses Redis caching by:
    - Clearing the cache key
    - Calling the endpoint twice
    - Verifying the cache is populated and the second call is served from cache
    """
    token_header = mock_auth_header(user_with_stats)
    user_id = str(user_with_stats.id)
    start_date = None
    end_date = None
    cache_key = make_cache_key(user_id, start_date, end_date)

    # Ensure cache is clear
    await redis_client.delete(cache_key)

    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        # First call: should compute and cache
        response1 = await client.get("/api/v1/users/statistics", headers=token_header)
        assert response1.status_code == 200
        data1 = response1.json()
        cached = await redis_client.get(cache_key)
        assert cached is not None, "Cache should be populated after first call"
        cached_data = json.loads(cached)
        assert cached_data == data1

        # Second call: should hit cache (no visible difference, but should be fast and consistent)
        response2 = await client.get("/api/v1/users/statistics", headers=token_header)
        assert response2.status_code == 200
        data2 = response2.json()
        assert data2 == data1, "Second call should return the same data (from cache)"