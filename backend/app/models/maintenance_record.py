from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import AuditableBase

if TYPE_CHECKING:
    from app.models.asset import Asset
    from app.models.user import User

WORK_TYPES = ("preventive", "corrective", "amc", "inspection", "upgrade")


class MaintenanceRecord(AuditableBase):
    __tablename__ = "maintenance_records"
    __table_args__ = (
        CheckConstraint(
            f"work_type IN {WORK_TYPES}",
            name="ck_maintenance_record_work_type",
        ),
    )

    asset_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    logged_by_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    # Reference to external Helpdesk ticket
    helpdesk_ref: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True, index=True
    )

    work_type: Mapped[str] = mapped_column(String(30), nullable=False)
    performed_by: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    performed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    cost: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    next_due_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )

    # ── Relationships ─────────────────────────────────────────
    asset: Mapped["Asset"] = relationship("Asset", back_populates="maintenance_records")
    logged_by: Mapped["User"] = relationship(
        "User", back_populates="maintenance_records_logged"
    )

    def __repr__(self) -> str:
        return f"<MaintenanceRecord {self.work_type} asset={self.asset_id}>"
