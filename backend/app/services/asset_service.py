from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional, Sequence
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import (
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
)
from app.core.logging import get_logger
from app.core.rbac import AssetDomain, Role, get_allowed_domains
from app.models.asset import Asset
from app.models.asset_category import AssetCategory
from app.schemas.asset import (
    AssetCreateRequest,
    AssetRetireRequest,
    AssetTransferRequest,
    AssetUpdateRequest,
    ImportRowResult,
    ImportSummary,
)
from app.services.audit_service import AuditService
from app.services.base_repository import BaseRepository
from app.utils.asset_id import generate_asset_id
from app.utils.qr import generate_and_upload_qr

logger = get_logger(__name__)

_LOAD_OPTS = [
    selectinload(Asset.category),
    selectinload(Asset.department),
    selectinload(Asset.vendor),
    selectinload(Asset.linked_assets).selectinload(Asset.category),
    selectinload(Asset.parent_asset).selectinload(Asset.category),
]


class AssetService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = BaseRepository(Asset, db)
        self.audit = AuditService(db)

    # ── Domain scoping helper ─────────────────────────────────

    def _domain_filters(self, role: str) -> list:
        allowed = get_allowed_domains(Role(role))
        if allowed == AssetDomain.ALL:
            return []
        # Join to asset_categories to filter by domain
        return [AssetCategory.domain == allowed.value]

    # ── Create ────────────────────────────────────────────────

    async def create(
        self,
        data: AssetCreateRequest,
        actor_id: UUID,
        actor_role: str,
    ) -> Asset:
        # Resolve category — by ID if provided, else by name
        cat = None
        if data.category_id:
            cat_result = await self.db.execute(
                select(AssetCategory).where(AssetCategory.id == data.category_id)
            )
            cat = cat_result.scalar_one_or_none()
        elif data.category_name:
            cat_result = await self.db.execute(
                select(AssetCategory).where(
                    AssetCategory.name.ilike(data.category_name)
                )
            )
            cat = cat_result.scalar_one_or_none()
            if not cat:
                # Create a new category on the fly
                domain = data.domain or 'IT'
                cat = AssetCategory(name=data.category_name, domain=domain)
                self.db.add(cat)
                await self.db.flush()

        if not cat:
            raise NotFoundException(detail="Asset category not found — provide category_id or category_name")

        self._check_domain_access(actor_role, cat.domain)

        if data.serial_number:
            dup = await self.db.execute(
                select(Asset.id).where(
                    Asset.serial_number == data.serial_number,
                    Asset.is_deleted == False,  # noqa: E712
                )
            )
            if dup.scalar_one_or_none():
                raise ConflictException(
                    detail=f"Serial number '{data.serial_number}' already registered"
                )

        asset_id = await generate_asset_id(self.db, cat.domain)

        asset = Asset(
            asset_id=asset_id,
            category_id=cat.id,
            **data.model_dump(exclude={'category_id', 'category_name', 'domain'}),
        )
        self.db.add(asset)
        await self.db.flush()

        # Generate QR code (non-blocking — failure doesn't abort creation)
        qr_path = generate_and_upload_qr(asset_id, str(asset.id))
        if qr_path:
            asset.qr_code_url = qr_path
            self.db.add(asset)
            await self.db.flush()

        await self.db.refresh(asset)

        await self.audit.log(
            actor_id=actor_id,
            entity_type="asset",
            entity_id=asset.id,
            action="create",
            after_state={"asset_id": asset_id, "name": asset.name, "status": asset.status},
        )
        logger.info("asset_created", asset_id=asset_id, name=asset.name)

        return await self._load(asset.id)

    # ── Read ──────────────────────────────────────────────────

    async def get_by_id(self, asset_id: UUID, actor_role: str) -> Asset:
        asset = await self._load(asset_id)
        if not asset or asset.is_deleted:
            raise NotFoundException(detail=f"Asset '{asset_id}' not found")
        self._check_domain_access(actor_role, asset.category.domain)
        return asset

    async def get_by_asset_code(self, asset_code: str, actor_role: str) -> Asset:
        result = await self.db.execute(
            select(Asset)
            .options(*_LOAD_OPTS)
            .where(Asset.asset_id == asset_code, Asset.is_deleted == False)  # noqa: E712
        )
        asset = result.scalar_one_or_none()
        if not asset:
            raise NotFoundException(detail=f"Asset '{asset_code}' not found")
        self._check_domain_access(actor_role, asset.category.domain)
        return asset

    async def list_assets(
        self,
        *,
        actor_role: str,
        offset: int = 0,
        limit: int = 20,
        category_id: Optional[UUID] = None,
        department_id: Optional[UUID] = None,
        status: Optional[str] = None,
        domain: Optional[str] = None,
        floor: Optional[str] = None,
        search: Optional[str] = None,
        warranty_expiring_days: Optional[int] = None,
    ) -> tuple[Sequence[Asset], int]:
        from sqlalchemy import func
        from datetime import timedelta, date

        # Base query with join for domain scoping
        query = (
            select(Asset)
            .join(AssetCategory, Asset.category_id == AssetCategory.id)
            .options(*_LOAD_OPTS)
            .where(Asset.is_deleted == False)  # noqa: E712
        )
        count_query = (
            select(func.count(Asset.id))
            .join(AssetCategory, Asset.category_id == AssetCategory.id)
            .where(Asset.is_deleted == False)  # noqa: E712
        )

        # Domain scoping
        allowed = get_allowed_domains(Role(actor_role))
        if allowed != AssetDomain.ALL:
            query = query.where(AssetCategory.domain == allowed.value)
            count_query = count_query.where(AssetCategory.domain == allowed.value)

        # Additional filters
        if domain:
            query = query.where(AssetCategory.domain == domain.upper())
            count_query = count_query.where(AssetCategory.domain == domain.upper())
        if category_id:
            query = query.where(Asset.category_id == category_id)
            count_query = count_query.where(Asset.category_id == category_id)
        if department_id:
            query = query.where(Asset.department_id == department_id)
            count_query = count_query.where(Asset.department_id == department_id)
        if status:
            query = query.where(Asset.status == status)
            count_query = count_query.where(Asset.status == status)
        if floor:
            query = query.where(Asset.floor.ilike(f"%{floor}%"))
            count_query = count_query.where(Asset.floor.ilike(f"%{floor}%"))
        if search:
            term = f"%{search}%"
            search_filter = or_(
                Asset.name.ilike(term),
                Asset.asset_id.ilike(term),
                Asset.serial_number.ilike(term),
                Asset.brand.ilike(term),
                Asset.model.ilike(term),
            )
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)
        if warranty_expiring_days is not None:
            cutoff = date.today() + timedelta(days=warranty_expiring_days)
            query = query.where(Asset.warranty_end <= cutoff, Asset.warranty_end >= date.today())
            count_query = count_query.where(Asset.warranty_end <= cutoff, Asset.warranty_end >= date.today())

        total_result = await self.db.execute(count_query)
        total = total_result.scalar_one()

        query = query.order_by(Asset.created_at.desc()).offset(offset).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all(), total

    # ── Update ────────────────────────────────────────────────

    async def update(
        self, asset_id: UUID, data: AssetUpdateRequest, actor_id: UUID, actor_role: str
    ) -> Asset:
        asset = await self.get_by_id(asset_id, actor_role)
        before = asset.to_dict()

        for k, v in data.model_dump(exclude_none=True).items():
            setattr(asset, k, v)
        self.db.add(asset)
        await self.db.flush()

        await self.audit.log(
            actor_id=actor_id,
            entity_type="asset",
            entity_id=asset.id,
            action="update",
            before_state=before,
            after_state=asset.to_dict(),
        )
        return await self._load(asset.id)

    # ── Retire ────────────────────────────────────────────────

    async def retire(
        self,
        asset_id: UUID,
        data: AssetRetireRequest,
        actor_id: UUID,
        actor_role: str,
    ) -> Asset:
        asset = await self.get_by_id(asset_id, actor_role)

        if asset.status in ("retired", "disposed"):
            raise BadRequestException(detail=f"Asset is already {asset.status}")

        before = {"status": asset.status}
        asset.status = "retired"
        asset.notes = (asset.notes or "") + f"\n[RETIRED] {data.reason}"
        if data.disposal_method:
            asset.notes += f" | Disposal: {data.disposal_method}"

        self.db.add(asset)
        await self.db.flush()

        await self.audit.log(
            actor_id=actor_id,
            entity_type="asset",
            entity_id=asset.id,
            action="retire",
            before_state=before,
            after_state={"status": "retired", "reason": data.reason},
        )
        logger.info("asset_retired", asset_id=str(asset_id))
        return await self._load(asset.id)

    # ── Transfer ──────────────────────────────────────────────

    async def transfer(
        self,
        asset_id: UUID,
        data: AssetTransferRequest,
        actor_id: UUID,
        actor_role: str,
    ) -> Asset:
        asset = await self.get_by_id(asset_id, actor_role)

        if asset.status == "retired":
            raise BadRequestException(detail="Cannot transfer a retired asset")

        before = {
            "department_id": str(asset.department_id) if asset.department_id else None,
            "floor": asset.floor,
        }
        asset.department_id = data.to_department_id
        if data.floor:
            asset.floor = data.floor

        self.db.add(asset)
        await self.db.flush()

        await self.audit.log(
            actor_id=actor_id,
            entity_type="asset",
            entity_id=asset.id,
            action="transfer",
            before_state=before,
            after_state={
                "department_id": str(data.to_department_id),
                "reason": data.reason,
            },
        )
        logger.info("asset_transferred", asset_id=str(asset_id))
        return await self._load(asset.id)

    # ── CSV Import ────────────────────────────────────────────

    @staticmethod
    def _csv_clean_name(raw: str) -> str:
        import re
        return re.sub(r"\(null\)\s*$", "", str(raw)).strip()

    @staticmethod
    def _csv_parse_storage(val) -> Optional[str]:
        import re
        if not val or str(val).strip().lower() in ("", "nan"):
            return None
        m = re.search(r"Capacity:([\d.]+\s*GB)", str(val))
        return m.group(1).strip() if m else str(val)[:100]

    @staticmethod
    def _csv_parse_serial(val) -> Optional[str]:
        if not val or str(val).strip().lower() in ("", "nan", "n/a"):
            return None
        return str(val).strip()

    async def import_csv(
        self,
        content: bytes,
        actor_id: UUID,
        actor_role: str,
    ) -> ImportSummary:
        import io
        import pandas as pd

        try:
            df = pd.read_csv(io.StringIO(content.decode("utf-8", errors="replace")))
        except Exception as exc:
            raise BadRequestException(detail=f"Could not parse CSV: {exc}")

        required_cols = {"Endpoint Name", "IP Address", "Manufacturer", "Model"}
        missing = required_cols - set(df.columns)
        if missing:
            raise BadRequestException(detail=f"CSV is missing columns: {missing}")

        # Resolve default IT category
        cat_result = await self.db.execute(
            select(AssetCategory).where(AssetCategory.domain == "IT").limit(1)
        )
        default_category = cat_result.scalar_one_or_none()
        if not default_category:
            raise BadRequestException(
                detail="No IT asset category found. Please create one before importing."
            )

        results: list[ImportRowResult] = []
        created = skipped = errors = 0

        for idx, row in df.iterrows():
            row_num = int(idx) + 2  # 1-based + header
            name = self._csv_clean_name(row.get("Endpoint Name", "")) or f"Imported-{row_num}"
            serial = self._csv_parse_serial(row.get("BIOS Serial Number"))

            # Dedup by serial
            if serial:
                dup = await self.db.execute(
                    select(Asset.id).where(
                        Asset.serial_number == serial,
                        Asset.is_deleted == False,  # noqa: E712
                    )
                )
                if dup.scalar_one_or_none():
                    skipped += 1
                    results.append(ImportRowResult(
                        row=row_num, endpoint_name=name, status="skipped",
                        reason=f"Serial {serial} already exists",
                    ))
                    continue

            # Dedup by hostname
            dup_host = await self.db.execute(
                select(Asset.id).where(
                    Asset.hostname == name,
                    Asset.is_deleted == False,  # noqa: E712
                )
            )
            if dup_host.scalar_one_or_none():
                skipped += 1
                results.append(ImportRowResult(
                    row=row_num, endpoint_name=name, status="skipped",
                    reason=f"Hostname '{name}' already exists",
                ))
                continue

            def _str(col: str) -> Optional[str]:
                v = row.get(col)
                return str(v).strip() if v and str(v).strip().lower() not in ("", "nan") else None

            av = _str("Product Name")
            av_ver = _str("Product Version")
            antivirus = f"{av} {av_ver}".strip() if av and av_ver else av

            notes_parts = [
                f"Last logged-in user: {u}" for u in [_str("User Name")] if u
            ] + [
                f"OS Version: {v}" for v in [_str("OS Version")] if v
            ] + [
                f"Last connected: {c}" for c in [_str("Last Connected On")] if c
            ]

            payload = AssetCreateRequest(
                name=name,
                category_id=default_category.id,
                brand=_str("Manufacturer"),
                model=_str("Model"),
                serial_number=serial,
                hostname=name,
                ip_address=_str("IP Address"),
                mac_address=_str("MAC Address 1"),
                os_name=_str("OS Name"),
                ram=_str("Physical Memory"),
                hdd=self._csv_parse_storage(row.get("Storage")),
                processor=_str("Processor Name"),
                antivirus=antivirus,
                label=_str("Group"),
                notes="\n".join(notes_parts) or None,
            )

            try:
                asset = await self.create(payload, actor_id=actor_id, actor_role=actor_role)
                created += 1
                results.append(ImportRowResult(
                    row=row_num, endpoint_name=name,
                    status="created", asset_id=asset.asset_id,
                ))
            except Exception as exc:
                errors += 1
                results.append(ImportRowResult(
                    row=row_num, endpoint_name=name,
                    status="error", reason=str(exc),
                ))

        return ImportSummary(
            total=len(df),
            created=created,
            skipped=skipped,
            errors=errors,
            results=results,
        )

    # ── Helpers ───────────────────────────────────────────────

    async def _load(self, asset_id: UUID) -> Asset:
        result = await self.db.execute(
            select(Asset).options(*_LOAD_OPTS).where(Asset.id == asset_id)
        )
        return result.scalar_one_or_none()

    def _check_domain_access(self, role: str, domain: str) -> None:
        allowed = get_allowed_domains(Role(role))
        if allowed == AssetDomain.ALL:
            return
        if allowed.value != domain:
            raise ForbiddenException(
                detail=f"Your role only has access to {allowed.value} assets"
            )