from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.asset import AssetListItem
from app.schemas.user import UserBrief


class AssignmentCreateRequest(BaseModel):
    asset_id: UUID
    assigned_to_id: UUID
    onboarding_request_id: Optional[UUID] = None
    notes: Optional[str] = Field(None, max_length=500)


class AssignmentReturnRequest(BaseModel):
    return_notes: Optional[str] = Field(None, max_length=500)


class AssignmentResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    asset: AssetListItem
    assigned_to: UserBrief
    assigned_by: UserBrief
    assigned_at: datetime
    acknowledged_at: Optional[datetime] = None
    returned_at: Optional[datetime] = None
    notes: Optional[str] = None
    return_notes: Optional[str] = None
    is_active: bool
    is_acknowledged: bool
    created_at: datetime


class AssignmentBrief(BaseModel):
    """Lightweight version for asset detail view."""
    model_config = {"from_attributes": True}

    id: UUID
    assigned_to: UserBrief
    assigned_at: datetime
    acknowledged_at: Optional[datetime] = None
    returned_at: Optional[datetime] = None
    is_active: bool
