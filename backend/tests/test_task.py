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
async def test_user(test_db):
    unique_email = f"testuser{uuid.uuid4()}@example.com"
    user = User(
        id=uuid.uuid4(),
        name="Test User2",
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
    token = pyjwt.encode(
        {"sub": str(user.id), "email": user.email},
        settings.JWT_SECRET_KEY,
        algorithm="HS256"
    )
    return {"Authorization": f"Bearer {token}"} 

@pytest.mark.asyncio
async def test_create_and_get_task_api(test_user):
    payload = {
        "title": "API Test Task",
        "duration": 45,
        "priority": "medium",
        "tags": ["api", "test"],
        "preferred_time": "10:00:00",
        "status": "pending"
    }
    headers = mock_auth_header(test_user)
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        response = await client.post("/api/v1/tasks/", json=payload, headers=headers)
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == payload["title"]
        task_id = data["id"]
        # Get
        get_response = await client.get(f"/api/v1/tasks/{task_id}", headers=headers)
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["id"] == task_id
        assert get_data["title"] == payload["title"]

@pytest.mark.asyncio
async def test_update_task_api(test_user):
    payload = {
        "title": "Update API Task",
        "duration": 30,
        "priority": "low",
        "tags": ["update"],
        "preferred_time": None,
        "status": "pending"
    }
    headers = mock_auth_header(test_user)
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        response = await client.post("/api/v1/tasks/", json=payload, headers=headers)
        assert response.status_code == 201
        data = response.json()
        task_id = data["id"]
        # Update
        update_payload = {"title": "Updated via API", "duration": 60, "status": "in_progress"}
        update_response = await client.put(f"/api/v1/tasks/{task_id}", json=update_payload, headers=headers)
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["title"] == "Updated via API"
        assert updated["duration"] == 60
        assert updated["status"] == "in_progress"

@pytest.mark.asyncio
async def test_delete_task_api(test_user):
    payload = {
        "title": "Delete API Task",
        "duration": 15,
        "priority": "high",
        "tags": [],
        "preferred_time": None,
        "status": "pending"
    }
    headers = mock_auth_header(test_user)
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        response = await client.post("/api/v1/tasks/", json=payload, headers=headers)
        assert response.status_code == 201
        data = response.json()
        task_id = data["id"]
        # Delete
        delete_response = await client.delete(f"/api/v1/tasks/{task_id}", headers=headers)
        assert delete_response.status_code == 204
        # Should not be found after delete
        get_response = await client.get(f"/api/v1/tasks/{task_id}", headers=headers)
        assert get_response.status_code == 404

@pytest.mark.asyncio
async def test_list_tasks_api(test_user):
    headers = mock_auth_header(test_user)
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        for i in range(3):
            await client.post("/api/v1/tasks/", json={
                "title": f"Task {i}",
                "duration": 10 + i,
                "priority": "low",
                "tags": ["batch"],
                "preferred_time": None,
                "status": "pending"
            }, headers=headers)
        list_response = await client.get("/api/v1/tasks/?skip=0&limit=10", headers=headers)
        assert list_response.status_code == 200
        tasks = list_response.json()
        assert isinstance(tasks, list)
        titles = [t["title"] for t in tasks]
        assert any("Task 0" in t for t in titles)
        assert any("Task 1" in t for t in titles)
        assert any("Task 2" in t for t in titles)

@pytest.mark.asyncio
async def test_complete_task_sets_completed_at(test_user):
    """
    Test that updating a task's status to 'completed' sets the completed_at timestamp.
    """
    payload = {
        "title": "Complete Me",
        "duration": 20,
        "priority": "medium",
        "tags": ["complete"],
        "preferred_time": None,
        "status": "pending"
    }
    headers = mock_auth_header(test_user)
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        # Create the task
        response = await client.post("/api/v1/tasks/", json=payload, headers=headers)
        assert response.status_code == 201
        data = response.json()
        task_id = data["id"]
        # Update status to completed
        update_payload = {"status": "completed"}
        update_response = await client.put(f"/api/v1/tasks/{task_id}", json=update_payload, headers=headers)
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["status"] == "completed"
        # completed_at should be set (not None)
        assert updated["completed_at"] is not None 