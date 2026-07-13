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
    "pending_hr_approval",    # HOD submitted, waiting for HR
    "pending_coo_approval",   # HR approved, waiting for COO
    "approved",               # COO gave final approval → IT fulfils
    "rejected",
    "in_progress",
    "completed",
    # Legacy — map old rows gracefully
    "pending_approval",
)


class OnboardingRequest(AuditableBase):
    __tablename__ = "onboarding_requests"
    __table_args__ = (
        CheckConstraint(
            f"status IN {ONBOARDING_STATUSES}",
            name="ck_onboarding_status",
        ),
    )

    # ── New joiner details (filled by HOD) ───────────────────
    employee_name: Mapped[str] = mapped_column(String(150), nullable=False)
    employee_emp_id: Mapped[str] = mapped_column(String(50), nullable=False)
    employee_email: Mapped[str] = mapped_column(String(150), nullable=False)
    employee_phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    employee_designation: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    employee_department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # ── Workflow actors ───────────────────────────────────────
    # HOD who raised the request
    requested_by_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    # HR who gave stage-1 approval
    hr_approved_by_id: Mapped[Optional[UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    # COO who gave final approval
    approved_by_id: Mapped[Optional[UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="pending_hr_approval", index=True
    )

    # JSON list of asset requirements
    # e.g. [{"category": "Laptop", "domain": "IT", "quantity": 1, "notes": ""}]
    asset_requirements: Mapped[Dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=list
    )

    join_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    hr_approved_at: Mapped[Optional[datetime]] = mapped_column(
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
    requested_by: Mapped["User"] = relationship(
        "User",
        foreign_keys=[requested_by_id],
        back_populates="onboarding_requests_raised",
    )
    hr_approved_by: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[hr_approved_by_id]
    )
    approved_by: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[approved_by_id]
    )

    def __repr__(self) -> str:
        return f"<OnboardingRequest employee={self.employee_emp_id} status={self.status}>"