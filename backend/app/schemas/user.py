from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


# ── Request schemas ───────────────────────────────────────────

class UserCreateRequest(BaseModel):
    emp_id: str = Field(..., min_length=2, max_length=50)
    full_name: str = Field(..., min_length=2, max_length=150)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    role: str = Field(..., description="hr | coo | it_head | it_team | management | employee")
    designation: Optional[str] = Field(None, max_length=120)
    department_id: Optional[UUID] = None
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        from app.core.rbac import Role
        valid = {r.value for r in Role}
        if v not in valid:
            raise ValueError(f"role must be one of: {', '.join(valid)}")
        return v


class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=150)
    phone: Optional[str] = Field(None, max_length=20)
    designation: Optional[str] = Field(None, max_length=120)
    department_id: Optional[UUID] = None
    is_active: Optional[bool] = None


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)


# ── Response schemas ──────────────────────────────────────────

class DepartmentBrief(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    name: str
    floor: Optional[str] = None


class UserResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    emp_id: str
    full_name: str
    email: str
    phone: Optional[str] = None
    role: str
    designation: Optional[str] = None
    is_active: bool
    must_change_password: bool
    department: Optional[DepartmentBrief] = None
    created_at: datetime
    updated_at: datetime


class UserBrief(BaseModel):
    """Lightweight reference used inside other responses."""
    model_config = {"from_attributes": True}

    id: UUID
    emp_id: str
    full_name: str
    email: str
    role: str
