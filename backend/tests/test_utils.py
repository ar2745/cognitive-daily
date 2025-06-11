from typing import Dict, Optional

from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import get_settings

settings = get_settings()

async def create_test_user(
    client: TestClient,
    user_data: Dict,
    db: Optional[AsyncSession] = None
) -> Dict:
    """Create a test user and return the response data."""
    response = client.post(
        f"{settings.API_V1_PREFIX}/auth/register",
        json=user_data
    )
    assert response.status_code == 201
    return response.json()

async def get_test_token(
    client: TestClient,
    email: str,
    password: str
) -> str:
    """Get an authentication token for test user."""
    response = client.post(
        f"{settings.API_V1_PREFIX}/auth/login",
        data={"username": email, "password": password}
    )
    assert response.status_code == 200
    return response.json()["access_token"]

def get_auth_headers(token: str) -> Dict[str, str]:
    """Return authorization headers with JWT token."""
    return {"Authorization": f"Bearer {token}"}

async def create_test_item(
    client: TestClient,
    token: str,
    item_data: Dict
) -> Dict:
    """Create a test item and return the response data."""
    response = client.post(
        f"{settings.API_V1_PREFIX}/items/",
        headers=get_auth_headers(token),
        json=item_data
    )
    assert response.status_code == 201
    return response.json()

def assert_response_fields(response_data: Dict, expected_fields: list):
    """Assert that response data contains all expected fields."""
    for field in expected_fields:
        assert field in response_data, f"Field '{field}' missing from response" 