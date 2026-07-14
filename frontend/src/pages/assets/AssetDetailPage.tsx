import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, QrCode, Loader2, AlertTriangle, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { assetsApi } from '@/api/assets'
import { assignmentsApi } from '@/api/workflow'
import { useAuthStore } from '@/store/auth'
import { AssetStatusBadge } from '@/components/shared/StatusBadge'
import { formatDate, formatCurrency, warrantyDaysLeft, warrantyColor } from '@/lib/utils'

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'details' | 'assignments' | 'maintenance' | 'documents'>('details')
  const [showRetireModal, setShowRetireModal] = useState(false)
  const [retireReason, setRetireReason] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState<Record<string, string>>({})

  const { data: asset, isLoading } = useQuery({
    queryKey: ['asset', id],
    queryFn: () => assetsApi.get(id!),
    enabled: !!id,
  })

  const { data: assignments } = useQuery({
    queryKey: ['assignments', id],
    queryFn: () => assignmentsApi.list({ asset_id: id }),
    enabled: !!id && tab === 'assignments',
  })

  const { data: qrData } = useQuery({
    queryKey: ['asset-qr', id],
    queryFn: () => assetsApi.getQR(id!),
    enabled: !!id,
    retry: false,
  })

  const retire = useMutation({
    mutationFn: () => assetsApi.retire(id!, retireReason),
    onSuccess: () => {
      toast.success('Asset retired')
      qc.invalidateQueries({ queryKey: ['asset', id] })
      setShowRetireModal(false)
    },
    onError: () => toast.error('Failed to retire asset'),
  })

  const update = useMutation({
    mutationFn: (payload: Record<string, string>) => {
      const { is_shared, ...rest } = payload
      return assetsApi.update(id!, { ...rest, is_shared: is_shared === 'true' } as never)
    },
    onSuccess: () => {
      toast.success('Asset updated')
      qc.invalidateQueries({ queryKey: ['asset', id] })
      setShowEditModal(false)
    },
    onError: () => toast.error('Failed to update asset'),
  })

  function openEdit() {
    setEditForm({
      name: asset?.name ?? '',
      brand: asset?.brand ?? '',
      model: asset?.model ?? '',
      serial_number: asset?.serial_number ?? '',
      hostname: asset?.hostname ?? '',
      ip_address: asset?.ip_address ?? '',
      mac_address: asset?.mac_address ?? '',
      ram: asset?.ram ?? '',
      hdd: asset?.hdd ?? '',
      processor: asset?.processor ?? '',
      os_name: asset?.os_name ?? '',
      label: asset?.label ?? '',
      notes: asset?.notes ?? '',
      warranty_end: asset?.warranty_end ?? '',
      vendor_name: asset?.vendor_name ?? asset?.vendor?.name ?? '',
      purchased_from: asset?.purchased_from ?? '',
      is_shared: asset?.is_shared ? 'true' : 'false',
    })
    setShowEditModal(true)
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-gray-400" size={24} />
    </div>
  )

  if (!asset) return <p className="text-gray-500">Asset not found</p>

  const wDays = warrantyDaysLeft(asset.warranty_end)
  const canRetire = ['coo', 'it_head', 'management'].includes(user?.role ?? '')
  const canEdit = ['coo', 'it_head', 'it_team', 'management'].includes(user?.role ?? '')

  return (
    <div>
      {/* Back + header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/assets" className="btn-ghost p-2">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900">{asset.name}</h1>
            <AssetStatusBadge status={asset.status} />
            {asset.is_shared && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Shared</span>
            )}
          </div>
          <p className="text-sm text-gray-500 font-mono">{asset.asset_id}</p>
        </div>
        <div className="flex gap-2">
          {qrData?.qr_url && (
            <a href={qrData.qr_url} target="_blank" rel="noreferrer" className="btn-secondary">
              <QrCode size={16} /> QR Code
            </a>
          )}
          {canEdit && asset.status !== 'retired' && asset.status !== 'disposed' && (
            <button onClick={openEdit} className="btn-secondary">
              <Pencil size={16} /> Edit
            </button>
          )}
          {canRetire && asset.status !== 'retired' && asset.status !== 'disposed' && (
            <button onClick={() => setShowRetireModal(true)} className="btn-danger">
              Retire Asset
            </button>
          )}
        </div>
      </div>

      {/* Warranty alert */}
      {wDays !== null && wDays <= 90 && (
        <div className={`flex items-center gap-3 p-3 rounded-lg mb-4 ${wDays <= 0 ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}>
          <AlertTriangle size={16} />
          <span className="text-sm font-medium">
            {wDays <= 0
              ? `Warranty expired ${Math.abs(wDays)} days ago`
              : `Warranty expires in ${wDays} days — ${formatDate(asset.warranty_end)}`}
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {(['details', 'assignments', 'maintenance', 'documents'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Details tab */}
      {tab === 'details' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="card p-5 space-y-4">
            <h3 className="font-medium text-gray-900 text-sm">Basic Information</h3>
            {[
              ['Category', `${asset.category.name} (${asset.category.domain})`],
              ['Brand', asset.brand],
              ['Model', asset.model],
              ['Serial Number', asset.serial_number],
              ['Barcode', asset.barcode],
              ['Floor', asset.floor],
              ['Department', asset.department?.name],
              ['Vendor', asset.vendor?.name ?? asset.vendor_name],
            ].map(([label, value]) => value && (
              <div key={label} className="flex justify-between">
                <span className="text-xs text-gray-400">{label}</span>
                <span className="text-sm text-gray-700 font-medium">{value}</span>
              </div>
            ))}\n          </div>

          <div className="space-y-4">
            <div className="card p-5 space-y-3">
              <h3 className="font-medium text-gray-900 text-sm">Purchase & Cost</h3>
              {[
                ['Purchase Date', formatDate(asset.purchase_date)],
                ['Purchase Cost', formatCurrency(asset.purchase_cost)],
                ['PO Reference', asset.po_reference],
                ['Purchased From', asset.purchased_from],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-xs text-gray-400">{label}</span>
                  <span className="text-sm text-gray-700">{value ?? '—'}</span>
                </div>
              ))}
            </div>

            <div className="card p-5 space-y-3">
              <h3 className="font-medium text-gray-900 text-sm">Warranty & AMC</h3>
              {[
                ['Warranty Start', formatDate(asset.warranty_start)],
                ['Warranty End', formatDate(asset.warranty_end)],
                ['AMC Vendor', asset.amc_vendor],
                ['AMC Start', formatDate(asset.amc_start)],
                ['AMC End', formatDate(asset.amc_end)],
                ['AMC Cost', formatCurrency(asset.amc_cost)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-xs text-gray-400">{label}</span>
                  <span className={`text-sm ${warrantyColor(label === 'Warranty End' ? wDays : null)}`}>
                    {value ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {/* IT Specs card — only for IT assets */}
          {asset.category.domain === 'IT' && (
            <div className="card p-5 space-y-3 col-span-2">
              <h3 className="font-medium text-gray-900 text-sm">IT Device Specifications</h3>
              <div className="grid grid-cols-4 gap-4">
                {[
                  ['Hostname', asset.hostname],
                  ['IP Address', asset.ip_address],
                  ['MAC Address', asset.mac_address],
                  ['Processor', asset.processor],
                  ['Generation', asset.generation],
                  ['RAM', asset.ram],
                  ['HDD / SSD', asset.hdd],
                  ['Label', asset.label],
                  ['OS', asset.os_name],
                  ['OS Activated', asset.os_activated === null ? '—' : asset.os_activated ? 'Yes ✓' : 'No ✗'],
                  ['MS Office', asset.ms_office],
                  ['Office Activated', asset.ms_office_activated === null ? '—' : asset.ms_office_activated ? 'Yes ✓' : 'No ✗'],
                  ['Antivirus', asset.antivirus],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="text-sm font-medium text-gray-700">{value ?? '—'}</p>
                  </div>
                ))}
              </div>
              </div>
            )}

        {/* Parent Asset (e.g. desktop this printer is linked to) */}
        {asset.parent_asset && (
          <div className="card p-5 mt-4">
            <h3 className="font-medium text-gray-700 mb-3">Tagged To</h3>
            <div className="flex items-center justify-between">
              <div>
                <Link to={`/assets/${asset.parent_asset.id}`} className="text-sm font-medium text-primary-600 hover:underline">
                  {asset.parent_asset.name}
                </Link>
                <p className="text-xs text-gray-400">{asset.parent_asset.category.name}{asset.parent_asset.model ? ` · ${asset.parent_asset.model}` : ''}</p>
              </div>
              <span className="font-mono text-xs text-gray-400">{asset.parent_asset.asset_id}</span>
            </div>
          </div>
        )}

        {/* Linked Assets (e.g. printers) */}
        {asset.linked_assets && asset.linked_assets.length > 0 && (
          <div className="card p-5 mt-4">
            <h3 className="font-medium text-gray-700 mb-3">Linked Assets</h3>
            <div className="divide-y divide-gray-100">
              {asset.linked_assets.map((la: { id: string; asset_id: string; name: string; model?: string; status: string; category: { name: string } }) => (
                <div key={la.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <Link to={`/assets/${la.id}`} className="text-sm font-medium text-primary-600 hover:underline">
                      {la.name}
                    </Link>
                    <p className="text-xs text-gray-400">{la.category.name}{la.model ? ` · ${la.model}` : ''}</p>
                  </div>
                  <span className="font-mono text-xs text-gray-400">{la.asset_id}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      )}

      {/* Assignments tab */}
      {tab === 'assignments' && (
        <div className="card divide-y divide-gray-50">
          {assignments?.data?.length === 0 && (
            <p className="px-5 py-8 text-center text-gray-400 text-sm">No assignments yet</p>
          )}
          {assignments?.data?.map((a) => (
            <div key={a.id} className="px-5 py-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{a.assigned_to.full_name}</p>
                <p className="text-xs text-gray-400">
                  Assigned {formatDate(a.assigned_at)} by {a.assigned_by.full_name}
                </p>
              </div>
              <div className="text-right">
                {a.returned_at ? (
                  <span className="badge-gray">Returned {formatDate(a.returned_at)}</span>
                ) : a.acknowledged_at ? (
                  <span className="badge-green">Acknowledged</span>
                ) : (
                  <span className="badge-yellow">Pending Acknowledgement</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Retire modal */}
      {showRetireModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-md w-full">
            <h3 className="font-semibold text-gray-900 mb-4">Retire Asset</h3>
            <p className="text-sm text-gray-500 mb-4">
              This will mark <strong>{asset.name}</strong> as retired. This action is logged.
            </p>
            <textarea
              value={retireReason}
              onChange={(e) => setRetireReason(e.target.value)}
              placeholder="Reason for retirement (min 5 characters)..."
              className="input mb-1"
              rows={3}
            />
            {retireReason.length > 0 && retireReason.length < 5 && (
              <p className="text-xs text-red-500 mb-3">Reason must be at least 5 characters</p>
            )}
            <div className="flex gap-3 justify-end mt-3">
              <button onClick={() => setShowRetireModal(false)} className="btn-secondary">Cancel</button>
              <button
                onClick={() => retire.mutate()}
                disabled={retireReason.length < 5 || retire.isPending}
                className="btn-danger"
              >
                {retire.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                Retire
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-gray-900">Edit Asset</h3>
              <button onClick={() => setShowEditModal(false)} className="btn-ghost p-1 text-gray-400">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'name', label: 'Name' },
                { key: 'brand', label: 'Brand' },
                { key: 'model', label: 'Model' },
                { key: 'serial_number', label: 'Serial Number' },
                { key: 'hostname', label: 'Hostname' },
                { key: 'ip_address', label: 'IP Address' },
                { key: 'mac_address', label: 'MAC Address' },
                { key: 'ram', label: 'RAM' },
                { key: 'hdd', label: 'Storage' },
                { key: 'processor', label: 'Processor' },
                { key: 'os_name', label: 'OS' },
                { key: 'label', label: 'Label' },
                { key: 'warranty_end', label: 'Warranty End', type: 'date' },
                { key: 'vendor_name', label: 'Vendor' },
                { key: 'purchased_from', label: 'Company Purchased From' },
              ].map(({ key, label, type }) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <input
                    type={type ?? 'text'}
                    value={editForm[key] ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="input"
                  />
                </div>
              ))}
              <div className="col-span-2">
                <label className="label">Notes</label>
                <textarea
                  value={editForm.notes ?? ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                  className="input"
                  rows={3}
                />
              </div>
              <div className="col-span-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.is_shared === 'true'}
                    onChange={(e) => setEditForm((f) => ({ ...f, is_shared: e.target.checked ? 'true' : 'false' }))}
                    className="rounded border-gray-300 w-4 h-4"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Shared Asset</p>
                    <p className="text-xs text-gray-400">Allows this asset to be assigned to multiple employees simultaneously (e.g. reception desktops)</p>
                  </div>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowEditModal(false)} className="btn-secondary">Cancel</button>
              <button
                onClick={() => update.mutate(editForm)}
                disabled={update.isPending}
                className="btn-primary"
              >
                {update.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}