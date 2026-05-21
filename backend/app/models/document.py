from __future__ import annotations

from typing import TYPE_CHECKING, Optional
from uuid import UUID

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import AuditableBase

if TYPE_CHECKING:
    from app.models.user import User

DOCUMENT_TYPES = (
    "invoice",
    "warranty_card",
    "amc_contract",
    "photo",
    "manual",
    "other",
)


class Document(AuditableBase):
    __tablename__ = "documents"

    # Polymorphic entity reference
    entity_type: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    entity_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), nullable=False, index=True
    )

    doc_type: Mapped[str] = mapped_column(String(50), nullable=False, default="other")
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    file_size_bytes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    mime_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    uploaded_by_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    # ── Relationships ─────────────────────────────────────────
    uploaded_by: Mapped["User"] = relationship("User", back_populates="documents")

    def __repr__(self) -> str:
        return f"<Document {self.filename} for {self.entity_type}:{self.entity_id}>"
