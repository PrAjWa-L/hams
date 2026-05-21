import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2, Wrench } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { maintenanceApi } from '@/api/workflow'
import { assetsApi } from '@/api/assets'
import PageHeader from '@/components/shared/PageHeader'
import DataTable from '@/components/shared/DataTable'
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils'

const WORK_TYPES = ['preventive', 'corrective', 'amc', 'inspection', 'upgrade']

export default function MaintenancePage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [upcomingDays, setUpcomingDays] = useState(30)
  const { register, handleSubmit, reset } = useForm<Record<string, string>>()

  const { data: upcoming, isLoading: loadingUpcoming } = useQuery({
    queryKey: ['maintenance', 'upcoming', upcomingDays],
    queryFn: () => maintenanceApi.upcoming(upcomingDays),
  })

  const { data: assetsData } = useQuery({
    queryKey: ['assets-all'],
    queryFn: () => assetsApi.list({ page_size: 100 }),
    enabled: showModal,
  })

  const log = useMutation({
    mutationFn: (d: Record<string, string>) =>
      maintenanceApi.log({
        asset_id: d.asset_id,
        work_type: d.work_type,
        performed_by: d.performed_by || undefined,
        performed_at: d.performed_at,
        helpdesk_ref: d.helpdesk_ref || undefined,
        cost: d.cost ? Number(d.cost) : undefined,
        description: d.description || undefined,
        next_due_at: d.next_due_at || undefined,
      }),
    onSuccess: () => {
      toast.success('Maintenance record logged')
      qc.invalidateQueries({ queryKey: ['maintenance'] })
      setShowModal(false)
      reset()
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message
      toast.error(msg ?? 'Failed to log maintenance')
    },
  })

  return (
    <div>
      <PageHeader
        title="Maintenance"
        subtitle="Track completed maintenance and upcoming schedules"
        actions={
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={16} /> Log Maintenance
          </button>
        }
      />

      {/* Upcoming maintenance */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-gray-900">Upcoming Maintenance</h2>
          <select
            className="input w-40 text-sm"
            value={upcomingDays}
            onChange={(e) => setUpcomingDays(Number(e.target.value))}
          >
            <option value={7}>Next 7 days</option>
            <option value={30}>Next 30 days</option>
            <option value={60}>Next 60 days</option>
            <option value={90}>Next 90 days</option>
          </select>
        </div>

        {loadingUpcoming ? (
          <div className="card p-8 flex justify-center">
            <Loader2 className="animate-spin text-gray-400" />
          </div>
        ) : upcoming?.length === 0 ? (
          <div className="card p-8 text-center">
            <Wrench size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-400 text-sm">No maintenance due in the next {upcomingDays} days</p>
          </div>
        ) : (
          <div className="card divide-y divide-gray-50">
            {upcoming?.map((record) => (
              <div key={record.id} className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-gray-900">Asset ID: {record.asset_id}</p>
                  <p className="text-xs text-gray-400 capitalize">
                    {record.work_type} · Last done: {formatDate(record.performed_at)}
                  </p>
                  {record.helpdesk_ref && (
                    <p className="text-xs text-blue-500 mt-0.5">Helpdesk: #{record.helpdesk_ref}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-orange-600">
                    Due {formatDate(record.next_due_at)}
                  </p>
                  <p className="text-xs text-gray-400">by {record.logged_by.full_name}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Log maintenance modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold mb-4">Log Maintenance Record</h3>
            <form onSubmit={handleSubmit((d) => log.mutate(d))} className="space-y-4">
              <div>
                <label className="label">Asset *</label>
                <select {...register('asset_id', { required: true })} className="input">
                  <option value="">Select asset</option>
                  {assetsData?.data?.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} — {a.asset_id}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Work Type *</label>
                  <select {...register('work_type', { required: true })} className="input">
                    <option value="">Select type</option>
                    {WORK_TYPES.map((t) => (
                      <option key={t} value={t} className="capitalize">{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Performed At *</label>
                  <input
                    {...register('performed_at', { required: true })}
                    type="datetime-local"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Performed By</label>
                  <input {...register('performed_by')} className="input" placeholder="Technician name" />
                </div>
                <div>
                  <label className="label">Helpdesk Ref</label>
                  <input
                    {...register('helpdesk_ref')}
                    className="input"
                    placeholder="Ticket # from Helpdesk"
                  />
                </div>
                <div>
                  <label className="label">Cost (₹)</label>
                  <input {...register('cost')} type="number" step="0.01" className="input" />
                </div>
                <div>
                  <label className="label">Next Due Date</label>
                  <input {...register('next_due_at')} type="datetime-local" className="input" />
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea {...register('description')} className="input" rows={3} />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); reset() }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={log.isPending} className="btn-primary">
                  {log.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                  Log Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
