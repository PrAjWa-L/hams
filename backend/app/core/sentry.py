from __future__ import annotations

import sentry_sdk
from sentry_sdk.integrations.asyncio import AsyncioIntegration
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
import logging

from app.core.config import settings


def init_sentry() -> None:
    if not settings.SENTRY_DSN:
        return

    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.SENTRY_ENVIRONMENT,
        release=f"{settings.APP_NAME}@{settings.APP_VERSION}",
        traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
        integrations=[
            FastApiIntegration(transaction_style="endpoint"),
            SqlalchemyIntegration(),
            CeleryIntegration(monitor_beat_tasks=True),
            RedisIntegration(),
            AsyncioIntegration(),
            LoggingIntegration(
                level=logging.INFO,
                event_level=logging.ERROR,
            ),
        ],
        before_send=_before_send,
        send_default_pii=False,
    )


def _before_send(event: dict, hint: dict) -> dict | None:
    # Drop health check noise
    request = event.get("request", {})
    url = request.get("url", "")
    if url.endswith("/health") or url.endswith("/metrics"):
        return None
    return event
