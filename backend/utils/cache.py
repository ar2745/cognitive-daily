import datetime
import decimal
import functools
import json
from typing import Any, Callable

try:
    from backend.core.redis import redis_client
except ImportError:
    from core.redis import redis_client


def make_cache_key(user_id: str, start_date: Any, end_date: Any) -> str:
    return f"user_stats:{user_id}:{start_date or 'none'}:{end_date or 'none'}"

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, decimal.Decimal):
            return float(obj)
        if isinstance(obj, (datetime.datetime, datetime.date)):
            return obj.isoformat()
        return super().default(obj)

def cache_statistics(ttl: int = 300):
    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(db, user_id, start_date, end_date):
            key = make_cache_key(user_id, start_date, end_date)
            cached = await redis_client.get(key)
            if cached:
                return json.loads(cached)
            result = await func(db, user_id, start_date, end_date)
            await redis_client.set(key, json.dumps(result, cls=DecimalEncoder), ex=ttl)
            return result
        return wrapper
    return decorator 

async def get_recent_daily_plans(user_id: str, limit: int = 2):
    """
    Fetch the N most recent daily plans for a user from Redis.
    Returns a list of plan dicts (most recent first).
    """
    key = f"recent_daily_plans:{user_id}:{limit}"
    plans_json = await redis_client.lrange(key, 0, limit - 1)
    return [json.loads(plan) for plan in plans_json]

async def store_recent_daily_plan(user_id: str, plan: dict, limit: int = 2):
    """
    Store a new daily plan in Redis for the user, keeping only the N most recent.
    """
    key = f"recent_daily_plans:{user_id}:{limit}"
    await redis_client.lpush(key, json.dumps(plan, cls=DecimalEncoder))
    await redis_client.ltrim(key, 0, limit - 1) 