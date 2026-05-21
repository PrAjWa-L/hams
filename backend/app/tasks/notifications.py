"""Notification tasks — email dispatch, warranty alerts, in-app pings."""
from __future__ import annotations

from app.core.celery import celery_app
from app.core.logging import get_logger

logger = get_logger(__name__)


@celery_app.task(
    bind=True,
    name="tasks.notifications.send_email",
    queue="notifications",
    max_retries=3,
    default_retry_delay=60,
)
def send_email_task(self, to: str, subject: str, body: str) -> dict:
    """Send a transactional email via SMTP."""
    import smtplib
    from email.mime.text import MIMEText
    from app.core.config import settings

    if not settings.SMTP_USER:
        logger.warning("smtp_not_configured", to=to, subject=subject)
        return {"status": "skipped", "reason": "SMTP not configured"}

    try:
        msg = MIMEText(body, "html")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM
        msg["To"] = to

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as smtp:
            if settings.SMTP_TLS:
                smtp.starttls()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.send_message(msg)

        logger.info("email_sent", to=to, subject=subject)
        return {"status": "sent", "to": to}

    except Exception as exc:
        logger.error("email_failed", to=to, error=str(exc))
        raise self.retry(exc=exc)


@celery_app.task(
    name="tasks.notifications.send_warranty_alert",
    queue="notifications",
    max_retries=2,
)
def send_warranty_alert_task(
    asset_id: str,
    asset_name: str,
    asset_code: str,
    warranty_end: str,
    days_remaining: int,
) -> dict:
    """Send warranty expiry alert email to IT Head / Management."""
    import asyncio
    from app.core.config import settings

    subject = f"⚠️ Warranty Expiring in {days_remaining} days — {asset_code}"
    body = f"""
    <h3>Warranty Expiry Alert</h3>
    <p>The following asset's warranty is expiring in <strong>{days_remaining} days</strong>:</p>
    <ul>
        <li><strong>Asset:</strong> {asset_name}</li>
        <li><strong>Code:</strong> {asset_code}</li>
        <li><strong>Warranty End:</strong> {warranty_end}</li>
    </ul>
    <p>Please arrange renewal or replacement.</p>
    """

    async def _get_it_head_email():
        from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
        from sqlalchemy import select
        from app.models.user import User
        from app.core.rbac import Role

        engine = create_async_engine(settings.DATABASE_URL, echo=False)
        factory = async_sessionmaker(engine, expire_on_commit=False)
        async with factory() as db:
            result = await db.execute(
                select(User.email).where(
                    User.role.in_([Role.IT_HEAD, Role.MANAGEMENT]),
                    User.is_active == True,  # noqa: E712
                    User.is_deleted == False,  # noqa: E712
                )
            )
            emails = result.scalars().all()
        await engine.dispose()
        return emails

    emails = asyncio.run(_get_it_head_email())
    for email in emails:
        send_email_task.delay(to=email, subject=subject, body=body)

    logger.info(
        "warranty_alerts_queued",
        asset_code=asset_code,
        days_remaining=days_remaining,
        recipients=len(emails),
    )
    return {"alerts_queued": len(emails)}
