import api from '@/lib/axios'
import type {
  APIResponse,
  Assignment,
  AuditLog,
  MaintenanceRecord,
  OnboardingRequest,
  PagedResponse,
} from '@/types'

export interface AssignableEmployee {
  id: string
  emp_id: string
  full_name: string
  email: string
  department?: string
  designation?: string
  status: string
}

export const onboardingApi = {
  list: async (params: Record<string, string | undefined> = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => v && query.append(k, v))
    const { data } = await api.get<PagedResponse<OnboardingRequest>>(`/onboarding?${query}`)
    return data
  },

  get: async (id: string) => {
    const { data } = await api.get<APIResponse<OnboardingRequest>>(`/onboarding/${id}`)
    return data.data!
  },

  create: async (payload: {
    employee_name: string
    employee_emp_id: string
    employee_email: string
    employee_phone?: string
    employee_designation?: string
    employee_department?: string
    join_date?: string
    notes?: string
    asset_requirements: Array<{ category: string; domain: string; quantity: number; notes?: string }>
  }) => {
    const { data } = await api.post<APIResponse<OnboardingRequest>>('/onboarding', payload)
    return data.data!
  },

  approve: async (id: string, notes?: string) => {
    const { data } = await api.post<APIResponse<OnboardingRequest>>(`/onboarding/${id}/approve`, { notes })
    return data.data!
  },

  reject: async (id: string, rejection_reason: string) => {
    const { data } = await api.post<APIResponse<OnboardingRequest>>(`/onboarding/${id}/reject`, {
      rejection_reason,
    })
    return data.data!
  },

  complete: async (id: string) => {
    const { data } = await api.post<APIResponse<OnboardingRequest>>(`/onboarding/${id}/complete`)
    return data.data!
  },

  assignableEmployees: async (search?: string) => {
    const params = search ? `?search=${encodeURIComponent(search)}` : ''
    const { data } = await api.get<APIResponse<AssignableEmployee[]>>(`/onboarding/assignable${params}`)
    return data.data!
  },
}

export const assignmentsApi = {
  list: async (params: Record<string, string | boolean | undefined> = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => v !== undefined && query.append(k, String(v)))
    const { data } = await api.get<PagedResponse<Assignment>>(`/assignments?${query}`)
    return data
  },

  get: async (id: string) => {
    const { data } = await api.get<APIResponse<Assignment>>(`/assignments/${id}`)
    return data.data!
  },

  myAssets: async (active_only = true) => {
    const { data } = await api.get<APIResponse<Assignment[]>>(
      `/assignments/my-assets?active_only=${active_only}`
    )
    return data.data!
  },

  create: async (payload: {
    asset_id: string
    assigned_to_id: string
    onboarding_request_id?: string
    notes?: string
  }) => {
    const { data } = await api.post<APIResponse<Assignment>>('/assignments', payload)
    return data.data!
  },

  acknowledge: async (id: string) => {
    const { data } = await api.post<APIResponse<Assignment>>(`/assignments/${id}/acknowledge`)
    return data.data!
  },

  return: async (id: string, return_notes?: string) => {
    const { data } = await api.post<APIResponse<Assignment>>(`/assignments/${id}/return`, {
      return_notes,
    })
    return data.data!
  },
}

export const maintenanceApi = {
  listForAsset: async (assetId: string, params: Record<string, string | number | undefined> = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => v !== undefined && query.append(k, String(v)))
    const { data } = await api.get<PagedResponse<MaintenanceRecord>>(
      `/maintenance/asset/${assetId}?${query}`
    )
    return data
  },

  upcoming: async (days = 30) => {
    const { data } = await api.get<APIResponse<MaintenanceRecord[]>>(
      `/maintenance/upcoming?days=${days}`
    )
    return data.data!
  },

  log: async (payload: {
    asset_id: string
    work_type: string
    performed_by?: string
    performed_at: string
    helpdesk_ref?: string
    cost?: number
    description?: string
    next_due_at?: string
  }) => {
    const { data } = await api.post<APIResponse<MaintenanceRecord>>('/maintenance', payload)
    return data.data!
  },

  update: async (id: string, payload: Partial<MaintenanceRecord>) => {
    const { data } = await api.patch<APIResponse<MaintenanceRecord>>(`/maintenance/${id}`, payload)
    return data.data!
  },
}

export const auditApi = {
  list: async (params: Record<string, string | undefined> = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => v && query.append(k, v))
    const { data } = await api.get<PagedResponse<AuditLog>>(`/audit-logs?${query}`)
    return data
  },
}