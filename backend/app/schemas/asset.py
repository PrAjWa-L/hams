from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.schemas.asset_category import AssetCategoryBrief
from app.schemas.department import DepartmentBrief
from app.schemas.vendor import VendorBrief

VALID_STATUSES = ("available", "assigned", "under_maintenance", "retired", "disposed")


class AssetCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    category_id: UUID
    brand: Optional[str] = Field(None, max_length=100)
    model: Optional[str] = Field(None, max_length=150)
    serial_number: Optional[str] = Field(None, max_length=150)
    barcode: Optional[str] = Field(None, max_length=100)
    purchase_date: Optional[date] = None
    purchase_cost: Optional[Decimal] = Field(None, ge=0)
    po_reference: Optional[str] = Field(None, max_length=100)
    po_tool_url: Optional[str] = Field(None, max_length=500)
    warranty_start: Optional[date] = None
    warranty_end: Optional[date] = None
    amc_vendor: Optional[str] = Field(None, max_length=200)
    amc_start: Optional[date] = None
    amc_end: Optional[date] = None
    amc_cost: Optional[Decimal] = Field(None, ge=0)
    last_service_date: Optional[date] = None
    next_service_due: Optional[date] = None
    floor: Optional[str] = Field(None, max_length=50)
    location_notes: Optional[str] = Field(None, max_length=255)
    department_id: Optional[UUID] = None
    vendor_id: Optional[UUID] = None
    is_shared: bool = False
    notes: Optional[str] = None
    label: Optional[str] = Field(None, max_length=100)
    hostname: Optional[str] = Field(None, max_length=100)
    ram: Optional[str] = Field(None, max_length=50)
    hdd: Optional[str] = Field(None, max_length=100)
    processor: Optional[str] = Field(None, max_length=150)
    generation: Optional[str] = Field(None, max_length=50)
    mac_address: Optional[str] = Field(None, max_length=50)
    ip_address: Optional[str] = Field(None, max_length=50)
    os_name: Optional[str] = Field(None, max_length=100)
    os_activated: Optional[bool] = None
    ms_office: Optional[str] = Field(None, max_length=100)
    ms_office_activated: Optional[bool] = None
    antivirus: Optional[str] = Field(None, max_length=100)
    admin_login: Optional[bool] = None


class AssetUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    brand: Optional[str] = Field(None, max_length=100)
    model: Optional[str] = Field(None, max_length=150)
    serial_number: Optional[str] = Field(None, max_length=150)
    barcode: Optional[str] = Field(None, max_length=100)
    purchase_date: Optional[date] = None
    purchase_cost: Optional[Decimal] = Field(None, ge=0)
    po_reference: Optional[str] = Field(None, max_length=100)
    po_tool_url: Optional[str] = Field(None, max_length=500)
    warranty_start: Optional[date] = None
    warranty_end: Optional[date] = None
    amc_vendor: Optional[str] = Field(None, max_length=200)
    amc_start: Optional[date] = None
    amc_end: Optional[date] = None
    amc_cost: Optional[Decimal] = Field(None, ge=0)
    last_service_date: Optional[date] = None
    next_service_due: Optional[date] = None
    floor: Optional[str] = Field(None, max_length=50)
    location_notes: Optional[str] = Field(None, max_length=255)
    department_id: Optional[UUID] = None
    vendor_id: Optional[UUID] = None
    is_shared: Optional[bool] = None
    notes: Optional[str] = None
    label: Optional[str] = Field(None, max_length=100)
    hostname: Optional[str] = Field(None, max_length=100)
    ram: Optional[str] = Field(None, max_length=50)
    hdd: Optional[str] = Field(None, max_length=100)
    processor: Optional[str] = Field(None, max_length=150)
    generation: Optional[str] = Field(None, max_length=50)
    mac_address: Optional[str] = Field(None, max_length=50)
    ip_address: Optional[str] = Field(None, max_length=50)
    os_name: Optional[str] = Field(None, max_length=100)
    os_activated: Optional[bool] = None
    ms_office: Optional[str] = Field(None, max_length=100)
    ms_office_activated: Optional[bool] = None
    antivirus: Optional[str] = Field(None, max_length=100)
    admin_login: Optional[bool] = None

