from __future__ import annotations

import time
from typing import Any, Dict

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.redis import ping_redis
from app.db.session import get_db

router = APIRouter(tags=["System"])


@router.get(
    "/health",
    summary="Liveness probe",
    status_code=status.HTTP_200_OK,
)
async def health() -> Dict[str, str]:
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "env": settings.APP_ENV,
    }


@router.get(
    "/ready",
    summary="Readiness probe — checks all dependencies",
    status_code=status.HTTP_200_OK,
)
async def readiness(db: AsyncSession = Depends(get_db)) -> JSONResponse:
    start = time.perf_counter()
    checks: Dict[str, Any] = {}
    overall_ok = True

    # PostgreSQL
    try:
        await db.execute(text("SELECT 1"))
        checks["postgres"] = {"status": "ok"}
    except Exception as exc:
        checks["postgres"] = {"status": "error", "detail": str(exc)}
        overall_ok = False

    # Redis
    redis_ok = await ping_redis()
    checks["redis"] = {"status": "ok" if redis_ok else "error"}
    if not redis_ok:
        overall_ok = False

    duration_ms = round((time.perf_counter() - start) * 1000, 2)
    http_status = status.HTTP_200_OK if overall_ok else status.HTTP_503_SERVICE_UNAVAILABLE

    return JSONResponse(
        status_code=http_status,
        content={
            "status": "ready" if overall_ok else "degraded",
            "checks": checks,
            "duration_ms": duration_ms,
        },
    )
