"""Maintenance tasks — warranty expiry alerts, AMC reminders, scheduled checks."""
from __future__ import annotations

from celery.schedules import crontab

from app.core.celery import celery_app
from app.core.logging import get_logger

logger = get_logger(__name__)


@celery_app.task(
    name="tasks.maintenance.check_warranty_expiry",
    queue="maintenance",
)
def check_warranty_expiry() -> dict:
    """
    Nightly job: find assets with warranty expiring in 30/60/90 days.
    Enqueues email notifications to IT Head / Management.
    """
    import asyncio
    from datetime import date, timedelta

    async def _run():
        from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
        from sqlalchemy import select
        from app.core.config import settings
        from app.models.asset import Asset
        from app.models.asset_category import AssetCategory

        engine = create_async_engine(settings.DATABASE_URL, echo=False)
        factory = async_sessionmaker(engine, expire_on_commit=False)

        thresholds = [30, 60, 90]
        total_alerted = 0

        async with factory() as db:
            for days in thresholds:
                cutoff = date.today() + timedelta(days=days)
                window_start = date.today() + timedelta(days=days - 1)

                result = await db.execute(
                    select(Asset)
                    .join(AssetCategory)
                    .where(
                        Asset.warranty_end >= window_start,
                        Asset.warranty_end <= cutoff,
                        Asset.is_deleted == False,  # noqa: E712
                        Asset.status.notin_(["retired", "disposed"]),
                    )
                )
                assets = result.scalars().all()

                for asset in assets:
                    # Enqueue email notification
                    from app.tasks.notifications import send_warranty_alert_task
                    send_warranty_alert_task.delay(
                        asset_id=str(asset.id),
                        asset_name=asset.name,
                        asset_code=asset.asset_id,
                        warranty_end=str(asset.warranty_end),
                        days_remaining=days,
                    )
                    total_alerted += 1

                logger.info(
                    "warranty_check_done",
                    days_threshold=days,
                    assets_found=len(assets),
                )

        await engine.dispose()
        return {"total_alerted": total_alerted}

    return asyncio.run(_run())


@celery_app.task(
    name="tasks.maintenance.check_amc_expiry",
    queue="maintenance",
)
def check_amc_expiry() -> dict:
    """Nightly: flag assets where AMC contract expires within 30 days."""
    import asyncio
    from datetime import date, timedelta

    async def _run():
        from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
        from sqlalchemy import select
        from app.core.config import settings
        from app.models.asset import Asset

        engine = create_async_engine(settings.DATABASE_URL, echo=False)
        factory = async_sessionmaker(engine, expire_on_commit=False)
        cutoff = date.today() + timedelta(days=30)

        async with factory() as db:
            result = await db.execute(
                select(Asset).where(
                    Asset.amc_end.isnot(None),
                    Asset.amc_end <= cutoff,
                    Asset.amc_end >= date.today(),
                    Asset.is_deleted == False,  # noqa: E712
                )
            )
            assets = result.scalars().all()
            logger.info("amc_check_done", assets_expiring=len(assets))

        await engine.dispose()
        return {"amc_expiring": len(assets)}

    return asyncio.run(_run())


# ── Beat schedule ─────────────────────────────────────────────
celery_app.conf.beat_schedule.update(
    {
        "warranty-check-daily": {
            "task": "tasks.maintenance.check_warranty_expiry",
            "schedule": crontab(hour=6, minute=0),
        },
        "amc-check-daily": {
            "task": "tasks.maintenance.check_amc_expiry",
            "schedule": crontab(hour=6, minute=15),
        },
    }
)
