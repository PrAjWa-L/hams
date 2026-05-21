from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies.auth import AuthUser
from app.api.v1.dependencies.pagination import PagedResponse, Pagination
from app.core.rbac import Permission, require_permissions
from app.db.session import get_db
from app.schemas.onboarding import (
    OnboardingApproveRequest,
    OnboardingCreateRequest,
    OnboardingRejectRequest,
    OnboardingResponse,
)
from app.schemas.response import APIResponse
from app.services.onboarding_service import OnboardingService

router = APIRouter(tags=["Onboarding"])


@router.post(
    "",
    response_model=APIResponse[OnboardingResponse],
    status_code=status.HTTP_201_CREATED,
    summary="HR creates onboarding request for a new employee",
    dependencies=[Depends(require_permissions(Permission.ONBOARDING_CREATE))],
)
async def create_onboarding(
    payload: OnboardingCreateRequest,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
):
    svc = OnboardingService(db)
    req = await svc.create(payload, actor_id=current_user.id, actor_role=current_user.role)
    return APIResponse.ok(data=OnboardingResponse.model_validate(req))


@router.get(
    "",
    response_model=PagedResponse[OnboardingResponse],
    status_code=status.HTTP_200_OK,
    summary="List onboarding requests",
)
async def list_onboarding(
    pagination: Pagination,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
    status: str | None = Query(None),
    employee_id: UUID | None = Query(None),
):
    svc = OnboardingService(db)
    items, total = await svc.list_requests(
        offset=pagination.offset,
        limit=pagination.limit,
        status=status,
        employee_id=employee_id,
    )
    return PagedResponse.build(
        items=[OnboardingResponse.model_validate(i) for i in items],
        total=total,
        params=pagination,
    )


@router.get(
    "/{request_id}",
    response_model=APIResponse[OnboardingResponse],
    status_code=status.HTTP_200_OK,
    summary="Get onboarding request by ID",
)
async def get_onboarding(
    request_id: UUID,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
):
    svc = OnboardingService(db)
    req = await svc.get_by_id(request_id)
    return APIResponse.ok(data=OnboardingResponse.model_validate(req))


@router.post(
    "/{request_id}/approve",
    response_model=APIResponse[OnboardingResponse],
    status_code=status.HTTP_200_OK,
    summary="COO approves onboarding request",
    dependencies=[Depends(require_permissions(Permission.ONBOARDING_APPROVE))],
)
async def approve_onboarding(
    request_id: UUID,
    payload: OnboardingApproveRequest,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
):
    svc = OnboardingService(db)
    req = await svc.approve(
        request_id, payload, actor_id=current_user.id, actor_role=current_user.role
    )
    return APIResponse.ok(data=OnboardingResponse.model_validate(req))


@router.post(
    "/{request_id}/reject",
    response_model=APIResponse[OnboardingResponse],
    status_code=status.HTTP_200_OK,
    summary="COO rejects onboarding request",
    dependencies=[Depends(require_permissions(Permission.ONBOARDING_APPROVE))],
)
async def reject_onboarding(
    request_id: UUID,
    payload: OnboardingRejectRequest,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
):
    svc = OnboardingService(db)
    req = await svc.reject(
        request_id, payload, actor_id=current_user.id, actor_role=current_user.role
    )
    return APIResponse.ok(data=OnboardingResponse.model_validate(req))


@router.post(
    "/{request_id}/complete",
    response_model=APIResponse[OnboardingResponse],
    status_code=status.HTTP_200_OK,
    summary="Mark onboarding as complete after all assets allocated",
    dependencies=[Depends(require_permissions(Permission.ASSIGNMENT_CREATE))],
)
async def complete_onboarding(
    request_id: UUID,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
):
    svc = OnboardingService(db)
    req = await svc.mark_complete(request_id, actor_id=current_user.id)
    return APIResponse.ok(data=OnboardingResponse.model_validate(req))
