import { useForm } from 'react-hook-form'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useMutation } from '@tanstack/react-query'
import { User, Lock, Loader2 } from 'lucide-react'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/auth'
import PageHeader from '@/components/shared/PageHeader'
import { RoleBadge } from '@/components/shared/StatusBadge'
import { formatDate, getInitials } from '@/lib/utils'

export default function ProfilePage() {
  const { user } = useAuthStore()
  const [tab, setTab] = useState<'profile' | 'password'>('profile')

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<{
    current_password: string
    new_password: string
    confirm_password: string
  }>()

  const changePwd = useMutation({
    mutationFn: ({ current_password, new_password }: { current_password: string; new_password: string }) =>
      authApi.changePassword(current_password, new_password),
    onSuccess: () => {
      toast.success('Password changed successfully')
      reset()
    },
    onError: () => toast.error('Current password is incorrect'),
  })

  if (!user) return null

  return (
    <div>
      <PageHeader title="My Profile" subtitle="Manage your account settings" />

      <div className="grid grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="card p-6 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center text-white text-2xl font-bold mb-4">
            {getInitials(user.full_name)}
          </div>
          <h2 className="font-semibold text-gray-900">{user.full_name}</h2>
          <p className="text-sm text-gray-500 mb-3">{user.email}</p>
          <RoleBadge role={user.role} />
          <div className="w-full mt-6 pt-6 border-t border-gray-100 space-y-3 text-left">
            <div>
              <p className="text-xs text-gray-400">Employee ID</p>
              <p className="text-sm font-medium">{user.emp_id}</p>
            </div>
            {user.designation && (
              <div>
                <p className="text-xs text-gray-400">Designation</p>
                <p className="text-sm font-medium">{user.designation}</p>
              </div>
            )}
            {user.department && (
              <div>
                <p className="text-xs text-gray-400">Department</p>
                <p className="text-sm font-medium">{user.department.name}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400">Member since</p>
              <p className="text-sm font-medium">{formatDate(user.created_at)}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="col-span-2">
          <div className="flex gap-1 mb-4 border-b border-gray-200">
            {(['profile', 'password'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  tab === t
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'profile' ? 'Profile Info' : 'Change Password'}
              </button>
            ))}
          </div>

          {tab === 'profile' && (
            <div className="card p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="label">Full Name</p>
                  <p className="input bg-gray-50 text-gray-600">{user.full_name}</p>
                </div>
                <div>
                  <p className="label">Email</p>
                  <p className="input bg-gray-50 text-gray-600">{user.email}</p>
                </div>
                <div>
                  <p className="label">Phone</p>
                  <p className="input bg-gray-50 text-gray-600">{user.phone || '—'}</p>
                </div>
                <div>
                  <p className="label">Role</p>
                  <p className="input bg-gray-50 text-gray-600 capitalize">{user.role.replace('_', ' ')}</p>
                </div>
              </div>
            </div>
          )}

          {tab === 'password' && (
            <div className="card p-6">
              <form
                onSubmit={handleSubmit((d) => changePwd.mutate(d))}
                className="space-y-4 max-w-sm"
              >
                <div>
                  <label className="label">Current Password</label>
                  <input
                    {...register('current_password', { required: true })}
                    type="password"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">New Password</label>
                  <input
                    {...register('new_password', { required: true, minLength: 8 })}
                    type="password"
                    className="input"
                  />
                  {errors.new_password && (
                    <p className="text-red-500 text-xs mt-1">Minimum 8 characters</p>
                  )}
                </div>
                <div>
                  <label className="label">Confirm New Password</label>
                  <input
                    {...register('confirm_password', {
                      required: true,
                      validate: (v) => v === watch('new_password') || 'Passwords do not match',
                    })}
                    type="password"
                    className="input"
                  />
                  {errors.confirm_password && (
                    <p className="text-red-500 text-xs mt-1">{errors.confirm_password.message}</p>
                  )}
                </div>
                <button type="submit" disabled={changePwd.isPending} className="btn-primary">
                  {changePwd.isPending ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                  Update Password
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
