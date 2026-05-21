from __future__ import annotations

from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import AuditableBase

if TYPE_CHECKING:
    from app.models.user import User


class Department(AuditableBase):
    __tablename__ = "departments"

    name: Mapped[str] = mapped_column(String(120), nullable=False, unique=True)
    floor: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    # Self-referential parent for sub-departments
    parent_id: Mapped[Optional[UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True,
    )

    # ── Relationships ─────────────────────────────────────────
    parent: Mapped[Optional["Department"]] = relationship(
        "Department", remote_side="Department.id", back_populates="children"
    )
    children: Mapped[List["Department"]] = relationship(
        "Department", back_populates="parent"
    )
    users: Mapped[List["User"]] = relationship("User", back_populates="department")

    def __repr__(self) -> str:
        return f"<Department {self.name}>"
