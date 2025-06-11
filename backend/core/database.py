from typing import AsyncGenerator, Optional

from sqlalchemy.ext.asyncio import (AsyncEngine, AsyncSession,
                                    create_async_engine)
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import NullPool

from .config import get_settings

settings = get_settings()

class Base(DeclarativeBase):
    pass

def create_engine_and_sessionmaker(
    database_url: Optional[str] = None,
    echo: Optional[bool] = None,
) -> tuple[AsyncEngine, sessionmaker]:
    """
    Factory to create a new async engine and sessionmaker.
    """
    url = database_url or settings.DATABASE_URL
    engine = create_async_engine(
        url,
        echo=echo if echo is not None else settings.DEBUG,
        poolclass=NullPool,
        connect_args={"statement_cache_size": 0},
    )
    SessionLocal = sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )
    return engine, SessionLocal

# Default engine/sessionmaker for production app (created at startup, not import time)
engine: Optional[AsyncEngine] = None
AsyncSessionLocal: Optional[sessionmaker] = None

def init_engine_and_sessionmaker():
    global engine, AsyncSessionLocal
    engine, AsyncSessionLocal = create_engine_and_sessionmaker()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency to get a DB session using the global sessionmaker.
    """
    if AsyncSessionLocal is None:
        raise RuntimeError("AsyncSessionLocal is not initialized. Call init_engine_and_sessionmaker() at app startup.")
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

# Utility for app startup/shutdown
async def init_db():
    if engine is None:
        raise RuntimeError("Engine is not initialized. Call init_engine_and_sessionmaker() at app startup.")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def close_db():
    if engine is not None:
        await engine.dispose() 