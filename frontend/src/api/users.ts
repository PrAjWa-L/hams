import api from '@/lib/axios'
import type { APIResponse, Department, PagedResponse, User, Vendor } from '@/types'

export const usersApi = {
  list: async (params: Record<string, string | number | boolean | undefined> = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) query.append(k, String(v))
    })
    const { data } = await api.get<PagedResponse<User>>(`/users?${query}`)
    return data
  },

  get: async (id: string) => {
    const { data } = await api.get<APIResponse<User>>(`/users/${id}`)
    return data.data!
  },

  create: async (payload: Partial<User> & { password: string }) => {
    const { data } = await api.post<APIResponse<User>>('/users', payload)
    return data.data!
  },

  update: async (id: string, payload: Partial<User>) => {
    const { data } = await api.patch<APIResponse<User>>(`/users/${id}`, payload)
    return data.data!
  },

  deactivate: async (id: string) => {
    const { data } = await api.post<APIResponse<User>>(`/users/${id}/deactivate`)
    return data.data!
  },
}

export const departmentsApi = {
  list: async () => {
    const { data } = await api.get<APIResponse<Department[]>>('/departments')
    return data.data!
  },

  create: async (payload: Partial<Department>) => {
    const { data } = await api.post<APIResponse<Department>>('/departments', payload)
    return data.data!
  },

  update: async (id: string, payload: Partial<Department>) => {
    const { data } = await api.patch<APIResponse<Department>>(`/departments/${id}`, payload)
    return data.data!
  },
}

export const vendorsApi = {
  list: async (search?: string) => {
    const params = search ? `?search=${search}` : ''
    const { data } = await api.get<PagedResponse<Vendor>>(`/vendors${params}`)
    return data
  },

  get: async (id: string) => {
    const { data } = await api.get<APIResponse<Vendor>>(`/vendors/${id}`)
    return data.data!
  },

  create: async (payload: Partial<Vendor>) => {
    const { data } = await api.post<APIResponse<Vendor>>('/vendors', payload)
    return data.data!
  },

  update: async (id: string, payload: Partial<Vendor>) => {
    const { data } = await api.patch<APIResponse<Vendor>>(`/vendors/${id}`, payload)
    return data.data!
  },
}
