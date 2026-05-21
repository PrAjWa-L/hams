import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { usersApi, departmentsApi } from '@/api/users'
import PageHeader from '@/components/shared/PageHeader'
import DataTable from '@/components/shared/DataTable'
import { RoleBadge } from '@/components/shared/StatusBadge'
import { formatDate, getInitials, ROLE_LABELS } from '@/lib/utils'

const ROLES = ['hr', 'coo', 'it_head', 'it_team', 'management', 'employee'] as const

export default function UsersPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [showModal, setShowModal] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Record<string, string>>()

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search],
    queryFn: () => usersApi.list({ page, page_size: 20, search: search || undefined }),
  })

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: departmentsApi.list,
  })

  const create = useMutation({
    mutationFn: (d: Record<string, string>) =>
      usersApi.create(d as Parameters<typeof usersApi.create>[0]),
    onSuccess: () => {
      toast.success('User created successfully')
      qc.invalidateQueries({ queryKey: ['users'] })
      setShowModal(false)
      reset()
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
      toast.error(msg ?? 'Failed to create user')
    },
  })

  const deactivate = useMutation({
    mutationFn: usersApi.deactivate,
    onSuccess: () => {
      toast.success('User deactivated')
      qc.invalidateQueries({ queryKey: ['users'] })
    },
  })

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle={`${data?.meta?.total ?? 0} total users`}
        actions={
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={16} /> Add User
          </button>
        }
      />

      <div className="flex gap-3 mb-4">
        <form
          onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); setPage(1) }}
          className="flex gap-2 max-w-sm"
        >
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search users..."
              className="input pl-9"
            />
          </div>
          <button type="submit" className="btn-secondary">Search</button>
        </form>
      </div>

      <DataTable
        isLoading={isLoading}
        data={data?.data ?? []}
        meta={data?.meta}
        onPageChange={setPage}
        columns={[
          {
            key: 'user',
            header: 'User',
            render: (row) => (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {getInitials(row.full_name)}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{row.full_name}</p>
                  <p className="text-xs text-gray-400">{row.email}</p>
                </div>
              </div>
            ),
          },
          { key: 'emp_id', header: 'Emp ID', render: (row) => <span className="font-mono text-xs">{row.emp_id}</span> },
          { key: 'role', header: 'Role', render: (row) => <RoleBadge role={row.role} /> },
          { key: 'dept', header: 'Department', render: (row) => <span className="text-sm">{row.department?.name ?? '—'}</span> },
          {
            key: 'status',
            header: 'Status',
            render: (row) => (
              <span className={row.is_active ? 'badge-green' : 'badge-red'}>
                {row.is_active ? 'Active' : 'Inactive'}
              </span>
            ),
          },
          { key: 'joined', header: 'Joined', render: (row) => <span className="text-sm text-gray-500">{formatDate(row.created_at)}</span> },
          {
            key: 'actions',
            header: '',
            width: '80px',
            render: (row) => row.is_active ? (
              <button
                onClick={() => deactivate.mutate(row.id)}
                className="text-xs text-red-500 hover:underline"
              >
                Deactivate
              </button>
            ) : null,
          },
        ]}
      />

      {/* Create user modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-gray-900 mb-4">Add New User</h3>
            <form onSubmit={handleSubmit((d) => create.mutate(d))} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Employee ID *</label>
                  <input {...register('emp_id', { required: true })} className="input" />
                </div>
                <div>
                  <label className="label">Full Name *</label>
                  <input {...register('full_name', { required: true })} className="input" />
                </div>
                <div>
                  <label className="label">Email *</label>
                  <input {...register('email', { required: true })} type="email" className="input" />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input {...register('phone')} className="input" />
                </div>
                <div>
                  <label className="label">Role *</label>
                  <select {...register('role', { required: true })} className="input">
                    <option value="">Select role</option>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Department</label>
                  <select {...register('department_id')} className="input">
                    <option value="">Select department</option>
                    {departments?.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Designation</label>
                  <input {...register('designation')} className="input" />
                </div>
                <div>
                  <label className="label">Password *</label>
                  <input {...register('password', { required: true, minLength: 8 })} type="password" className="input" />
                  {errors.password && <p className="text-red-500 text-xs mt-1">Min 8 characters</p>}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); reset() }} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={create.isPending} className="btn-primary">
                  {create.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
