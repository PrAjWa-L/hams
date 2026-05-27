from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.schemas.user import UserBrief


class AssetRequirementItem(BaseModel):
    category: str = Field(..., min_length=2, max_length=100)
    domain: str = Field(..., description="IT or FACILITY")
    quantity: int = Field(default=1, ge=1, le=20)
    notes: Optional[str] = Field(None, max_length=255)


class OnboardingCreateRequest(BaseModel):
    # New joiner details — filled in by HR, no system account needed
    employee_name: str = Field(..., min_length=2, max_length=150)
    employee_emp_id: str = Field(..., min_length=1, max_length=50)
    employee_email: EmailStr
    employee_phone: Optional[str] = Field(None, max_length=30)
    employee_designation: Optional[str] = Field(None, max_length=100)
    employee_department: Optional[str] = Field(None, max_length=100)

    join_date: Optional[datetime] = None
    asset_requirements: List[AssetRequirementItem] = Field(
        ..., min_length=1, description="At least one asset requirement"
    )
    notes: Optional[str] = Field(None, max_length=500)


class OnboardingApproveRequest(BaseModel):
    notes: Optional[str] = Field(None, max_length=500)


class OnboardingRejectRequest(BaseModel):
    rejection_reason: str = Field(..., min_length=5, max_length=500)


class OnboardingResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID

    # New joiner details
    employee_name: str
    employee_emp_id: str
    employee_email: str
    employee_phone: Optional[str] = None
    employee_designation: Optional[str] = None
    employee_department: Optional[str] = None

    # Workflow actors
    requested_by: UserBrief
    approved_by: Optional[UserBrief] = None

    status: str
    asset_requirements: List[Dict[str, Any]]
    join_date: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime