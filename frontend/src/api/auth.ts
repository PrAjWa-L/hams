import api from '@/lib/axios'
import type { APIResponse, AuthTokens, User } from '@/types'

export const authApi = {
  login: async (email: string, password: string) => {
    const { data } = await api.post<APIResponse<AuthTokens>>('/auth/login', { email, password })
    return data.data!
  },

  logout: async () => {
    await api.post('/auth/logout')
  },

  me: async () => {
    const { data } = await api.get<APIResponse<User>>('/auth/me')
    return data.data!
  },

  changePassword: async (current_password: string, new_password: string) => {
    const { data } = await api.post<APIResponse<null>>('/auth/change-password', {
      current_password,
      new_password,
    })
    return data
  },
}
