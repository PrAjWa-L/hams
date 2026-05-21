from __future__ import annotations

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies.auth import AuthUser
from app.api.v1.dependencies.pagination import PagedResponse, Pagination
from app.core.rbac import Permission, require_permissions
from app.core.storage import get_presigned_url
from app.db.session import get_db
from app.schemas.asset import (
    AssetCreateRequest,
    AssetListItem,
    AssetResponse,
    AssetRetireRequest,
    AssetTransferRequest,
    AssetUpdateRequest,
    DocumentResponse,
)
from app.schemas.response import APIResponse
from app.services.asset_service import AssetService
from app.services.document_service import DocumentService

router = APIRouter(tags=["Assets"])


@router.post(
    "",
    response_model=APIResponse[AssetResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Register a new asset",
    dependencies=[Depends(require_permissions(Permission.ASSET_CREATE))],
)
async def create_asset(
    payload: AssetCreateRequest,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
):
    svc = AssetService(db)
    asset = await svc.create(
        payload, actor_id=current_user.id, actor_role=current_user.role
    )
    return APIResponse.ok(data=AssetResponse.model_validate(asset))


@router.get(
    "",
    response_model=PagedResponse[AssetListItem],
    status_code=status.HTTP_200_OK,
    summary="List assets with filters — domain-scoped by role",
)
async def list_assets(
    pagination: Pagination,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
    category_id: UUID | None = Query(None),
    department_id: UUID | None = Query(None),
    status: str | None = Query(None),
    domain: str | None = Query(None, description="IT or FACILITY — COO only"),
    floor: str | None = Query(None),
    search: str | None = Query(None, max_length=100),
    warranty_expiring_days: int | None = Query(
        None, ge=1, le=365, description="Assets with warranty expiring within N days"
    ),
):
    svc = AssetService(db)
    assets, total = await svc.list_assets(
        actor_role=current_user.role,
        offset=pagination.offset,
        limit=pagination.limit,
        category_id=category_id,
        department_id=department_id,
        status=status,
        domain=domain,
        floor=floor,
        search=search,
        warranty_expiring_days=warranty_expiring_days,
    )
    return PagedResponse.build(
        items=[AssetListItem.model_validate(a) for a in assets],
        total=total,
        params=pagination,
    )


@router.get(
    "/by-code/{asset_code}",
    response_model=APIResponse[AssetResponse],
    status_code=status.HTTP_200_OK,
    summary="Get asset by asset code (e.g. HAMS-IT-00001) — used by QR scanner",
)
async def get_asset_by_code(
    asset_code: str,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
):
    svc = AssetService(db)
    asset = await svc.get_by_asset_code(asset_code, actor_role=current_user.role)
    return APIResponse.ok(data=AssetResponse.model_validate(asset))


@router.get(
    "/{asset_id}",
    response_model=APIResponse[AssetResponse],
    status_code=status.HTTP_200_OK,
    summary="Get asset by UUID",
)
async def get_asset(
    asset_id: UUID,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
):
    svc = AssetService(db)
    asset = await svc.get_by_id(asset_id, actor_role=current_user.role)
    return APIResponse.ok(data=AssetResponse.model_validate(asset))


@router.patch(
    "/{asset_id}",
    response_model=APIResponse[AssetResponse],
    status_code=status.HTTP_200_OK,
    summary="Update asset details",
    dependencies=[Depends(require_permissions(Permission.ASSET_UPDATE))],
)
async def update_asset(
    asset_id: UUID,
    payload: AssetUpdateRequest,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
):
    svc = AssetService(db)
    asset = await svc.update(
        asset_id, payload, actor_id=current_user.id, actor_role=current_user.role
    )
    return APIResponse.ok(data=AssetResponse.model_validate(asset))


@router.post(
    "/{asset_id}/retire",
    response_model=APIResponse[AssetResponse],
    status_code=status.HTTP_200_OK,
    summary="Retire an asset",
    dependencies=[Depends(require_permissions(Permission.ASSET_RETIRE))],
)
async def retire_asset(
    asset_id: UUID,
    payload: AssetRetireRequest,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
):
    svc = AssetService(db)
    asset = await svc.retire(
        asset_id, payload, actor_id=current_user.id, actor_role=current_user.role
    )
    return APIResponse.ok(data=AssetResponse.model_validate(asset))


@router.post(
    "/{asset_id}/transfer",
    response_model=APIResponse[AssetResponse],
    status_code=status.HTTP_200_OK,
    summary="Transfer asset to another department",
    dependencies=[Depends(require_permissions(Permission.ASSET_TRANSFER))],
)
async def transfer_asset(
    asset_id: UUID,
    payload: AssetTransferRequest,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
):
    svc = AssetService(db)
    asset = await svc.transfer(
        asset_id, payload, actor_id=current_user.id, actor_role=current_user.role
    )
    return APIResponse.ok(data=AssetResponse.model_validate(asset))


@router.get(
    "/{asset_id}/qr",
    status_code=status.HTTP_200_OK,
    summary="Get presigned QR code URL for an asset",
)
async def get_asset_qr(
    asset_id: UUID,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
):
    svc = AssetService(db)
    asset = await svc.get_by_id(asset_id, actor_role=current_user.role)
    if not asset.qr_code_url:
        from app.core.exceptions import NotFoundException
        raise NotFoundException(detail="QR code not yet generated for this asset")
    url = get_presigned_url(asset.qr_code_url, expires_seconds=300)
    return APIResponse.ok(data={"qr_url": url, "expires_in": 300})


@router.get(
    "/{asset_id}/documents",
    response_model=APIResponse[List[DocumentResponse]],
    status_code=status.HTTP_200_OK,
    summary="List documents attached to an asset",
)
async def list_asset_documents(
    asset_id: UUID,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
):
    # Verify asset access first
    asset_svc = AssetService(db)
    await asset_svc.get_by_id(asset_id, actor_role=current_user.role)

    doc_svc = DocumentService(db)
    docs = await doc_svc.list_for_entity("asset", asset_id)
    return APIResponse.ok(data=[DocumentResponse.model_validate(d) for d in docs])
