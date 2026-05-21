from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, Optional

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import AuditableBase

if TYPE_CHECKING:
    from app.models.user import User

ONBOARDING_STATUSES = (
    "draft",
    "pending_approval",
    "approved",
    "rejected",
    "in_progress",
    "completed",
)


class OnboardingRequest(AuditableBase):
    __tablename__ = "onboarding_requests"
    __table_args__ = (
        CheckConstraint(
            f"status IN {ONBOARDING_STATUSES}",
            name="ck_onboarding_status",
        ),
    )

    # The new employee this request is for
    employee_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    # HR who raised the request
    requested_by_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    # COO who approved/rejected
    approved_by_id: Mapped[Optional[UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="draft", index=True
    )

    # JSON list of asset requirements
    # e.g. [{"category": "Laptop", "domain": "IT", "quantity": 1, "notes": ""}]
    asset_requirements: Mapped[Dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=list
    )

    join_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    approved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Relationships ─────────────────────────────────────────
    employee: Mapped["User"] = relationship(
        "User",
        foreign_keys=[employee_id],
        back_populates="onboarding_requests_for",
    )
    requested_by: Mapped["User"] = relationship(
        "User",
        foreign_keys=[requested_by_id],
        back_populates="onboarding_requests_raised",
    )
    approved_by: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[approved_by_id]
    )

    def __repr__(self) -> str:
        return f"<OnboardingRequest employee={self.employee_id} status={self.status}>"
