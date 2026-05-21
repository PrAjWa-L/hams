from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional, Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.core.logging import get_logger
from app.core.rbac import Role
from app.models.onboarding_request import OnboardingRequest
from app.models.user import User
from app.schemas.onboarding import (
    OnboardingApproveRequest,
    OnboardingCreateRequest,
    OnboardingRejectRequest,
)
from app.services.audit_service import AuditService

logger = get_logger(__name__)

_LOAD_OPTS = [
    selectinload(OnboardingRequest.employee),
    selectinload(OnboardingRequest.requested_by),
    selectinload(OnboardingRequest.approved_by),
]


class OnboardingService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.audit = AuditService(db)

    # ── Create (HR) ───────────────────────────────────────────

    async def create(
        self, data: OnboardingCreateRequest, actor_id: UUID, actor_role: str
    ) -> OnboardingRequest:
        if actor_role not in (Role.HR, Role.COO):
            raise ForbiddenException(detail="Only HR can create onboarding requests")

        # Verify employee exists
        emp = await self.db.get(User, data.employee_id)
        if not emp:
            raise NotFoundException(detail="Employee not found")

        # Check no active request exists for this employee
        existing = await self.db.execute(
            select(OnboardingRequest).where(
                OnboardingRequest.employee_id == data.employee_id,
                OnboardingRequest.status.in_(
                    ["draft", "pending_approval", "approved", "in_progress"]
                ),
            )
        )
        if existing.scalar_one_or_none():
            raise BadRequestException(
                detail="An active onboarding request already exists for this employee"
            )

        req = OnboardingRequest(
            employee_id=data.employee_id,
            requested_by_id=actor_id,
            status="pending_approval",
            asset_requirements=[r.model_dump() for r in data.asset_requirements],
            join_date=data.join_date,
            notes=data.notes,
        )
        self.db.add(req)
        await self.db.flush()

        await self.audit.log(
            actor_id=actor_id,
            entity_type="onboarding_request",
            entity_id=req.id,
            action="create",
            after_state={"employee_id": str(data.employee_id), "status": "pending_approval"},
        )
        logger.info("onboarding_created", request_id=str(req.id))
        return await self._load(req.id)

    # ── Approve (COO) ─────────────────────────────────────────

    async def approve(
        self, request_id: UUID, data: OnboardingApproveRequest, actor_id: UUID, actor_role: str
    ) -> OnboardingRequest:
        if actor_role != Role.COO:
            raise ForbiddenException(detail="Only COO can approve onboarding requests")

        req = await self._get_or_raise(request_id)
        if req.status != "pending_approval":
            raise BadRequestException(detail=f"Request is '{req.status}', not pending approval")

        before = {"status": req.status}
        req.status = "approved"
        req.approved_by_id = actor_id
        req.approved_at = datetime.now(timezone.utc)
        if data.notes:
            req.notes = (req.notes or "") + f"\n[COO] {data.notes}"

        self.db.add(req)
        await self.db.flush()

        await self.audit.log(
            actor_id=actor_id,
            entity_type="onboarding_request",
            entity_id=req.id,
            action="approve",
            before_state=before,
            after_state={"status": "approved"},
        )
        logger.info("onboarding_approved", request_id=str(request_id))
        return await self._load(req.id)

    # ── Reject (COO) ──────────────────────────────────────────

    async def reject(
        self, request_id: UUID, data: OnboardingRejectRequest, actor_id: UUID, actor_role: str
    ) -> OnboardingRequest:
        if actor_role != Role.COO:
            raise ForbiddenException(detail="Only COO can reject onboarding requests")

        req = await self._get_or_raise(request_id)
        if req.status != "pending_approval":
            raise BadRequestException(detail=f"Request is '{req.status}', not pending approval")

        before = {"status": req.status}
        req.status = "rejected"
        req.rejection_reason = data.rejection_reason

        self.db.add(req)
        await self.db.flush()

        await self.audit.log(
            actor_id=actor_id,
            entity_type="onboarding_request",
            entity_id=req.id,
            action="reject",
            before_state=before,
            after_state={"status": "rejected", "reason": data.rejection_reason},
        )
        logger.info("onboarding_rejected", request_id=str(request_id))
        return await self._load(req.id)

    # ── Mark complete (IT Head / Management) ──────────────────

    async def mark_complete(self, request_id: UUID, actor_id: UUID) -> OnboardingRequest:
        req = await self._get_or_raise(request_id)
        if req.status not in ("approved", "in_progress"):
            raise BadRequestException(detail="Request must be approved before completing")

        req.status = "completed"
        req.completed_at = datetime.now(timezone.utc)
        self.db.add(req)
        await self.db.flush()

        await self.audit.log(
            actor_id=actor_id,
            entity_type="onboarding_request",
            entity_id=req.id,
            action="complete",
            after_state={"status": "completed"},
        )
        return await self._load(req.id)

    # ── List ──────────────────────────────────────────────────

    async def list_requests(
        self,
        *,
        offset: int = 0,
        limit: int = 20,
        status: Optional[str] = None,
        employee_id: Optional[UUID] = None,
        requested_by_id: Optional[UUID] = None,
    ) -> tuple[Sequence[OnboardingRequest], int]:
        from sqlalchemy import func

        query = select(OnboardingRequest).options(*_LOAD_OPTS)
        count_query = select(func.count(OnboardingRequest.id))

        if status:
            query = query.where(OnboardingRequest.status == status)
            count_query = count_query.where(OnboardingRequest.status == status)
        if employee_id:
            query = query.where(OnboardingRequest.employee_id == employee_id)
            count_query = count_query.where(OnboardingRequest.employee_id == employee_id)
        if requested_by_id:
            query = query.where(OnboardingRequest.requested_by_id == requested_by_id)
            count_query = count_query.where(OnboardingRequest.requested_by_id == requested_by_id)

        total = (await self.db.execute(count_query)).scalar_one()
        query = query.order_by(OnboardingRequest.created_at.desc()).offset(offset).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all(), total

    async def get_by_id(self, request_id: UUID) -> OnboardingRequest:
        return await self._get_or_raise(request_id)

    # ── Helpers ───────────────────────────────────────────────

    async def _load(self, request_id: UUID) -> OnboardingRequest:
        result = await self.db.execute(
            select(OnboardingRequest).options(*_LOAD_OPTS).where(
                OnboardingRequest.id == request_id
            )
        )
        return result.scalar_one_or_none()

    async def _get_or_raise(self, request_id: UUID) -> OnboardingRequest:
        req = await self._load(request_id)
        if not req:
            raise NotFoundException(detail=f"Onboarding request '{request_id}' not found")
        return req
