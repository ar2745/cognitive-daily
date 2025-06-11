import redis.asyncio as redis

try:
    from backend.core.config import get_settings
except ImportError:
    from .config import get_settings

settings = get_settings()
REDIS_URL = settings.REDIS_URL

redis_client = redis.from_url(REDIS_URL, decode_responses=True) 