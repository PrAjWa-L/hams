from __future__ import annotations

from typing import AsyncGenerator, Optional

import redis.asyncio as aioredis
from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

_redis_pool: Optional[Redis] = None


async def get_redis_pool() -> Redis:
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = await aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            max_connections=20,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True,
        )
        logger.info("redis_pool_created", url=settings.REDIS_URL)
    return _redis_pool


async def close_redis_pool() -> None:
    global _redis_pool
    if _redis_pool:
        await _redis_pool.aclose()
        _redis_pool = None
        logger.info("redis_pool_closed")


async def get_redis() -> AsyncGenerator[Redis, None]:
    pool = await get_redis_pool()
    yield pool


async def ping_redis() -> bool:
    try:
        pool = await get_redis_pool()
        return await pool.ping()
    except RedisError as exc:
        logger.error("redis_ping_failed", error=str(exc))
        return False


class RedisKeys:
    """Centralised key namespace to prevent collisions."""

    @staticmethod
    def token_blacklist(jti: str) -> str:
        return f"hams:token:blacklist:{jti}"

    @staticmethod
    def rate_limit(ip: str, endpoint: str) -> str:
        return f"hams:rate:{ip}:{endpoint}"

    @staticmethod
    def cache(entity: str, id: str) -> str:
        return f"hams:cache:{entity}:{id}"

    @staticmethod
    def session(user_id: str) -> str:
        return f"hams:session:{user_id}"
