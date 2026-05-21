from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies.auth import AuthUser
from app.api.v1.dependencies.pagination import PagedResponse, Pagination
from app.core.rbac import Permission, require_permissions
from app.db.session import get_db
from app.schemas.response import APIResponse
from app.schemas.user import UserCreateRequest, UserResponse, UserUpdateRequest
from app.services.user_service import UserService

router = APIRouter(tags=["Users"])


@router.post(
    "",
    response_model=APIResponse[UserResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user (HR / COO / IT Head)",
    dependencies=[Depends(require_permissions(Permission.USER_MANAGE))],
)
async def create_user(
    payload: UserCreateRequest,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
):
    svc = UserService(db)
    user = await svc.create(payload, actor_id=current_user.id)
    return APIResponse.ok(data=UserResponse.model_validate(user))


@router.get(
    "",
    response_model=PagedResponse[UserResponse],
    status_code=status.HTTP_200_OK,
    summary="List users with filters",
    dependencies=[Depends(require_permissions(Permission.USER_MANAGE))],
)
async def list_users(
    pagination: Pagination,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
    role: str | None = Query(None),
    department_id: UUID | None = Query(None),
    is_active: bool | None = Query(None),
    search: str | None = Query(None, max_length=100),
):
    svc = UserService(db)
    users, total = await svc.list_users(
        offset=pagination.offset,
        limit=pagination.limit,
        role=role,
        department_id=department_id,
        is_active=is_active,
        search=search,
    )
    return PagedResponse.build(
        items=[UserResponse.model_validate(u) for u in users],
        total=total,
        params=pagination,
    )


@router.get(
    "/{user_id}",
    response_model=APIResponse[UserResponse],
    status_code=status.HTTP_200_OK,
    summary="Get user by ID",
)
async def get_user(
    user_id: UUID,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
):
    svc = UserService(db)
    user = await svc.get_by_id(user_id)
    return APIResponse.ok(data=UserResponse.model_validate(user))


@router.patch(
    "/{user_id}",
    response_model=APIResponse[UserResponse],
    status_code=status.HTTP_200_OK,
    summary="Update user",
    dependencies=[Depends(require_permissions(Permission.USER_MANAGE))],
)
async def update_user(
    user_id: UUID,
    payload: UserUpdateRequest,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
):
    svc = UserService(db)
    user = await svc.update(user_id, payload, actor_id=current_user.id)
    return APIResponse.ok(data=UserResponse.model_validate(user))


@router.post(
    "/{user_id}/deactivate",
    response_model=APIResponse[UserResponse],
    status_code=status.HTTP_200_OK,
    summary="Deactivate a user account",
    dependencies=[Depends(require_permissions(Permission.USER_MANAGE))],
)
async def deactivate_user(
    user_id: UUID,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
):
    svc = UserService(db)
    user = await svc.deactivate(user_id, actor_id=current_user.id)
    return APIResponse.ok(data=UserResponse.model_validate(user))
