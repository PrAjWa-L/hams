from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.v1.dependencies.auth import AuthUser
from app.api.v1.dependencies.pagination import PagedResponse, Pagination
from app.core.rbac import Permission, require_permissions
from app.db.session import get_db
from app.models.audit_log import AuditLog

router = APIRouter(tags=["Audit Logs"])


class AuditLogResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    actor_id: Optional[UUID] = None
    actor_name: Optional[str] = None
    entity_type: str
    entity_id: Optional[UUID] = None
    action: str
    before_state: Optional[dict] = None
    after_state: Optional[dict] = None
    ip_address: Optional[str] = None
    created_at: datetime


@router.get(
    "",
    response_model=PagedResponse[AuditLogResponse],
    status_code=status.HTTP_200_OK,
    summary="List audit logs — filterable by entity, action, actor",
    dependencies=[Depends(require_permissions(Permission.AUDIT_LOG_READ))],
)
async def list_audit_logs(
    pagination: Pagination,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
    entity_type: str | None = Query(None),
    entity_id: UUID | None = Query(None),
    actor_id: UUID | None = Query(None),
    action: str | None = Query(None),
    from_date: datetime | None = Query(None),
    to_date: datetime | None = Query(None),
):
    from sqlalchemy import func

    query = select(AuditLog).options(selectinload(AuditLog.actor))
    count_query = select(func.count(AuditLog.id))

    filters = []
    if entity_type:
        filters.append(AuditLog.entity_type == entity_type)
    if entity_id:
        filters.append(AuditLog.entity_id == entity_id)
    if actor_id:
        filters.append(AuditLog.actor_id == actor_id)
    if action:
        filters.append(AuditLog.action == action)
    if from_date:
        filters.append(AuditLog.created_at >= from_date)
    if to_date:
        filters.append(AuditLog.created_at <= to_date)

    for f in filters:
        query = query.where(f)
        count_query = count_query.where(f)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    query = query.order_by(AuditLog.created_at.desc())
    query = query.offset(pagination.offset).limit(pagination.limit)
    result = await db.execute(query)
    logs = result.scalars().all()

    items = []
    for log in logs:
        items.append(
            AuditLogResponse(
                id=log.id,
                actor_id=log.actor_id,
                actor_name=log.actor.full_name if log.actor else None,
                entity_type=log.entity_type,
                entity_id=log.entity_id,
                action=log.action,
                before_state=log.before_state,
                after_state=log.after_state,
                ip_address=log.ip_address,
                created_at=log.created_at,
            )
        )

    return PagedResponse.build(items=items, total=total, params=pagination)
