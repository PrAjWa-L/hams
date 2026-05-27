// ── Auth ──────────────────────────────────────────────────────

export type Role =
  | 'coo'
  | 'hr'
  | 'it_head'
  | 'it_team'
  | 'management'
  | 'employee'

export interface User {
  id: string
  emp_id: string
  full_name: string
  email: string
  phone?: string
  role: Role
  designation?: string
  is_active: boolean
  must_change_password: boolean
  department?: Department
  created_at: string
  updated_at: string
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
  user: User
}

// ── Department ────────────────────────────────────────────────

export interface Department {
  id: string
  name: string
  floor?: string
  description?: string
  is_active: boolean
  parent_id?: string
  created_at: string
  updated_at: string
}

// ── Vendor ────────────────────────────────────────────────────

export interface Vendor {
  id: string
  name: string
  contact_name?: string
  email?: string
  phone?: string
  address?: string
  gst_number?: string
  website?: string
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// ── Asset Category ────────────────────────────────────────────

export type AssetDomain = 'IT' | 'FACILITY'

export interface AssetCategory {
  id: string
  name: string
  domain: AssetDomain
  icon?: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// ── Asset ─────────────────────────────────────────────────────

export type AssetStatus =
  | 'available'
  | 'assigned'
  | 'under_maintenance'
  | 'retired'
  | 'disposed'

export interface Asset {
  id: string
  asset_id: string
  name: string
  brand?: string
  model?: string
  serial_number?: string
  barcode?: string
  qr_code_url?: string
  purchase_date?: string
  purchase_cost?: number
  po_reference?: string
  po_tool_url?: string
  warranty_start?: string
  warranty_end?: string
  amc_vendor?: string
  amc_start?: string
  amc_end?: string
  amc_cost?: number
  floor?: string
  location_notes?: string
  status: AssetStatus
  is_shared: boolean
  notes?: string
  category: AssetCategory
  department?: Department
  vendor?: Vendor
  created_at: string
  updated_at: string
}

export interface AssetListItem {
  id: string
  asset_id: string
  name: string
  brand?: string
  model?: string
  serial_number?: string
  status: AssetStatus
  floor?: string
  warranty_end?: string
  category: Pick<AssetCategory, 'id' | 'name' | 'domain' | 'icon'>
  department?: Pick<Department, 'id' | 'name' | 'floor'>
}

// ── Assignment ────────────────────────────────────────────────

export interface Assignment {
  id: string
  asset: AssetListItem
  assigned_to: Pick<User, 'id' | 'emp_id' | 'full_name' | 'email' | 'role'>
  assigned_by: Pick<User, 'id' | 'emp_id' | 'full_name' | 'email' | 'role'>
  assigned_at: string
  acknowledged_at?: string
  returned_at?: string
  notes?: string
  return_notes?: string
  is_active: boolean
  is_acknowledged: boolean
  created_at: string
}

// ── Onboarding ────────────────────────────────────────────────

export type OnboardingStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'in_progress'
  | 'completed'

export interface AssetRequirement {
  category: string
  domain: AssetDomain
  quantity: number
  notes?: string
}

export interface OnboardingRequest {
  id: string
  // New joiner details — free-form, filled by HR
  employee_name: string
  employee_emp_id: string
  employee_email: string
  employee_phone?: string
  employee_designation?: string
  employee_department?: string
  // Workflow actors
  requested_by: Pick<User, 'id' | 'emp_id' | 'full_name' | 'email' | 'role'>
  approved_by?: Pick<User, 'id' | 'emp_id' | 'full_name' | 'email' | 'role'>
  status: OnboardingStatus
  asset_requirements: AssetRequirement[]
  join_date?: string
  approved_at?: string
  completed_at?: string
  rejection_reason?: string
  notes?: string
  created_at: string
  updated_at: string
}

// ── Maintenance ───────────────────────────────────────────────

export type WorkType = 'preventive' | 'corrective' | 'amc' | 'inspection' | 'upgrade'

export interface MaintenanceRecord {
  id: string
  asset_id: string
  work_type: WorkType
  performed_by?: string
  performed_at: string
  helpdesk_ref?: string
  cost?: number
  description?: string
  next_due_at?: string
  logged_by: Pick<User, 'id' | 'emp_id' | 'full_name' | 'email' | 'role'>
  created_at: string
  updated_at: string
}

// ── Document ──────────────────────────────────────────────────

export interface Document {
  id: string
  entity_type: string
  entity_id: string
  doc_type: string
  filename: string
  file_url: string
  file_size_bytes?: number
  mime_type?: string
  created_at: string
}

// ── Audit Log ─────────────────────────────────────────────────

export interface AuditLog {
  id: string
  actor_id?: string
  actor_name?: string
  entity_type: string
  entity_id?: string
  action: string
  before_state?: Record<string, unknown>
  after_state?: Record<string, unknown>
  ip_address?: string
  created_at: string
}

// ── API Response wrappers ─────────────────────────────────────

export interface APIResponse<T> {
  data: T | null
  message?: string
  meta?: Record<string, unknown>
  error?: { code: string; message: string }
}

export interface PageMeta {
  page: number
  page_size: number
  total: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

export interface PagedResponse<T> {
  data: T[]
  meta: PageMeta
}