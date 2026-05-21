from __future__ import annotations

from typing import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, NotFoundException
from app.models.department import Department
from app.schemas.department import DepartmentCreateRequest, DepartmentUpdateRequest
from app.services.audit_service import AuditService
from app.services.base_repository import BaseRepository


class DepartmentService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = BaseRepository(Department, db)
        self.audit = AuditService(db)

    async def create(self, data: DepartmentCreateRequest, actor_id: UUID) -> Department:
        exists = await self.db.execute(
            select(Department.id).where(Department.name == data.name)
        )
        if exists.scalar_one_or_none():
            raise ConflictException(detail=f"Department '{data.name}' already exists")

        dept = Department(**data.model_dump())
        self.db.add(dept)
        await self.db.flush()
        await self.db.refresh(dept)

        await self.audit.log(
            actor_id=actor_id,
            entity_type="department",
            entity_id=dept.id,
            action="create",
            after_state={"name": dept.name},
        )
        return dept

    async def list_all(self, active_only: bool = True) -> Sequence[Department]:
        query = select(Department)
        if active_only:
            query = query.where(Department.is_active == True)  # noqa: E712
        query = query.order_by(Department.name)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_by_id(self, dept_id: UUID) -> Department:
        dept = await self.repo.get(dept_id)
        if not dept:
            raise NotFoundException(detail=f"Department '{dept_id}' not found")
        return dept

    async def update(
        self, dept_id: UUID, data: DepartmentUpdateRequest, actor_id: UUID
    ) -> Department:
        dept = await self.get_by_id(dept_id)
        before = dept.to_dict()
        update_data = data.model_dump(exclude_none=True)
        for k, v in update_data.items():
            setattr(dept, k, v)
        self.db.add(dept)
        await self.db.flush()
        await self.db.refresh(dept)
        await self.audit.log(
            actor_id=actor_id,
            entity_type="department",
            entity_id=dept.id,
            action="update",
            before_state=before,
            after_state=dept.to_dict(),
        )
        return dept
