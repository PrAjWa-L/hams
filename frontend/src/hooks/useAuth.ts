import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/auth'
import type { Role } from '@/types'

export function useLogin() {
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),
    onSuccess: (data) => {
      setAuth(data.user, data.access_token, data.refresh_token)
      toast.success(`Welcome, ${data.user.full_name}`)
      navigate('/dashboard')
    },
    onError: () => {
      toast.error('Invalid email or password')
    },
  })
}

export function useLogout() {
  const { clearAuth } = useAuthStore()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      clearAuth()
      navigate('/login')
    },
  })
}

export function useMe() {
  const { isAuthenticated } = useAuthStore()
  return useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  })
}

export function useHasRole(...roles: Role[]) {
  const { user } = useAuthStore()
  if (!user) return false
  return roles.includes(user.role)
}

export function useCanAccessDomain(domain: 'IT' | 'FACILITY') {
  const { user } = useAuthStore()
  if (!user) return false
  if (user.role === 'coo') return true
  if (domain === 'IT') return ['it_head', 'it_team'].includes(user.role)
  if (domain === 'FACILITY') return user.role === 'management'
  return false
}
