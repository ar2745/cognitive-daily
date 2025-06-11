import os
import uuid
from datetime import date, datetime
from uuid import uuid4

import jwt as pyjwt
import pytest
from httpx import AsyncClient

from backend.core.config import get_settings
from backend.models.user import User
from backend.tests.test_task import mock_auth_header

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
async def test_create_daily_plan_api(test_user):
    payload = {
        "plan_date": str(date.today()),
        "energy_level": 7,
        "available_hours": 8.0,
        "schedule": {"08:00": "Emails", "09:00": "Deep Work"},
        "notes": "I need to finish the project report today."
    }
    headers = mock_auth_header(test_user)
    async with AsyncClient(base_url=BASE_URL) as client:
        response = await client.post("/api/v1/daily-plans/", json=payload, headers=headers)
        assert response.status_code == 201
        data = response.json()
        assert data["plan_date"] == payload["plan_date"]
        assert data["energy_level"] == payload["energy_level"]
        assert data["schedule"]["08:00"] == "Emails"
        assert data["notes"] == "I need to finish the project report today."

@pytest.mark.asyncio
@pytest.mark.skipif(not settings.OPENAI_API_KEY, reason="No OpenAI API key set")
async def test_ai_generate_daily_plan_api(test_user):
    payload = {
        "plan_date": str(date.today()),
        "energy_level": 6,
        "available_hours": 7.5,
        "goals": ["Finish project report", "Exercise"],
        "preferences": {"breaks": "every 2 hours", "scenario": "work"},
        "history": {"yesterday": {"energy_level": 5, "schedule": {"08:00": "Emails"}}}
    }
    headers = mock_auth_header(test_user)
    async with AsyncClient(base_url=BASE_URL, timeout=50.0) as client:
        response = await client.post("/api/v1/daily-plans/ai-generate", json=payload, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["schedule"], dict)

@pytest.mark.asyncio
@pytest.mark.skipif(not settings.OPENAI_API_KEY, reason="No OpenAI API key set")
async def test_ai_analyze_tasks_api(test_user):
    payload = {
        "plan_date": str(date.today()),
        "energy_level": 6,
        "available_hours": 7.0,
        "preferences": {"focus": "work"},
        "tasks": ["Write report", "Team meeting", "Code review"]
    }
    headers = mock_auth_header(test_user)
    async with AsyncClient(base_url=BASE_URL, timeout=50.0) as client:
        response = await client.post("/api/v1/daily-plans/ai-analyze-tasks", json=payload, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "optimized_tasks" in data
        assert isinstance(data["optimized_tasks"], list)
        assert "suggestions" in data
        assert isinstance(data["suggestions"], list)
        for task in data["optimized_tasks"]:
            try:
                assert (
                    task["time_allocation"] is None or isinstance(task["time_allocation"], int)
                ), f"time_allocation should be int or None, got {task['time_allocation']}"
            except AssertionError as e:
                print("Full optimized_tasks:", data["optimized_tasks"])
                raise