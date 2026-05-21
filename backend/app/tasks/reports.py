"""Report generation tasks — async CSV/PDF export."""
from __future__ import annotations

from app.core.celery import celery_app


@celery_app.task(
    name="tasks.reports.generate_export",
    queue="reports",
    max_retries=2,
)
def generate_export(report_type: str, filters: dict, requested_by: str) -> dict:
    """Generate a report file, upload to MinIO, and notify requester."""
    raise NotImplementedError
