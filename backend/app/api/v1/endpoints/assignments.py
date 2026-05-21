from __future__ import annotations

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies.auth import AuthUser
from app.api.v1.dependencies.pagination import PagedResponse, Pagination
from app.core.rbac import Permission, require_permissions
from app.db.session import get_db
from app.schemas.assignment import (
    AssignmentCreateRequest,
    AssignmentResponse,
    AssignmentReturnRequest,
)
from app.schemas.response import APIResponse
from app.services.assignment_service import AssignmentService

router = APIRouter(tags=["Assignments"])


@router.post(
    "",
    response_model=APIResponse[AssignmentResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Allocate asset to an employee (IT Head / Management)",
    dependencies=[Depends(require_permissions(Permission.ASSIGNMENT_CREATE))],
)
async def create_assignment(
    payload: AssignmentCreateRequest,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
):
    svc = AssignmentService(db)
    assignment = await svc.create(
        payload, actor_id=current_user.id, actor_role=current_user.role
    )
    return APIResponse.ok(data=AssignmentResponse.model_validate(assignment))


@router.get(
    "",
    response_model=PagedResponse[AssignmentResponse],
    status_code=status.HTTP_200_OK,
    summary="List all assignments with filters",
    dependencies=[Depends(require_permissions(Permission.ASSET_READ))],
)
async def list_assignments(
    pagination: Pagination,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
    asset_id: UUID | None = Query(None),
    assigned_to_id: UUID | None = Query(None),
    active_only: bool = Query(False),
):
    svc = AssignmentService(db)
    assignments, total = await svc.list_assignments(
        offset=pagination.offset,
        limit=pagination.limit,
        asset_id=asset_id,
        assigned_to_id=assigned_to_id,
        active_only=active_only,
    )
    return PagedResponse.build(
        items=[AssignmentResponse.model_validate(a) for a in assignments],
        total=total,
        params=pagination,
    )


@router.get(
    "/my-assets",
    response_model=APIResponse[List[AssignmentResponse]],
    status_code=status.HTTP_200_OK,
    summary="Get all assets currently assigned to me",
)
async def my_assets(
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
    active_only: bool = Query(True),
):
    svc = AssignmentService(db)
    assignments = await svc.get_my_assets(
        user_id=current_user.id, active_only=active_only
    )
    return APIResponse.ok(
        data=[AssignmentResponse.model_validate(a) for a in assignments]
    )


@router.get(
    "/{assignment_id}",
    response_model=APIResponse[AssignmentResponse],
    status_code=status.HTTP_200_OK,
    summary="Get assignment by ID",
)
async def get_assignment(
    assignment_id: UUID,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
):
    svc = AssignmentService(db)
    assignment = await svc.get_by_id(assignment_id)
    return APIResponse.ok(data=AssignmentResponse.model_validate(assignment))


@router.post(
    "/{assignment_id}/acknowledge",
    response_model=APIResponse[AssignmentResponse],
    status_code=status.HTTP_200_OK,
    summary="Employee acknowledges receipt of assigned asset",
    dependencies=[Depends(require_permissions(Permission.ASSIGNMENT_ACKNOWLEDGE))],
)
async def acknowledge_assignment(
    assignment_id: UUID,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
):
    svc = AssignmentService(db)
    assignment = await svc.acknowledge(
        assignment_id, actor_id=current_user.id, actor_role=current_user.role
    )
    return APIResponse.ok(data=AssignmentResponse.model_validate(assignment))


@router.post(
    "/{assignment_id}/return",
    response_model=APIResponse[AssignmentResponse],
    status_code=status.HTTP_200_OK,
    summary="Return an assigned asset — resets status to available",
)
async def return_asset(
    assignment_id: UUID,
    payload: AssignmentReturnRequest,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
):
    svc = AssignmentService(db)
    assignment = await svc.return_asset(
        assignment_id, payload, actor_id=current_user.id, actor_role=current_user.role
    )
    return APIResponse.ok(data=AssignmentResponse.model_validate(assignment))
