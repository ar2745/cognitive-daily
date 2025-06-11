import logging

import redis.asyncio as redis2
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi_limiter import FastAPILimiter

try:
    from backend.core.config import get_settings
    from backend.core.database import (close_db, init_db,
                                       init_engine_and_sessionmaker)
    from backend.core.logging import JSONLogMiddleware, setup_logging
    from backend.core.monitoring import setup_monitoring
except ImportError:
    from core.config import get_settings
    from core.database import close_db, init_db, init_engine_and_sessionmaker
    from core.logging import JSONLogMiddleware, setup_logging
    from core.monitoring import setup_monitoring

settings = get_settings()

# Initialize logging
setup_logging()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    handlers=[
        logging.FileHandler("logs/FastAPI.log"),
    ]
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    redoc_url=f"{settings.API_V1_PREFIX}/redoc",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
)

# Set up monitoring
setup_monitoring(app)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"] + settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"] if settings.DEBUG else [settings.HOST],
)

app.add_middleware(JSONLogMiddleware)

@app.on_event("startup")
async def on_startup():
    init_engine_and_sessionmaker()
    await init_db()
    redis = await redis2.from_url("redis://default:rzxnPIqjrCwLwSvMWFazBbThzjmPsBYo@ballast.proxy.rlwy.net:51108", encoding="utf8", decode_responses=True)
    await FastAPILimiter.init(redis)

@app.on_event("shutdown")
async def on_shutdown():
    await close_db()

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": settings.VERSION}

# Include API routers here
try:
    from backend.api.v1.checkin import router as checkin_router
    from backend.api.v1.daily_plan import router as daily_plan_router
    from backend.api.v1.tasks import router as tasks_router
    from backend.api.v1.users import router as users_router
except ImportError:
    from api.v1.checkin import router as checkin_router
    from api.v1.daily_plan import router as daily_plan_router
    from api.v1.tasks import router as tasks_router
    from api.v1.users import router as users_router

app.include_router(users_router, prefix=settings.API_V1_PREFIX) 
app.include_router(tasks_router, prefix=settings.API_V1_PREFIX)
app.include_router(checkin_router, prefix=settings.API_V1_PREFIX)
app.include_router(daily_plan_router, prefix=settings.API_V1_PREFIX)