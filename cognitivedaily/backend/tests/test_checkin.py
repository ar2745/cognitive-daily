import uuid
from datetime import date, datetime, timedelta

import httpx
import jwt as pyjwt
import pytest

from backend.core.config import get_settings
from backend.models.checkin import CheckIn, CheckInType
from backend.models.user import User

settings = get_settings()
BASE_URL = settings.BASE_URL

@pytest.fixture
async def test_user(test_db):
    unique_email = f"testuser{uuid.uuid4()}@example.com"
    user = User(
        id=uuid.uuid4(),
        name="Test User3",
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
async def test_create_checkin_api(test_user):
    payload = {
        "type": "night",
        "energy_level": 8,
        "notes": "Felt good"
    }
    headers = mock_auth_header(test_user)
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        response = await client.post("/api/v1/check-ins/", json=payload, headers=headers)
        assert response.status_code == 201
        data = response.json()
        assert data["type"] == payload["type"]
        assert data["energy_level"] == payload["energy_level"]
        assert data["notes"] == payload["notes"]
        assert "id" in data
        assert "check_in_date" in data
        assert "created_at" in data

@pytest.mark.asyncio
async def test_get_todays_checkins_api(test_user):
    headers = mock_auth_header(test_user)
    payload = {
        "type": "night",
        "energy_level": 6,
        "notes": "A bit tired"
    }
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        await client.post("/api/v1/check-ins/", json=payload, headers=headers)
        response = await client.get("/api/v1/check-ins/today", headers=headers)
        assert response.status_code == 200
        checkins = response.json()
        assert isinstance(checkins, list)
        assert any(c["type"] == "night" for c in checkins)
        assert all("check_in_date" in c for c in checkins)

@pytest.mark.asyncio
async def test_get_checkin_history_api(test_user):
    headers = mock_auth_header(test_user)
    payload_today = {
        "type": "night",
        "energy_level": 7,
        "notes": "Am sleepy"
    }
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        await client.post("/api/v1/check-ins/", json=payload_today, headers=headers)
        response = await client.get("/api/v1/check-ins/history?page=1&page_size=10", headers=headers)
        assert response.status_code == 200
        history = response.json()
        assert isinstance(history, list)
        assert any("check_in_date" in c for c in history)

@pytest.mark.asyncio
async def test_checkin_not_found(test_user):
    headers = mock_auth_header(test_user)
    random_id = str(uuid.uuid4())
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        response = await client.get(f"/api/v1/check-ins/{random_id}", headers=headers)
        assert response.status_code == 404
        response = await client.put(f"/api/v1/check-ins/{random_id}", json={"energy_level": 5}, headers=headers)
        assert response.status_code == 404
        response = await client.delete(f"/api/v1/check-ins/{random_id}", headers=headers)
        assert response.status_code == 404

@pytest.mark.asyncio
async def test_create_checkin_invalid_data(test_user):
    headers = mock_auth_header(test_user)
    payload = {
        "type": "invalid_type",
        "energy_level": 15,  # Out of range
        "notes": "Invalid"
    }
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        response = await client.post("/api/v1/check-ins/", json=payload, headers=headers)
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data 