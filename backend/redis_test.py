import asyncio

import redis.asyncio as redis


async def test_redis():
    r = redis.from_url("redis://default:rzxnPIqjrCwLwSvMWFazBbThzjmPsBYo@ballast.proxy.rlwy.net:51108")
    await r.set("test_key", "hello")
    value = await r.get("test_key")
    print("Redis value:", value)
    await r.close()

asyncio.run(test_redis())