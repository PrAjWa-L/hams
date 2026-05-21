import { useForm } from 'react-hook-form'
import { Navigate } from 'react-router-dom'
import { Building2, Loader2 } from 'lucide-react'
import { useLogin } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/auth'

interface FormData {
  email: string
  password: string
}

export default function LoginPage() {
  const { isAuthenticated } = useAuthStore()
  const login = useLogin()
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>()

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-primary-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600 mb-4">
            <Building2 size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">HAMS</h1>
          <p className="text-gray-400 text-sm mt-1">Hospital Asset Management System</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Sign in to your account</h2>

          <form onSubmit={handleSubmit((d) => login.mutate(d))} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input
                {...register('email', { required: 'Email is required' })}
                type="email"
                className="input"
                placeholder="you@hospital.com"
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="label">Password</label>
              <input
                {...register('password', { required: 'Password is required' })}
                type="password"
                className="input"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={login.isPending}
              className="btn-primary w-full mt-2"
            >
              {login.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-500 text-xs mt-6">
          © {new Date().getFullYear()} Hospital Asset Management System
        </p>
      </div>
    </div>
  )
}
