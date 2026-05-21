import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, Package, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { assignmentsApi } from '@/api/workflow'
import PageHeader from '@/components/shared/PageHeader'
import { AssetStatusBadge } from '@/components/shared/StatusBadge'
import { formatDate } from '@/lib/utils'

export default function MyAssetsPage() {
  const qc = useQueryClient()

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['my-assets'],
    queryFn: () => assignmentsApi.myAssets(true),
  })

  const acknowledge = useMutation({
    mutationFn: assignmentsApi.acknowledge,
    onSuccess: () => {
      toast.success('Receipt acknowledged')
      qc.invalidateQueries({ queryKey: ['my-assets'] })
    },
    onError: () => toast.error('Failed to acknowledge'),
  })

  const returnAsset = useMutation({
    mutationFn: (id: string) => assignmentsApi.return(id),
    onSuccess: () => {
      toast.success('Asset returned successfully')
      qc.invalidateQueries({ queryKey: ['my-assets'] })
    },
  })

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="animate-spin text-gray-400" />
    </div>
  )

  return (
    <div>
      <PageHeader
        title="My Assets"
        subtitle={`${assignments?.length ?? 0} assets assigned to you`}
      />

      {assignments?.length === 0 && (
        <div className="card p-12 text-center">
          <Package size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No assets assigned to you yet</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {assignments?.map((a) => (
          <div key={a.id} className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <Link to={`/assets/${a.asset.id}`} className="font-medium text-gray-900 hover:text-primary-600">
                  {a.asset.name}
                </Link>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{a.asset.asset_id}</p>
              </div>
              <AssetStatusBadge status={a.asset.status} />
            </div>

            <div className="space-y-1.5 text-sm text-gray-500 mb-4">
              <p>{a.asset.category.name} · {a.asset.category.domain}</p>
              {a.asset.department && <p>📍 {a.asset.department.name}{a.asset.floor ? ` — ${a.asset.floor}` : ''}</p>}
              <p>Assigned {formatDate(a.assigned_at)} by {a.assigned_by.full_name}</p>
            </div>

            <div className="flex items-center justify-between">
              {a.acknowledged_at ? (
                <span className="badge-green flex items-center gap-1">
                  <CheckCircle size={11} /> Acknowledged {formatDate(a.acknowledged_at)}
                </span>
              ) : (
                <button
                  onClick={() => acknowledge.mutate(a.id)}
                  disabled={acknowledge.isPending}
                  className="btn-primary text-xs py-1.5"
                >
                  {acknowledge.isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                  Acknowledge Receipt
                </button>
              )}
              <button
                onClick={() => returnAsset.mutate(a.id)}
                className="text-xs text-red-500 hover:underline"
              >
                Return Asset
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
