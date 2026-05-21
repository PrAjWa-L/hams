from __future__ import annotations

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies.auth import AuthUser
from app.core.rbac import Permission, require_permissions
from app.db.session import get_db
from app.schemas.department import (
    DepartmentCreateRequest,
    DepartmentResponse,
    DepartmentUpdateRequest,
)
from app.schemas.response import APIResponse
from app.services.department_service import DepartmentService

router = APIRouter(tags=["Departments"])


@router.post(
    "",
    response_model=APIResponse[DepartmentResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create department",
    dependencies=[Depends(require_permissions(Permission.USER_MANAGE))],
)
async def create_department(
    payload: DepartmentCreateRequest,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
):
    svc = DepartmentService(db)
    dept = await svc.create(payload, actor_id=current_user.id)
    return APIResponse.ok(data=DepartmentResponse.model_validate(dept))


@router.get(
    "",
    response_model=APIResponse[List[DepartmentResponse]],
    status_code=status.HTTP_200_OK,
    summary="List all departments",
)
async def list_departments(
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
    active_only: bool = True,
):
    svc = DepartmentService(db)
    depts = await svc.list_all(active_only=active_only)
    return APIResponse.ok(data=[DepartmentResponse.model_validate(d) for d in depts])


@router.get(
    "/{dept_id}",
    response_model=APIResponse[DepartmentResponse],
    status_code=status.HTTP_200_OK,
    summary="Get department by ID",
)
async def get_department(
    dept_id: UUID,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
):
    svc = DepartmentService(db)
    dept = await svc.get_by_id(dept_id)
    return APIResponse.ok(data=DepartmentResponse.model_validate(dept))


@router.patch(
    "/{dept_id}",
    response_model=APIResponse[DepartmentResponse],
    status_code=status.HTTP_200_OK,
    summary="Update department",
    dependencies=[Depends(require_permissions(Permission.USER_MANAGE))],
)
async def update_department(
    dept_id: UUID,
    payload: DepartmentUpdateRequest,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
):
    svc = DepartmentService(db)
    dept = await svc.update(dept_id, payload, actor_id=current_user.id)
    return APIResponse.ok(data=DepartmentResponse.model_validate(dept))
