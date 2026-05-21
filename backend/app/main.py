from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI

from app.api.v1.endpoints.health import router as health_router
from app.api.v1.router import api_v1_router
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import get_logger, setup_logging
from app.core.metrics import setup_metrics
from app.core.redis import close_redis_pool, get_redis_pool
from app.core.sentry import init_sentry
from app.core.storage import ensure_bucket
from app.middleware.base import register_middleware

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # ── Startup ───────────────────────────────────────────────
    logger.info("application_starting", env=settings.APP_ENV)

    await get_redis_pool()
    logger.info("redis_connected")

    try:
        ensure_bucket()
        logger.info("minio_ready")
    except Exception as exc:
        logger.warning("minio_unavailable", error=str(exc))

    logger.info("application_ready", version=settings.APP_VERSION)
    yield

    # ── Shutdown ──────────────────────────────────────────────
    logger.info("application_shutting_down")
    await close_redis_pool()
    logger.info("application_stopped")


def create_app() -> FastAPI:
    setup_logging()
    init_sentry()

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "Hospital Asset Management System — REST API v1\n\n"
            "All endpoints require `Authorization: Bearer <token>` "
            "except `/health`, `/ready`, and `/api/v1/auth/login`."
        ),
        docs_url="/api/docs" if not settings.is_production else None,
        redoc_url="/api/redoc" if not settings.is_production else None,
        openapi_url="/api/openapi.json" if not settings.is_production else None,
        # JWT Bearer injected here — works in all FastAPI versions
        openapi_extra={
            "components": {
                "securitySchemes": {
                    "BearerAuth": {
                        "type": "http",
                        "scheme": "bearer",
                        "bearerFormat": "JWT",
                    }
                }
            },
            "security": [{"BearerAuth": []}],
        },
        lifespan=lifespan,
    )

    register_middleware(app)
    register_exception_handlers(app)
    setup_metrics(app)

    # Health at root for Docker/Nginx probes: GET /health  GET /ready
    app.include_router(health_router)
    # Versioned API: /api/v1/...
    app.include_router(api_v1_router)

    return app


app = create_app()
