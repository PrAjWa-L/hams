from __future__ import annotations

from typing import Optional, Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, NotFoundException
from app.models.vendor import Vendor
from app.schemas.vendor import VendorCreateRequest, VendorUpdateRequest
from app.services.audit_service import AuditService
from app.services.base_repository import BaseRepository


class VendorService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = BaseRepository(Vendor, db)
        self.audit = AuditService(db)

    async def create(self, data: VendorCreateRequest, actor_id: UUID) -> Vendor:
        exists = await self.db.execute(
            select(Vendor.id).where(Vendor.name == data.name, Vendor.is_deleted == False)  # noqa: E712
        )
        if exists.scalar_one_or_none():
            raise ConflictException(detail=f"Vendor '{data.name}' already exists")

        vendor = Vendor(**data.model_dump())
        self.db.add(vendor)
        await self.db.flush()
        await self.db.refresh(vendor)

        await self.audit.log(
            actor_id=actor_id,
            entity_type="vendor",
            entity_id=vendor.id,
            action="create",
            after_state={"name": vendor.name},
        )
        return vendor

    async def get_by_id(self, vendor_id: UUID) -> Vendor:
        vendor = await self.repo.get(vendor_id)
        if not vendor or vendor.is_deleted:
            raise NotFoundException(detail=f"Vendor '{vendor_id}' not found")
        return vendor

    async def list_all(
        self,
        *,
        offset: int = 0,
        limit: int = 20,
        active_only: bool = True,
        search: Optional[str] = None,
    ) -> tuple[Sequence[Vendor], int]:
        filters = [Vendor.is_deleted == False]  # noqa: E712
        if active_only:
            filters.append(Vendor.is_active == True)  # noqa: E712
        if search:
            filters.append(Vendor.name.ilike(f"%{search}%"))
        return await self.repo.list(
            offset=offset, limit=limit, filters=filters, order_by=Vendor.name
        )

    async def update(
        self, vendor_id: UUID, data: VendorUpdateRequest, actor_id: UUID
    ) -> Vendor:
        vendor = await self.get_by_id(vendor_id)
        before = vendor.to_dict()
        for k, v in data.model_dump(exclude_none=True).items():
            setattr(vendor, k, v)
        self.db.add(vendor)
        await self.db.flush()
        await self.db.refresh(vendor)
        await self.audit.log(
            actor_id=actor_id,
            entity_type="vendor",
            entity_id=vendor.id,
            action="update",
            before_state=before,
            after_state=vendor.to_dict(),
        )
        return vendor

    async def delete(self, vendor_id: UUID, actor_id: UUID) -> None:
        vendor = await self.get_by_id(vendor_id)
        await self.repo.soft_delete(vendor)
        await self.audit.log(
            actor_id=actor_id,
            entity_type="vendor",
            entity_id=vendor.id,
            action="delete",
        )
