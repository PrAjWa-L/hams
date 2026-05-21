from __future__ import annotations

from typing import Optional, Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundException
from app.core.logging import get_logger
from app.models.asset import Asset
from app.models.maintenance_record import MaintenanceRecord
from app.schemas.maintenance import MaintenanceCreateRequest, MaintenanceUpdateRequest
from app.services.audit_service import AuditService

logger = get_logger(__name__)

_LOAD_OPTS = [selectinload(MaintenanceRecord.logged_by)]


class MaintenanceService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.audit = AuditService(db)

    async def create(
        self, data: MaintenanceCreateRequest, actor_id: UUID
    ) -> MaintenanceRecord:
        # Verify asset exists
        asset = await self.db.get(Asset, data.asset_id)
        if not asset or asset.is_deleted:
            raise NotFoundException(detail="Asset not found")

        record = MaintenanceRecord(
            asset_id=data.asset_id,
            logged_by_id=actor_id,
            work_type=data.work_type,
            performed_by=data.performed_by,
            performed_at=data.performed_at,
            helpdesk_ref=data.helpdesk_ref,
            cost=data.cost,
            description=data.description,
            next_due_at=data.next_due_at,
        )
        self.db.add(record)

        # If corrective maintenance, mark asset under_maintenance
        if data.work_type == "corrective" and asset.status == "available":
            asset.status = "under_maintenance"
            self.db.add(asset)

        await self.db.flush()
        await self.db.refresh(record)

        await self.audit.log(
            actor_id=actor_id,
            entity_type="asset",
            entity_id=data.asset_id,
            action="maintenance_logged",
            after_state={
                "work_type": data.work_type,
                "helpdesk_ref": data.helpdesk_ref,
                "performed_at": data.performed_at.isoformat(),
            },
        )
        logger.info(
            "maintenance_logged",
            asset_id=str(data.asset_id),
            work_type=data.work_type,
        )
        return await self._load(record.id)

    async def get_by_id(self, record_id: UUID) -> MaintenanceRecord:
        record = await self._load(record_id)
        if not record:
            raise NotFoundException(detail="Maintenance record not found")
        return record

    async def list_for_asset(
        self,
        asset_id: UUID,
        *,
        offset: int = 0,
        limit: int = 20,
        work_type: Optional[str] = None,
    ) -> tuple[Sequence[MaintenanceRecord], int]:
        from sqlalchemy import func

        query = (
            select(MaintenanceRecord)
            .options(*_LOAD_OPTS)
            .where(MaintenanceRecord.asset_id == asset_id)
        )
        count_query = select(func.count(MaintenanceRecord.id)).where(
            MaintenanceRecord.asset_id == asset_id
        )

        if work_type:
            query = query.where(MaintenanceRecord.work_type == work_type)
            count_query = count_query.where(MaintenanceRecord.work_type == work_type)

        total = (await self.db.execute(count_query)).scalar_one()
        query = query.order_by(MaintenanceRecord.performed_at.desc()).offset(offset).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all(), total

    async def list_upcoming(self, days: int = 30) -> Sequence[MaintenanceRecord]:
        from datetime import datetime, timedelta, timezone
        cutoff = datetime.now(timezone.utc) + timedelta(days=days)
        result = await self.db.execute(
            select(MaintenanceRecord)
            .options(*_LOAD_OPTS)
            .where(
                MaintenanceRecord.next_due_at.isnot(None),
                MaintenanceRecord.next_due_at <= cutoff,
            )
            .order_by(MaintenanceRecord.next_due_at)
        )
        return result.scalars().all()

    async def update(
        self, record_id: UUID, data: MaintenanceUpdateRequest, actor_id: UUID
    ) -> MaintenanceRecord:
        record = await self.get_by_id(record_id)
        for k, v in data.model_dump(exclude_none=True).items():
            setattr(record, k, v)
        self.db.add(record)
        await self.db.flush()
        return await self._load(record.id)

    async def _load(self, record_id: UUID) -> Optional[MaintenanceRecord]:
        result = await self.db.execute(
            select(MaintenanceRecord)
            .options(*_LOAD_OPTS)
            .where(MaintenanceRecord.id == record_id)
        )
        return result.scalar_one_or_none()
