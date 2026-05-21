from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class DepartmentCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    floor: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=255)
    parent_id: Optional[UUID] = None


class DepartmentUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=120)
    floor: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=255)
    parent_id: Optional[UUID] = None
    is_active: Optional[bool] = None


class DepartmentResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    name: str
    floor: Optional[str] = None
    description: Optional[str] = None
    is_active: bool
    parent_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    
class DepartmentBrief(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    name: str
    floor: Optional[str] = None