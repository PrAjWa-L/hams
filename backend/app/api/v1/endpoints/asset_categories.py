from __future__ import annotations

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies.auth import AuthUser
from app.core.rbac import Permission, require_permissions
from app.db.session import get_db
from app.schemas.asset_category import (
    AssetCategoryCreateRequest,
    AssetCategoryResponse,
    AssetCategoryUpdateRequest,
)
from app.schemas.response import APIResponse
from app.services.asset_category_service import AssetCategoryService

router = APIRouter(tags=["Asset Categories"])


@router.post(
    "",
    response_model=APIResponse[AssetCategoryResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create asset category",
    dependencies=[Depends(require_permissions(Permission.ASSET_CREATE))],
)
async def create_category(
    payload: AssetCategoryCreateRequest,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
):
    svc = AssetCategoryService(db)
    cat = await svc.create(payload, actor_id=current_user.id)
    return APIResponse.ok(data=AssetCategoryResponse.model_validate(cat))


@router.get(
    "",
    response_model=APIResponse[List[AssetCategoryResponse]],
    status_code=status.HTTP_200_OK,
    summary="List asset categories — optionally filter by domain",
)
async def list_categories(
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
    domain: str | None = Query(None, description="IT or FACILITY"),
    active_only: bool = Query(True),
):
    svc = AssetCategoryService(db)
    cats = await svc.list_all(domain=domain, active_only=active_only)
    return APIResponse.ok(data=[AssetCategoryResponse.model_validate(c) for c in cats])


@router.get(
    "/{category_id}",
    response_model=APIResponse[AssetCategoryResponse],
    status_code=status.HTTP_200_OK,
    summary="Get category by ID",
)
async def get_category(
    category_id: UUID,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
):
    svc = AssetCategoryService(db)
    cat = await svc.get_by_id(category_id)
    return APIResponse.ok(data=AssetCategoryResponse.model_validate(cat))


@router.patch(
    "/{category_id}",
    response_model=APIResponse[AssetCategoryResponse],
    status_code=status.HTTP_200_OK,
    summary="Update asset category",
    dependencies=[Depends(require_permissions(Permission.ASSET_UPDATE))],
)
async def update_category(
    category_id: UUID,
    payload: AssetCategoryUpdateRequest,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
):
    svc = AssetCategoryService(db)
    cat = await svc.update(category_id, payload, actor_id=current_user.id)
    return APIResponse.ok(data=AssetCategoryResponse.model_validate(cat))
