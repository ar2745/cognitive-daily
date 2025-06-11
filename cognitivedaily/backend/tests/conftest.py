import asyncio
import os
import sys
import uuid
from datetime import datetime

import jwt as pyjwt

if sys.platform.startswith("win"):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from typing import AsyncGenerator, Generator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from backend.core.config import get_settings
from backend.core.database import Base, create_engine_and_sessionmaker, get_db
from backend.models.user import User

from ..main import app

settings = get_settings()
TEST_DB_URL = settings.DATABASE_URL

@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create a new event loop for the test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
def engine(event_loop):
    engine, _ = create_engine_and_sessionmaker(
        database_url=TEST_DB_URL,
        echo=True,  # or False
    )
    yield engine
    # Cleanup handled elsewhere

@pytest.fixture(scope="session")
def TestingSessionLocal(engine):
    # Use the engine from the fixture
    _, SessionLocal = create_engine_and_sessionmaker(
        database_url=TEST_DB_URL,
        echo=True,
    )
    return SessionLocal

@pytest.fixture(scope="session")
async def test_app(engine) -> AsyncGenerator:
    """Create a test instance of the FastAPI application (async)."""
    # Create test database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield app
    # Clean up test database
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture(scope="function")
async def test_db(TestingSessionLocal):
    async with TestingSessionLocal() as session:
        yield session
        await session.rollback()

@pytest.fixture(scope="function")
async def async_client(test_app, test_db):
    async def _get_test_db():
        yield test_db
    test_app.dependency_overrides[get_db] = _get_test_db

    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    test_app.dependency_overrides.clear()

@pytest.fixture(scope="session")
def test_password() -> str:
    """Return a test password for user creation."""
    return "testpassword123!"

@pytest.fixture(scope="session")
def test_user_data() -> dict:
    """Return test user data for authentication tests."""
    return {
        "email": "test@example.com",
        "password": "testpassword123!",
        "is_active": True,
    }

@pytest.fixture(scope="session")
def test_superuser_data() -> dict:
    """Return test superuser data for admin tests."""
    return {
        "email": "admin@example.com",
        "password": "adminpassword123!",
        "is_superuser": True,
        "is_active": True,
    }