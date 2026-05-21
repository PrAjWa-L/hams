import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { assignmentsApi } from '@/api/workflow'
import { assetsApi } from '@/api/assets'
import { usersApi } from '@/api/users'
import { useAuthStore } from '@/store/auth'
import PageHeader from '@/components/shared/PageHeader'
import DataTable from '@/components/shared/DataTable'
import { formatDate, formatDateTime } from '@/lib/utils'

export default function AssignmentsPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [activeOnly, setActiveOnly] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const { register, handleSubmit, reset } = useForm<Record<string, string>>()

  const { data, isLoading } = useQuery({
    queryKey: ['assignments', page, activeOnly],
    queryFn: () => assignmentsApi.list({ page: String(page), active_only: activeOnly }),
  })

  const { data: assetsData } = useQuery({
    queryKey: ['assets-available'],
    queryFn: () => assetsApi.list({ status: 'available', page_size: 100 }),
    enabled: showModal,
  })

  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => usersApi.list({ page_size: 100 }),
    enabled: showModal,
  })

  const create = useMutation({
    mutationFn: (d: Record<string, string>) =>
      assignmentsApi.create({ asset_id: d.asset_id, assigned_to_id: d.assigned_to_id, notes: d.notes }),
    onSuccess: () => {
      toast.success('Asset assigned successfully')
      qc.invalidateQueries({ queryKey: ['assignments'] })
      qc.invalidateQueries({ queryKey: ['assets'] })
      setShowModal(false)
      reset()
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
      toast.error(msg ?? 'Failed to assign asset')
    },
  })

  const returnAsset = useMutation({
    mutationFn: (id: string) => assignmentsApi.return(id),
    onSuccess: () => {
      toast.success('Asset returned')
      qc.invalidateQueries({ queryKey: ['assignments'] })
      qc.invalidateQueries({ queryKey: ['assets'] })
    },
  })

  return (
    <div>
      <PageHeader
        title="Asset Assignments"
        subtitle={`${data?.meta?.total ?? 0} assignments`}
        actions={
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={16} /> Assign Asset
          </button>
        }
      />

      <div className="flex gap-3 mb-4">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => { setActiveOnly(e.target.checked); setPage(1) }}
            className="rounded border-gray-300"
          />
          Active only
        </label>
      </div>

      <DataTable
        isLoading={isLoading}
        data={data?.data ?? []}
        meta={data?.meta}
        onPageChange={setPage}
        columns={[
          {
            key: 'asset',
            header: 'Asset',
            render: (row) => (
              <div>
                <p className="font-medium text-sm">{row.asset.name}</p>
                <p className="text-xs text-gray-400 font-mono">{row.asset.asset_id}</p>
              </div>
            ),
          },
          {
            key: 'assigned_to',
            header: 'Assigned To',
            render: (row) => (
              <div>
                <p className="text-sm">{row.assigned_to.full_name}</p>
                <p className="text-xs text-gray-400">{row.assigned_to.emp_id}</p>
              </div>
            ),
          },
          {
            key: 'assigned_by',
            header: 'Assigned By',
            render: (row) => <span className="text-sm">{row.assigned_by.full_name}</span>,
          },
          {
            key: 'assigned_at',
            header: 'Assigned',
            render: (row) => <span className="text-sm">{formatDate(row.assigned_at)}</span>,
          },
          {
            key: 'ack',
            header: 'Acknowledged',
            render: (row) => row.acknowledged_at
              ? <span className="badge-green">Yes</span>
              : <span className="badge-yellow">Pending</span>,
          },
          {
            key: 'actions',
            header: '',
            width: '100px',
            render: (row) =>
              row.is_active ? (
                <button
                  onClick={() => returnAsset.mutate(row.id)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Return
                </button>
              ) : (
                <span className="text-xs text-gray-400">Returned {formatDate(row.returned_at)}</span>
              ),
          },
        ]}
      />

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-md w-full">
            <h3 className="font-semibold mb-4">Assign Asset</h3>
            <form onSubmit={handleSubmit((d) => create.mutate(d))} className="space-y-4">
              <div>
                <label className="label">Asset *</label>
                <select {...register('asset_id', { required: true })} className="input">
                  <option value="">Select available asset</option>
                  {assetsData?.data?.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} — {a.asset_id}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Assign To *</label>
                <select {...register('assigned_to_id', { required: true })} className="input">
                  <option value="">Select employee</option>
                  {usersData?.data?.map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name} ({u.emp_id})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea {...register('notes')} className="input" rows={2} />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setShowModal(false); reset() }} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={create.isPending} className="btn-primary">
                  {create.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                  Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
