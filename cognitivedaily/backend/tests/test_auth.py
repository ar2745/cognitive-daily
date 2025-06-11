from datetime import datetime, timedelta

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from jose import jwt

from backend.core.config import get_settings
from backend.dependencies.auth import get_current_user

settings = get_settings()

app = FastAPI()

@app.get("/protected")
def protected_route(current_user: dict = Depends(get_current_user)):
    return {"user_id": current_user["user_id"], "email": current_user["email"]}

def create_token(sub: str, email: str, expires_delta=None):
    to_encode = {"sub": sub, "email": email}
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
        to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def test_valid_token():
    client = TestClient(app)
    token = create_token("testuser", "test@example.com", expires_delta=timedelta(minutes=5))
    response = client.get("/protected", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["user_id"] == "testuser"
    assert response.json()["email"] == "test@example.com"

def test_expired_token():
    client = TestClient(app)
    token = create_token("testuser", "test@example.com", expires_delta=timedelta(seconds=-1))
    response = client.get("/protected", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
    assert "Invalid or expired token" in response.text

def test_invalid_token():
    client = TestClient(app)
    token = "invalid.token.value"
    response = client.get("/protected", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
    assert "Invalid or expired token" in response.text

def test_missing_token():
    client = TestClient(app)
    response = client.get("/protected")
    assert response.status_code == 401 