import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient

from backend.core.config import get_settings
from backend.main import app

settings = get_settings()

@pytest.fixture
def client():
    """Fixture for synchronous TestClient."""
    return TestClient(app)

@pytest.fixture
async def async_client():
    """Fixture for asynchronous AsyncClient (integration test style)."""
    async with AsyncClient(base_url="http://localhost:8000") as ac:
        yield ac

def test_health_check_sync(client):
    """Test health check endpoint with synchronous client."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["version"] == settings.VERSION

@pytest.mark.asyncio
async def test_health_check_async(async_client):
    """Test health check endpoint with async client (integration style)."""
    response = await async_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["version"] == settings.VERSION 