class AssetRetireRequest(BaseModel):
    reason: str = Field(..., min_length=5, max_length=500)
    disposal_method: Optional[str] = Field(None, max_length=200)


class AssetTransferRequest(BaseModel):
    to_department_id: UUID
    reason: Optional[str] = Field(None, max_length=500)
    floor: Optional[str] = Field(None, max_length=50)


class AssetResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    asset_id: str
    name: str
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    barcode: Optional[str] = None
    qr_code_url: Optional[str] = None
    purchase_date: Optional[date] = None
    purchase_cost: Optional[Decimal] = None
    po_reference: Optional[str] = None
    po_tool_url: Optional[str] = None
    warranty_start: Optional[date] = None
    warranty_end: Optional[date] = None
    amc_vendor: Optional[str] = None
    amc_start: Optional[date] = None
    amc_end: Optional[date] = None
    amc_cost: Optional[Decimal] = None
    last_service_date: Optional[date] = None
    next_service_due: Optional[date] = None
    floor: Optional[str] = None
    location_notes: Optional[str] = None
    status: str
    is_shared: bool
    notes: Optional[str] = None
    category: AssetCategoryBrief
    department: Optional[DepartmentBrief] = None
    vendor: Optional[VendorBrief] = None
    created_at: datetime
    updated_at: datetime
    label: Optional[str] = None
    hostname: Optional[str] = None
    ram: Optional[str] = None
    hdd: Optional[str] = None
    processor: Optional[str] = None
    generation: Optional[str] = None
    mac_address: Optional[str] = None
    ip_address: Optional[str] = None
    os_name: Optional[str] = None
    os_activated: Optional[bool] = None
    ms_office: Optional[str] = None
    ms_office_activated: Optional[bool] = None
    antivirus: Optional[str] = None
    admin_login: Optional[bool] = None
    parent_asset_id: Optional[UUID] = None
    parent_asset: Optional["AssetLinkedItem"] = None
    linked_assets: List["AssetLinkedItem"] = []


class AssetLinkedItem(BaseModel):
    """Minimal asset info for linked assets (e.g. printers attached to a desktop)."""
    model_config = {"from_attributes": True}
    id: UUID
    asset_id: str
    name: str
    model: Optional[str] = None
    status: str
    category: AssetCategoryBrief


AssetResponse.model_rebuild()


class AssetListItem(BaseModel):
    """Lightweight item for list views."""
    model_config = {"from_attributes": True}

    id: UUID
    asset_id: str
    name: str
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    status: str
    floor: Optional[str] = None
    warranty_end: Optional[date] = None
    last_service_date: Optional[date] = None
    next_service_due: Optional[date] = None
    category: AssetCategoryBrief
    department: Optional[DepartmentBrief] = None
    label: Optional[str] = None
    hostname: Optional[str] = None
    ram: Optional[str] = None
    hdd: Optional[str] = None
    processor: Optional[str] = None
    generation: Optional[str] = None
    mac_address: Optional[str] = None
    ip_address: Optional[str] = None
    os_name: Optional[str] = None
    os_activated: Optional[bool] = None
    ms_office: Optional[str] = None
    ms_office_activated: Optional[bool] = None
    antivirus: Optional[str] = None
    admin_login: Optional[bool] = None


class ImportRowResult(BaseModel):
    row: int
    endpoint_name: str
    status: str  # "created" | "skipped" | "error"
    asset_id: Optional[str] = None
    reason: Optional[str] = None


class ImportSummary(BaseModel):
    total: int
    created: int
    skipped: int
    errors: int
    results: List[ImportRowResult]


class DocumentResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    entity_type: str
    entity_id: UUID
    doc_type: str
    filename: str
    file_url: str
    file_size_bytes: Optional[int] = None
    mime_type: Optional[str] = None
    created_at: datetime