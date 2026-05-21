import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, QrCode, FileText, Clock, Loader2, AlertTriangle } from 'lucide-react'
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

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-gray-400" size={24} />
    </div>
  )

  if (!asset) return <p className="text-gray-500">Asset not found</p>

  const wDays = warrantyDaysLeft(asset.warranty_end)
  const canRetire = ['coo', 'it_head', 'management'].includes(user?.role ?? '')

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
          </div>
          <p className="text-sm text-gray-500 font-mono">{asset.asset_id}</p>
        </div>
        <div className="flex gap-2">
          {qrData?.qr_url && (
            <a href={qrData.qr_url} target="_blank" rel="noreferrer" className="btn-secondary">
              <QrCode size={16} /> QR Code
            </a>
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
              ['Vendor', asset.vendor?.name],
            ].map(([label, value]) => value && (
              <div key={label} className="flex justify-between">
                <span className="text-xs text-gray-400">{label}</span>
                <span className="text-sm text-gray-700 font-medium">{value}</span>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="card p-5 space-y-3">
              <h3 className="font-medium text-gray-900 text-sm">Purchase & Cost</h3>
              {[
                ['Purchase Date', formatDate(asset.purchase_date)],
                ['Purchase Cost', formatCurrency(asset.purchase_cost)],
                ['PO Reference', asset.po_reference],
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
              placeholder="Reason for retirement..."
              className="input mb-4"
              rows={3}
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowRetireModal(false)} className="btn-secondary">Cancel</button>
              <button
                onClick={() => retire.mutate()}
                disabled={!retireReason || retire.isPending}
                className="btn-danger"
              >
                {retire.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                Retire
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
