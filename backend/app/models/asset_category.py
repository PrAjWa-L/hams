from __future__ import annotations

from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import CheckConstraint, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import AuditableBase

if TYPE_CHECKING:
    from app.models.asset import Asset


class AssetCategory(AuditableBase):
    __tablename__ = "asset_categories"
    __table_args__ = (
        CheckConstraint("domain IN ('IT','FACILITY')", name="ck_asset_category_domain"),
    )

    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    # IT | FACILITY — drives RBAC domain scoping on every asset
    domain: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    icon: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    # ── Relationships ─────────────────────────────────────────
    assets: Mapped[List["Asset"]] = relationship("Asset", back_populates="category")

    def __repr__(self) -> str:
        return f"<AssetCategory {self.name} ({self.domain})>"
