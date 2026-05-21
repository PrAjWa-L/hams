from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies.auth import AuthUser
from app.api.v1.dependencies.pagination import PagedResponse, Pagination
from app.core.rbac import Permission, require_permissions
from app.db.session import get_db
from app.schemas.response import APIResponse
from app.schemas.vendor import VendorCreateRequest, VendorResponse, VendorUpdateRequest
from app.services.vendor_service import VendorService

router = APIRouter(tags=["Vendors"])


@router.post(
    "",
    response_model=APIResponse[VendorResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create vendor",
    dependencies=[Depends(require_permissions(Permission.ASSET_CREATE))],
)
async def create_vendor(
    payload: VendorCreateRequest,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
):
    svc = VendorService(db)
    vendor = await svc.create(payload, actor_id=current_user.id)
    return APIResponse.ok(data=VendorResponse.model_validate(vendor))


@router.get(
    "",
    response_model=PagedResponse[VendorResponse],
    status_code=status.HTTP_200_OK,
    summary="List vendors",
)
async def list_vendors(
    pagination: Pagination,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
    active_only: bool = Query(True),
    search: str | None = Query(None, max_length=100),
):
    svc = VendorService(db)
    vendors, total = await svc.list_all(
        offset=pagination.offset,
        limit=pagination.limit,
        active_only=active_only,
        search=search,
    )
    return PagedResponse.build(
        items=[VendorResponse.model_validate(v) for v in vendors],
        total=total,
        params=pagination,
    )


@router.get(
    "/{vendor_id}",
    response_model=APIResponse[VendorResponse],
    status_code=status.HTTP_200_OK,
    summary="Get vendor by ID",
)
async def get_vendor(
    vendor_id: UUID,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
):
    svc = VendorService(db)
    vendor = await svc.get_by_id(vendor_id)
    return APIResponse.ok(data=VendorResponse.model_validate(vendor))


@router.patch(
    "/{vendor_id}",
    response_model=APIResponse[VendorResponse],
    status_code=status.HTTP_200_OK,
    summary="Update vendor",
    dependencies=[Depends(require_permissions(Permission.ASSET_UPDATE))],
)
async def update_vendor(
    vendor_id: UUID,
    payload: VendorUpdateRequest,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
):
    svc = VendorService(db)
    vendor = await svc.update(vendor_id, payload, actor_id=current_user.id)
    return APIResponse.ok(data=VendorResponse.model_validate(vendor))


@router.delete(
    "/{vendor_id}",
    response_model=APIResponse[None],
    status_code=status.HTTP_200_OK,
    summary="Delete vendor",
    dependencies=[Depends(require_permissions(Permission.ASSET_RETIRE))],
)
async def delete_vendor(
    vendor_id: UUID,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
):
    svc = VendorService(db)
    await svc.delete(vendor_id, actor_id=current_user.id)
    return APIResponse.empty(message="Vendor deleted")
