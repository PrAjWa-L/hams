from __future__ import annotations

from celery import Celery
from celery.signals import task_failure, task_postrun, task_prerun, worker_ready
from kombu import Exchange, Queue

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def create_celery_app() -> Celery:
    app = Celery(settings.APP_NAME)

    app.config_from_object(
        {
            "broker_url": settings.CELERY_BROKER_URL,
            "result_backend": settings.CELERY_RESULT_BACKEND,
            "task_serializer": settings.CELERY_TASK_SERIALIZER,
            "result_serializer": settings.CELERY_RESULT_SERIALIZER,
            "accept_content": settings.CELERY_ACCEPT_CONTENT,
            "timezone": settings.CELERY_TIMEZONE,
            "enable_utc": True,
            "task_track_started": True,
            "task_acks_late": True,
            "worker_prefetch_multiplier": 1,
            "task_reject_on_worker_lost": True,
            "result_expires": 3600,
            "broker_connection_retry_on_startup": True,
            # Queues
            "task_queues": (
                Queue("default", Exchange("default"), routing_key="default"),
                Queue("notifications", Exchange("notifications"), routing_key="notifications"),
                Queue("reports", Exchange("reports"), routing_key="reports"),
                Queue("maintenance", Exchange("maintenance"), routing_key="maintenance"),
            ),
            "task_default_queue": "default",
            "task_default_exchange": "default",
            "task_default_routing_key": "default",
            # Beat schedule (warranty alerts, etc.) — populated in tasks
            "beat_schedule": {},
        }
    )

    app.autodiscover_tasks(
        [
            "app.tasks.notifications",
            "app.tasks.maintenance",
            "app.tasks.reports",
        ]
    )

    return app


celery_app: Celery = create_celery_app()


# ── Signals ───────────────────────────────────────────────────

@worker_ready.connect
def on_worker_ready(**kwargs: object) -> None:
    logger.info("celery_worker_ready")


@task_prerun.connect
def on_task_prerun(task_id: str, task: object, **kwargs: object) -> None:
    logger.info("celery_task_started", task_id=task_id, task=str(task))


@task_postrun.connect
def on_task_postrun(task_id: str, task: object, state: str, **kwargs: object) -> None:
    logger.info("celery_task_finished", task_id=task_id, task=str(task), state=state)


@task_failure.connect
def on_task_failure(
    task_id: str, exception: Exception, **kwargs: object
) -> None:
    logger.error(
        "celery_task_failed",
        task_id=task_id,
        error=str(exception),
        exc_info=exception,
    )
