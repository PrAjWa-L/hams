from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    ForeignKey,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import AuditableBase, SoftDeleteMixin

if TYPE_CHECKING:
    from app.models.asset_assignment import AssetAssignment
    from app.models.asset_category import AssetCategory
    from app.models.audit_log import AuditLog
    from app.models.department import Department
    from app.models.document import Document
    from app.models.maintenance_record import MaintenanceRecord
    from app.models.vendor import Vendor

ASSET_STATUSES = ("available", "assigned", "under_maintenance", "retired", "disposed")


class Asset(AuditableBase, SoftDeleteMixin):
    __tablename__ = "assets"
    __table_args__ = (
        UniqueConstraint("asset_id", name="uq_asset_asset_id"),
        UniqueConstraint("serial_number", name="uq_asset_serial_number"),
        CheckConstraint(
            f"status IN {ASSET_STATUSES}",
            name="ck_asset_status",
        ),
    )

    # ── Identity ──────────────────────────────────────────────
    asset_id: Mapped[str] = mapped_column(String(30), nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    brand: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    model: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    serial_number: Mapped[Optional[str]] = mapped_column(String(150), nullable=True, unique=True, index=True)
    barcode: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    qr_code_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    label: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # ── IT device specs ───────────────────────────────────────
    hostname: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    ram: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    hdd: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    processor: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    generation: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    mac_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    os_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    os_activated: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    ms_office: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    ms_office_activated: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    antivirus: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    admin_login: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)

    # ── Purchase & cost ───────────────────────────────────────
    purchase_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    purchase_cost: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    po_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    po_tool_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # ── Warranty ──────────────────────────────────────────────
    warranty_start: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    warranty_end: Mapped[Optional[date]] = mapped_column(Date, nullable=True, index=True)

    # ── AMC ───────────────────────────────────────────────────
    amc_vendor: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    amc_start: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    amc_end: Mapped[Optional[date]] = mapped_column(Date, nullable=True, index=True)
    amc_cost: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    last_service_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    next_service_due: Mapped[Optional[date]] = mapped_column(Date, nullable=True, index=True)   

    # ── Location ──────────────────────────────────────────────
    floor: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    location_notes: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # ── Status & assignment ───────────────────────────────────
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="available", index=True)
    is_shared: Mapped[bool] = mapped_column(default=False, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Foreign keys ──────────────────────────────────────────
    category_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("asset_categories.id", ondelete="RESTRICT"),
        nullable=False, index=True,
    )
    department_id: Mapped[Optional[UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )
    vendor_id: Mapped[Optional[UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("vendors.id", ondelete="SET NULL"),
        nullable=True,
    )
    parent_asset_id: Mapped[Optional[UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("assets.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )

    # ── Relationships ─────────────────────────────────────────
    category: Mapped["AssetCategory"] = relationship("AssetCategory", back_populates="assets")
    department: Mapped[Optional["Department"]] = relationship("Department")
    vendor: Mapped[Optional["Vendor"]] = relationship("Vendor", back_populates="assets")
    linked_assets: Mapped[List["Asset"]] = relationship(
        "Asset", foreign_keys="[Asset.parent_asset_id]", back_populates="parent_asset"
    )
    parent_asset: Mapped[Optional["Asset"]] = relationship(
        "Asset", foreign_keys="[Asset.parent_asset_id]", back_populates="linked_assets",
        remote_side="Asset.id"
    )
    assignments: Mapped[List["AssetAssignment"]] = relationship(
        "AssetAssignment", back_populates="asset",
        order_by="AssetAssignment.assigned_at.desc()"
    )
    maintenance_records: Mapped[List["MaintenanceRecord"]] = relationship(
        "MaintenanceRecord", back_populates="asset",
        order_by="MaintenanceRecord.performed_at.desc()"
    )
    documents: Mapped[List["Document"]] = relationship(
        "Document",
        primaryjoin="and_(Document.entity_type=='asset', foreign(Document.entity_id)==Asset.id)",
        viewonly=True,
    )
    audit_logs: Mapped[List["AuditLog"]] = relationship(
        "AuditLog",
        primaryjoin="and_(AuditLog.entity_type=='asset', foreign(AuditLog.entity_id)==Asset.id)",
        viewonly=True,
    )

    def __repr__(self) -> str:
        return f"<Asset {self.asset_id} {self.name}>"