from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class AssetCategoryCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    domain: str = Field(..., description="IT or FACILITY")
    icon: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=255)

    @field_validator("domain")
    @classmethod
    def validate_domain(cls, v: str) -> str:
        v = v.upper()
        if v not in ("IT", "FACILITY"):
            raise ValueError("domain must be IT or FACILITY")
        return v


class AssetCategoryUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    icon: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=255)
    is_active: Optional[bool] = None


class AssetCategoryResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    name: str
    domain: str
    icon: Optional[str] = None
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class AssetCategoryBrief(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    name: str
    domain: str
    icon: Optional[str] = None
