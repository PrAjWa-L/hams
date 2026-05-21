from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class VendorCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    contact_name: Optional[str] = Field(None, max_length=150)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = Field(None, max_length=500)
    gst_number: Optional[str] = Field(None, max_length=50)
    website: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = Field(None, max_length=500)


class VendorUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    contact_name: Optional[str] = Field(None, max_length=150)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = Field(None, max_length=500)
    gst_number: Optional[str] = Field(None, max_length=50)
    website: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None


class VendorResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    name: str
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    gst_number: Optional[str] = None
    website: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class VendorBrief(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
