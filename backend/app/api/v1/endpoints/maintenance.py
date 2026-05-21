from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies.auth import AuthUser
from app.api.v1.dependencies.pagination import PagedResponse, Pagination
from app.core.rbac import Permission, require_permissions
from app.db.session import get_db
from app.schemas.maintenance import (
    MaintenanceCreateRequest,
    MaintenanceResponse,
    MaintenanceUpdateRequest,
)
from app.schemas.response import APIResponse
from app.services.maintenance_service import MaintenanceService

router = APIRouter(tags=["Maintenance"])


@router.post(
    "",
    response_model=APIResponse[MaintenanceResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Log completed maintenance work against an asset",
    dependencies=[Depends(require_permissions(Permission.MAINTENANCE_LOG))],
)
async def log_maintenance(
    payload: MaintenanceCreateRequest,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
):
    svc = MaintenanceService(db)
    record = await svc.create(payload, actor_id=current_user.id)
    return APIResponse.ok(data=MaintenanceResponse.model_validate(record))


@router.get(
    "/asset/{asset_id}",
    response_model=PagedResponse[MaintenanceResponse],
    status_code=status.HTTP_200_OK,
    summary="List all maintenance records for an asset",
)
async def list_asset_maintenance(
    asset_id: UUID,
    pagination: Pagination,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
    work_type: str | None = Query(None),
):
    svc = MaintenanceService(db)
    records, total = await svc.list_for_asset(
        asset_id,
        offset=pagination.offset,
        limit=pagination.limit,
        work_type=work_type,
    )
    return PagedResponse.build(
        items=[MaintenanceResponse.model_validate(r) for r in records],
        total=total,
        params=pagination,
    )


@router.get(
    "/upcoming",
    response_model=APIResponse[list],
    status_code=status.HTTP_200_OK,
    summary="Get assets with maintenance due in the next N days",
    dependencies=[Depends(require_permissions(Permission.MAINTENANCE_LOG))],
)
async def upcoming_maintenance(
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
    days: int = Query(default=30, ge=1, le=365),
):
    svc = MaintenanceService(db)
    records = await svc.list_upcoming(days=days)
    return APIResponse.ok(
        data=[MaintenanceResponse.model_validate(r) for r in records],
        meta={"days": days, "count": len(records)},
    )


@router.get(
    "/{record_id}",
    response_model=APIResponse[MaintenanceResponse],
    status_code=status.HTTP_200_OK,
    summary="Get maintenance record by ID",
)
async def get_maintenance_record(
    record_id: UUID,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
):
    svc = MaintenanceService(db)
    record = await svc.get_by_id(record_id)
    return APIResponse.ok(data=MaintenanceResponse.model_validate(record))


@router.patch(
    "/{record_id}",
    response_model=APIResponse[MaintenanceResponse],
    status_code=status.HTTP_200_OK,
    summary="Update a maintenance record",
    dependencies=[Depends(require_permissions(Permission.MAINTENANCE_LOG))],
)
async def update_maintenance_record(
    record_id: UUID,
    payload: MaintenanceUpdateRequest,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
):
    svc = MaintenanceService(db)
    record = await svc.update(record_id, payload, actor_id=current_user.id)
    return APIResponse.ok(data=MaintenanceResponse.model_validate(record))
