from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import AuditableBase

if TYPE_CHECKING:
    from app.models.asset import Asset
    from app.models.user import User


class AssetAssignment(AuditableBase):
    __tablename__ = "asset_assignments"

    asset_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    assigned_to_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    assigned_by_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    returned_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Onboarding request reference (optional — direct allocations won't have this)
    onboarding_request_id: Mapped[Optional[UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("onboarding_requests.id", ondelete="SET NULL"),
        nullable=True,
    )

    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    return_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Relationships ─────────────────────────────────────────
    asset: Mapped["Asset"] = relationship("Asset", back_populates="assignments")
    assigned_to: Mapped["User"] = relationship(
        "User", foreign_keys=[assigned_to_id], back_populates="asset_assignments"
    )
    assigned_by: Mapped["User"] = relationship(
        "User", foreign_keys=[assigned_by_id], back_populates="assignments_made"
    )

    @property
    def is_active(self) -> bool:
        return self.returned_at is None

    @property
    def is_acknowledged(self) -> bool:
        return self.acknowledged_at is not None

    def __repr__(self) -> str:
        return f"<AssetAssignment asset={self.asset_id} user={self.assigned_to_id}>"
