import api from '@/lib/axios'
import type { APIResponse, Asset, AssetCategory, AssetListItem, Document, PagedResponse } from '@/types'

export interface ImportRowResult {
  row: number
  endpoint_name: string
  status: 'created' | 'skipped' | 'error'
  asset_id?: string
  reason?: string
}

export interface ImportSummary {
  total: number
  created: number
  skipped: number
  errors: number
  results: ImportRowResult[]
}

export interface AssetFilters {
  page?: number
  page_size?: number
  search?: string
  status?: string
  category_id?: string
  category_name?: string
  department_id?: string
  domain?: string
  floor?: string
  site?: string
  warranty_expiring_days?: number
}

export const assetsApi = {
  list: async (filters: AssetFilters = {}) => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.append(k, String(v))
    })
    const { data } = await api.get<PagedResponse<AssetListItem>>(`/assets?${params}`)
    return data
  },

  get: async (id: string) => {
    const { data } = await api.get<APIResponse<Asset>>(`/assets/${id}`)
    return data.data!
  },

  getByCode: async (code: string) => {
    const { data } = await api.get<APIResponse<Asset>>(`/assets/by-code/${code}`)
    return data.data!
  },

  create: async (payload: Partial<Asset> & { category_id: string }) => {
    const { data } = await api.post<APIResponse<Asset>>('/assets', payload)
    return data.data!
  },

  update: async (id: string, payload: Partial<Asset>) => {
    const { data } = await api.patch<APIResponse<Asset>>(`/assets/${id}`, payload)
    return data.data!
  },

  retire: async (id: string, reason: string, disposal_method?: string) => {
    const { data } = await api.post<APIResponse<Asset>>(`/assets/${id}/retire`, {
      reason,
      disposal_method,
    })
    return data.data!
  },

  transfer: async (id: string, to_department_id: string, reason?: string, floor?: string) => {
    const { data } = await api.post<APIResponse<Asset>>(`/assets/${id}/transfer`, {
      to_department_id,
      reason,
      floor,
    })
    return data.data!
  },

  getQR: async (id: string) => {
    const { data } = await api.get<APIResponse<{ qr_url: string; expires_in: number }>>(
      `/assets/${id}/qr`
    )
    return data.data!
  },

  getDocuments: async (id: string) => {
    const { data } = await api.get<APIResponse<Document[]>>(`/assets/${id}/documents`)
    return data.data!
  },

  importCsv: async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post<APIResponse<ImportSummary>>('/assets/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.data!
  },

  categories: {
    list: async (domain?: string) => {
      const params = domain ? `?domain=${domain}` : ''
      const { data } = await api.get<APIResponse<AssetCategory[]>>(`/asset-categories${params}`)
      return data.data!
    },
  },
}
