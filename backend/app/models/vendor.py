from __future__ import annotations

from typing import TYPE_CHECKING, List, Optional

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String

from app.db.base import AuditableBase, SoftDeleteMixin

if TYPE_CHECKING:
    from app.models.asset import Asset


class Vendor(AuditableBase, SoftDeleteMixin):
    __tablename__ = "vendors"

    name: Mapped[str] = mapped_column(String(150), nullable=False, unique=True)
    contact_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    gst_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    # ── Relationships ─────────────────────────────────────────
    assets: Mapped[List["Asset"]] = relationship("Asset", back_populates="vendor")

    def __repr__(self) -> str:
        return f"<Vendor {self.name}>"
