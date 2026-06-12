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
from app.models.asset import Asset
from app.models.asset_assignment import AssetAssignment
from app.models.onboarding_request import OnboardingRequest
from app.models.user import User
from app.schemas.assignment import AssignmentCreateRequest, AssignmentReturnRequest
from app.services.audit_service import AuditService

logger = get_logger(__name__)

_LOAD_OPTS = [
    selectinload(AssetAssignment.asset).selectinload(Asset.category),
    selectinload(AssetAssignment.asset).selectinload(Asset.department),
    selectinload(AssetAssignment.assigned_to),
    selectinload(AssetAssignment.assigned_by),
]


class AssignmentService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.audit = AuditService(db)

    # ── Allocate (IT Head / Management) ──────────────────────

    async def create(
        self,
        data: AssignmentCreateRequest,
        actor_id: UUID,
        actor_role: str,
    ) -> AssetAssignment:
        if actor_role not in (Role.IT_HEAD, Role.IT_TEAM, Role.MANAGEMENT, Role.COO):
            raise ForbiddenException(detail="You do not have permission to allocate assets")

        # Load asset
        asset_result = await self.db.execute(
            select(Asset)
            .options(selectinload(Asset.category))
            .where(Asset.id == data.asset_id, Asset.is_deleted == False)  # noqa: E712
        )
        asset = asset_result.scalar_one_or_none()
        if not asset:
            raise NotFoundException(detail="Asset not found")

        # Domain check — IT roles can only assign IT assets, Management only FACILITY
        if actor_role == Role.IT_HEAD or actor_role == Role.IT_TEAM:
            if asset.category.domain != "IT":
                raise ForbiddenException(detail="IT roles can only assign IT assets")
        elif actor_role == Role.MANAGEMENT:
            if asset.category.domain != "FACILITY":
                raise ForbiddenException(detail="Management can only assign FACILITY assets")

        # Asset must be available (or shared)
        if asset.status not in ("available",) and not asset.is_shared:
            raise BadRequestException(
                detail=f"Asset is '{asset.status}' and cannot be assigned"
            )

        # Resolve employee — auto-provision a no-login user from onboarding if needed
        emp = await self.db.get(User, data.assigned_to_id)
        if not emp:
            # Maybe assigned_to_id is actually an onboarding_request id
            onb = await self.db.get(OnboardingRequest, data.assigned_to_id)
            if not onb or onb.status not in ("approved", "completed"):
                raise NotFoundException(detail="Employee not found")

            # Check if a user with this emp_id already exists
            existing_user = await self.db.execute(
                select(User).where(User.emp_id == onb.employee_emp_id)
            )
            emp = existing_user.scalar_one_or_none()

            if not emp:
                # Create a minimal non-login user record
                from app.core.security import hash_password
                import secrets
                emp = User(
                    emp_id=onb.employee_emp_id,
                    full_name=onb.employee_name,
                    email=onb.employee_email,
                    role=Role.EMPLOYEE,
                    password_hash=hash_password(secrets.token_hex(32)),
                    is_active=False,          # cannot log in
                    must_change_password=False,
                )
                self.db.add(emp)
                await self.db.flush()
                await self.db.refresh(emp)

            data = data.model_copy(update={"assigned_to_id": emp.id})

        # For non-shared assets, check no active assignment exists
        if not asset.is_shared:
            existing = await self.db.execute(
                select(AssetAssignment).where(
                    AssetAssignment.asset_id == data.asset_id,
                    AssetAssignment.returned_at.is_(None),
                )
            )
            if existing.scalar_one_or_none():
                raise BadRequestException(detail="Asset already has an active assignment")

        assignment = AssetAssignment(
            asset_id=data.asset_id,
            assigned_to_id=data.assigned_to_id,
            assigned_by_id=actor_id,
            onboarding_request_id=data.onboarding_request_id,
            assigned_at=datetime.now(timezone.utc),
            notes=data.notes,
        )
        self.db.add(assignment)

        # Update asset status
        if not asset.is_shared:
            asset.status = "assigned"
            self.db.add(asset)

        await self.db.flush()

        await self.audit.log(
            actor_id=actor_id,
            entity_type="asset_assignment",
            entity_id=assignment.id,
            action="assign",
            after_state={
                "asset_id": str(data.asset_id),
                "assigned_to": str(data.assigned_to_id),
            },
        )
        await self.audit.log(
            actor_id=actor_id,
            entity_type="asset",
            entity_id=asset.id,
            action="status_change",
            before_state={"status": "available"},
            after_state={"status": "assigned"},
        )

        logger.info("asset_assigned", asset_id=str(data.asset_id), to=str(data.assigned_to_id))
        return await self._load(assignment.id)

    # ── Acknowledge (Employee) ────────────────────────────────

    async def acknowledge(
        self, assignment_id: UUID, actor_id: UUID, actor_role: str
    ) -> AssetAssignment:
        assignment = await self._get_or_raise(assignment_id)

        if str(assignment.assigned_to_id) != str(actor_id):
            raise ForbiddenException(detail="You can only acknowledge your own assignments")

        if assignment.acknowledged_at:
            raise BadRequestException(detail="Assignment already acknowledged")

        if assignment.returned_at:
            raise BadRequestException(detail="Asset has already been returned")

        assignment.acknowledged_at = datetime.now(timezone.utc)
        self.db.add(assignment)
        await self.db.flush()

        await self.audit.log(
            actor_id=actor_id,
            entity_type="asset_assignment",
            entity_id=assignment.id,
            action="acknowledge",
            after_state={"acknowledged_at": assignment.acknowledged_at.isoformat()},
        )
        logger.info("assignment_acknowledged", assignment_id=str(assignment_id))
        return await self._load(assignment.id)

    # ── Return ────────────────────────────────────────────────

    async def return_asset(
        self,
        assignment_id: UUID,
        data: AssignmentReturnRequest,
        actor_id: UUID,
        actor_role: str,
    ) -> AssetAssignment:
        assignment = await self._get_or_raise(assignment_id)

        # Employee can return their own; IT Head/Management can force-return
        if actor_role == Role.EMPLOYEE:
            if str(assignment.assigned_to_id) != str(actor_id):
                raise ForbiddenException(detail="You can only return your own assets")

        if assignment.returned_at:
            raise BadRequestException(detail="Asset has already been returned")

        assignment.returned_at = datetime.now(timezone.utc)
        assignment.return_notes = data.return_notes
        self.db.add(assignment)

        # Reset asset status to available
        asset = await self.db.get(Asset, assignment.asset_id)
        if asset and not asset.is_shared:
            asset.status = "available"
            self.db.add(asset)

        await self.db.flush()

        await self.audit.log(
            actor_id=actor_id,
            entity_type="asset_assignment",
            entity_id=assignment.id,
            action="return",
            after_state={"returned_at": assignment.returned_at.isoformat()},
        )
        if asset:
            await self.audit.log(
                actor_id=actor_id,
                entity_type="asset",
                entity_id=asset.id,
                action="status_change",
                before_state={"status": "assigned"},
                after_state={"status": "available"},
            )

        logger.info("asset_returned", assignment_id=str(assignment_id))
        return await self._load(assignment.id)

    # ── List ──────────────────────────────────────────────────

    async def list_assignments(
        self,
        *,
        offset: int = 0,
        limit: int = 20,
        asset_id: Optional[UUID] = None,
        assigned_to_id: Optional[UUID] = None,
        active_only: bool = False,
    ) -> tuple[Sequence[AssetAssignment], int]:
        from sqlalchemy import func

        query = select(AssetAssignment).options(*_LOAD_OPTS)
        count_query = select(func.count(AssetAssignment.id))

        if asset_id:
            query = query.where(AssetAssignment.asset_id == asset_id)
            count_query = count_query.where(AssetAssignment.asset_id == asset_id)
        if assigned_to_id:
            query = query.where(AssetAssignment.assigned_to_id == assigned_to_id)
            count_query = count_query.where(AssetAssignment.assigned_to_id == assigned_to_id)
        if active_only:
            query = query.where(AssetAssignment.returned_at.is_(None))
            count_query = count_query.where(AssetAssignment.returned_at.is_(None))

        total = (await self.db.execute(count_query)).scalar_one()
        query = query.order_by(AssetAssignment.assigned_at.desc()).offset(offset).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all(), total

    async def get_by_id(self, assignment_id: UUID) -> AssetAssignment:
        return await self._get_or_raise(assignment_id)

    async def get_my_assets(
        self, user_id: UUID, active_only: bool = True
    ) -> Sequence[AssetAssignment]:
        query = (
            select(AssetAssignment)
            .options(*_LOAD_OPTS)
            .where(AssetAssignment.assigned_to_id == user_id)
        )
        if active_only:
            query = query.where(AssetAssignment.returned_at.is_(None))
        query = query.order_by(AssetAssignment.assigned_at.desc())
        result = await self.db.execute(query)
        return result.scalars().all()

    # ── Helpers ───────────────────────────────────────────────

    async def _load(self, assignment_id: UUID) -> AssetAssignment:
        result = await self.db.execute(
            select(AssetAssignment)
            .options(*_LOAD_OPTS)
            .where(AssetAssignment.id == assignment_id)
        )
        return result.scalar_one_or_none()

    async def _get_or_raise(self, assignment_id: UUID) -> AssetAssignment:
        assignment = await self._load(assignment_id)
        if not assignment:
            raise NotFoundException(detail=f"Assignment '{assignment_id}' not found")
        return assignment