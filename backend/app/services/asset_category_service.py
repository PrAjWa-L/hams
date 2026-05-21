from __future__ import annotations

from typing import Optional, Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, NotFoundException
from app.models.asset_category import AssetCategory
from app.schemas.asset_category import AssetCategoryCreateRequest, AssetCategoryUpdateRequest
from app.services.audit_service import AuditService
from app.services.base_repository import BaseRepository


class AssetCategoryService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = BaseRepository(AssetCategory, db)
        self.audit = AuditService(db)

    async def create(
        self, data: AssetCategoryCreateRequest, actor_id: UUID
    ) -> AssetCategory:
        exists = await self.db.execute(
            select(AssetCategory.id).where(AssetCategory.name == data.name)
        )
        if exists.scalar_one_or_none():
            raise ConflictException(detail=f"Category '{data.name}' already exists")

        cat = AssetCategory(**data.model_dump())
        self.db.add(cat)
        await self.db.flush()
        await self.db.refresh(cat)
        await self.audit.log(
            actor_id=actor_id,
            entity_type="asset_category",
            entity_id=cat.id,
            action="create",
            after_state={"name": cat.name, "domain": cat.domain},
        )
        return cat

    async def get_by_id(self, cat_id: UUID) -> AssetCategory:
        cat = await self.repo.get(cat_id)
        if not cat:
            raise NotFoundException(detail=f"Category '{cat_id}' not found")
        return cat

    async def list_all(
        self,
        *,
        domain: Optional[str] = None,
        active_only: bool = True,
    ) -> Sequence[AssetCategory]:
        filters = []
        if active_only:
            filters.append(AssetCategory.is_active == True)  # noqa: E712
        if domain:
            filters.append(AssetCategory.domain == domain.upper())

        items, _ = await self.repo.list(
            offset=0, limit=200, filters=filters, order_by=AssetCategory.name
        )
        return items

    async def update(
        self, cat_id: UUID, data: AssetCategoryUpdateRequest, actor_id: UUID
    ) -> AssetCategory:
        cat = await self.get_by_id(cat_id)
        before = cat.to_dict()
        for k, v in data.model_dump(exclude_none=True).items():
            setattr(cat, k, v)
        self.db.add(cat)
        await self.db.flush()
        await self.db.refresh(cat)
        await self.audit.log(
            actor_id=actor_id,
            entity_type="asset_category",
            entity_id=cat.id,
            action="update",
            before_state=before,
            after_state=cat.to_dict(),
        )
        return cat
