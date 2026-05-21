from __future__ import annotations

from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.rbac import Role
from app.db.base import AuditableBase, SoftDeleteMixin

if TYPE_CHECKING:
    from app.models.asset_assignment import AssetAssignment
    from app.models.audit_log import AuditLog
    from app.models.department import Department
    from app.models.document import Document
    from app.models.maintenance_record import MaintenanceRecord
    from app.models.onboarding_request import OnboardingRequest


class User(AuditableBase, SoftDeleteMixin):
    __tablename__ = "users"

    emp_id: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(30), nullable=False, default=Role.EMPLOYEE)
    designation: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    must_change_password: Mapped[bool] = mapped_column(default=True, nullable=False)

    department_id: Mapped[Optional[UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # ── Relationships ─────────────────────────────────────────
    department: Mapped[Optional["Department"]] = relationship(
        "Department", back_populates="users"
    )
    asset_assignments: Mapped[List["AssetAssignment"]] = relationship(
        "AssetAssignment",
        foreign_keys="AssetAssignment.assigned_to_id",
        back_populates="assigned_to",
    )
    assignments_made: Mapped[List["AssetAssignment"]] = relationship(
        "AssetAssignment",
        foreign_keys="AssetAssignment.assigned_by_id",
        back_populates="assigned_by",
    )
    maintenance_records_logged: Mapped[List["MaintenanceRecord"]] = relationship(
        "MaintenanceRecord", back_populates="logged_by"
    )
    onboarding_requests_raised: Mapped[List["OnboardingRequest"]] = relationship(
        "OnboardingRequest",
        foreign_keys="OnboardingRequest.requested_by_id",
        back_populates="requested_by",
    )
    onboarding_requests_for: Mapped[List["OnboardingRequest"]] = relationship(
        "OnboardingRequest",
        foreign_keys="OnboardingRequest.employee_id",
        back_populates="employee",
    )
    audit_logs: Mapped[List["AuditLog"]] = relationship("AuditLog", back_populates="actor")
    documents: Mapped[List["Document"]] = relationship("Document", back_populates="uploaded_by")

    def __repr__(self) -> str:
        return f"<User {self.emp_id} {self.email}>"
