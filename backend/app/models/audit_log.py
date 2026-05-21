from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, Optional
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.user import User


class AuditLog(Base, UUIDPrimaryKeyMixin):
    """
    Immutable append-only table. Never update or delete rows.
    No updated_at — inserts only.
    """
    __tablename__ = "audit_logs"

    actor_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # e.g. "asset", "user", "assignment", "onboarding_request"
    entity_type: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    entity_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True, index=True
    )
    # e.g. "create", "update", "delete", "assign", "retire", "login", "logout"
    action: Mapped[str] = mapped_column(String(60), nullable=False, index=True)

    before_state: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    after_state: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)

    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    # ── Relationships ─────────────────────────────────────────
    actor: Mapped[Optional["User"]] = relationship("User", back_populates="audit_logs")

    def __repr__(self) -> str:
        return f"<AuditLog {self.action} on {self.entity_type}:{self.entity_id}>"
