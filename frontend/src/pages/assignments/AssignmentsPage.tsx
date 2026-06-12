import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2, Search, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { assignmentsApi, onboardingApi } from '@/api/workflow'
import { assetsApi } from '@/api/assets'
import { useAuthStore } from '@/store/auth'
import PageHeader from '@/components/shared/PageHeader'
import DataTable from '@/components/shared/DataTable'
import { formatDate } from '@/lib/utils'

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  displayKey,
  subKey,
}: {
  options: Record<string, string>[]
  value: string
  onChange: (val: string) => void
  placeholder: string
  displayKey: string
  subKey?: string
}) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    if (!search) return options
    const q = search.toLowerCase()
    return options.filter((o) =>
      Object.values(o).some((v) => String(v).toLowerCase().includes(q))
    )
  }, [options, search])

  const selected = options.find((o) => o.id === value)

  return (
    <div className="relative">
      <div
        className="input flex items-center justify-between cursor-pointer"
        onClick={() => setOpen((o) => !o)}
      >
        <span className={selected ? 'text-gray-900' : 'text-gray-400'}>
          {selected ? selected[displayKey] : placeholder}
        </span>
        {value && (
          <X
            size={14}
            className="text-gray-400 hover:text-gray-600"
            onClick={(e) => { e.stopPropagation(); onChange(''); setSearch('') }}
          />
        )}
      </div>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="input pl-8 py-1.5 text-sm"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-sm text-gray-400 text-center">No results</p>
            ) : (
              filtered.map((o) => (
                <div
                  key={o.id}
                  className={`px-3 py-2 cursor-pointer hover:bg-gray-50 ${o.id === value ? 'bg-blue-50' : ''}`}
                  onClick={() => { onChange(o.id); setOpen(false); setSearch('') }}
                >
                  <p className="text-sm text-gray-800">{o[displayKey]}</p>
                  {subKey && <p className="text-xs text-gray-400">{o[subKey]}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AssignmentsPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [activeOnly, setActiveOnly] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedAssetId, setSelectedAssetId] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const { register, handleSubmit, reset } = useForm<{ notes: string }>()

  const { data, isLoading } = useQuery({
    queryKey: ['assignments', page, activeOnly],
    queryFn: () => assignmentsApi.list({ page, active_only: activeOnly }),
  })

  const { data: assetsData } = useQuery({
    queryKey: ['assets-available'],
    queryFn: () => assetsApi.list({ status: 'available', page_size: 100 }),
    enabled: showModal,
  })

  const { data: usersData } = useQuery({
    queryKey: ['assignable-employees'],
    queryFn: () => onboardingApi.assignableEmployees(),
    enabled: showModal,
  })

  const assetOptions = useMemo(
    () =>
      (assetsData?.data ?? []).map((a) => ({
        id: a.id,
        displayKey: `${a.name} — ${a.asset_id}`,
        subKey: [a.brand, a.model].filter(Boolean).join(' '),
      })),
    [assetsData]
  )

  const userOptions = useMemo(
    () =>
      (usersData ?? []).map((u) => ({
        id: u.id,
        displayKey: u.full_name,
        subKey: `${u.emp_id}${u.department ? ' · ' + u.department : ''}`,
      })),
    [usersData]
  )

  const create = useMutation({
    mutationFn: (d: { notes: string }) =>
      assignmentsApi.create({
        asset_id: selectedAssetId,
        assigned_to_id: selectedUserId,
        notes: d.notes,
      }),
    onSuccess: () => {
      toast.success('Asset assigned successfully')
      qc.invalidateQueries({ queryKey: ['assignments'] })
      qc.invalidateQueries({ queryKey: ['assets'] })
      setShowModal(false)
      setSelectedAssetId('')
      setSelectedUserId('')
      reset()
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message
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

  function handleClose() {
    setShowModal(false)
    setSelectedAssetId('')
    setSelectedUserId('')
    reset()
  }

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
            render: (row) =>
              row.acknowledged_at
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
          <div className="card p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-gray-900">Assign Asset</h3>
              <button onClick={handleClose} className="btn-ghost p-1">
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit((d) => {
                if (!selectedAssetId || !selectedUserId) {
                  toast.error('Please select both an asset and an employee')
                  return
                }
                create.mutate(d)
              })}
              className="space-y-4"
            >
              <div>
                <label className="label">Asset *</label>
                <SearchableSelect
                  options={assetOptions as unknown as Record<string, string>[]}
                  value={selectedAssetId}
                  onChange={setSelectedAssetId}
                  placeholder={assetsData ? `Search ${assetOptions.length} available assets…` : 'Loading assets…'}
                  displayKey="displayKey"
                  subKey="subKey"
                />
              </div>

              <div>
                <label className="label">Assign To *</label>
                <SearchableSelect
                  options={userOptions as unknown as Record<string, string>[]}
                  value={selectedUserId}
                  onChange={setSelectedUserId}
                  placeholder={usersData ? `Search ${userOptions.length} employees…` : 'Loading employees…'}
                  displayKey="displayKey"
                  subKey="subKey"
                />
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea {...register('notes')} className="input" rows={2} placeholder="Optional notes…" />
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={handleClose} className="btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={create.isPending || !selectedAssetId || !selectedUserId}
                  className="btn-primary"
                >
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