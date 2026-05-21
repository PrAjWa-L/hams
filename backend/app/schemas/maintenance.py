from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.user import UserBrief

WORK_TYPES = ("preventive", "corrective", "amc", "inspection", "upgrade")


class MaintenanceCreateRequest(BaseModel):
    asset_id: UUID
    work_type: str = Field(..., description="preventive | corrective | amc | inspection | upgrade")
    performed_by: Optional[str] = Field(None, max_length=150)
    performed_at: datetime
    helpdesk_ref: Optional[str] = Field(
        None, max_length=100, description="Ticket ID from your Helpdesk tool"
    )
    cost: Optional[Decimal] = Field(None, ge=0)
    description: Optional[str] = None
    next_due_at: Optional[datetime] = None

    class Config:
        use_enum_values = True

    def validate_work_type(cls, v: str) -> str:
        if v not in WORK_TYPES:
            raise ValueError(f"work_type must be one of: {', '.join(WORK_TYPES)}")
        return v


class MaintenanceUpdateRequest(BaseModel):
    performed_by: Optional[str] = Field(None, max_length=150)
    performed_at: Optional[datetime] = None
    helpdesk_ref: Optional[str] = Field(None, max_length=100)
    cost: Optional[Decimal] = Field(None, ge=0)
    description: Optional[str] = None
    next_due_at: Optional[datetime] = None


class MaintenanceResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    asset_id: UUID
    work_type: str
    performed_by: Optional[str] = None
    performed_at: datetime
    helpdesk_ref: Optional[str] = None
    cost: Optional[Decimal] = None
    description: Optional[str] = None
    next_due_at: Optional[datetime] = None
    logged_by: UserBrief
    created_at: datetime
    updated_at: datetime
