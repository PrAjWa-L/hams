import { useQuery } from '@tanstack/react-query'
import { Server, Users, ClipboardList, AlertTriangle, CheckCircle, Clock, Package } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { assetsApi } from '@/api/assets'
import { onboardingApi, assignmentsApi, maintenanceApi } from '@/api/workflow'
import { usersApi } from '@/api/users'
import { formatDate } from '@/lib/utils'
import { AssetStatusBadge, OnboardingStatusBadge } from '@/components/shared/StatusBadge'
import { Link } from 'react-router-dom'

function StatCard({ label, value, icon: Icon, color, to }: {
  label: string; value: number | string; icon: React.ComponentType<{ size?: number; className?: string }>
  color: string; to?: string
}) {
  const content = (
    <div className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  )
  return to ? <Link to={to}>{content}</Link> : content
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const role = user?.role

  const { data: assetsData } = useQuery({
    queryKey: ['assets', 'dashboard'],
    queryFn: () => assetsApi.list({ page_size: 1 }),
  })

  const { data: pendingOnboarding } = useQuery({
    queryKey: ['onboarding', 'pending'],
    queryFn: () => onboardingApi.list({ status: 'pending_approval' }),
    enabled: ['coo', 'hr', 'it_head', 'management'].includes(role ?? ''),
  })

  const { data: myAssets } = useQuery({
    queryKey: ['my-assets'],
    queryFn: () => assignmentsApi.myAssets(true),
    enabled: role === 'employee',
  })

  const { data: warrantyExpiring } = useQuery({
    queryKey: ['warranty-expiring'],
    queryFn: () => assetsApi.list({ warranty_expiring_days: 90, page_size: 5 }),
    enabled: ['coo', 'it_head', 'management'].includes(role ?? ''),
  })

  const { data: upcomingMaintenance } = useQuery({
    queryKey: ['maintenance', 'upcoming'],
    queryFn: () => maintenanceApi.upcoming(30),
    enabled: ['coo', 'it_head', 'it_team', 'management'].includes(role ?? ''),
  })

  const { data: recentAssets } = useQuery({
    queryKey: ['assets', 'recent'],
    queryFn: () => assetsApi.list({ page_size: 5 }),
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">
          Good morning, {user?.full_name?.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-0.5 capitalize">
          {role?.replace('_', ' ')} Dashboard
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Assets"
          value={assetsData?.meta?.total ?? '—'}
          icon={Server}
          color="bg-blue-500"
          to="/assets"
        />
        {role !== 'employee' && (
          <StatCard
            label="Pending Approvals"
            value={pendingOnboarding?.meta?.total ?? '—'}
            icon={Clock}
            color="bg-yellow-500"
            to="/onboarding"
          />
        )}
        {role === 'employee' && (
          <StatCard
            label="My Assets"
            value={myAssets?.length ?? '—'}
            icon={Package}
            color="bg-green-500"
            to="/my-assets"
          />
        )}
        <StatCard
          label="Warranty Expiring (90d)"
          value={warrantyExpiring?.meta?.total ?? '—'}
          icon={AlertTriangle}
          color="bg-red-500"
          to="/assets"
        />
        <StatCard
          label="Maintenance Due (30d)"
          value={upcomingMaintenance?.length ?? '—'}
          icon={CheckCircle}
          color="bg-purple-500"
          to="/maintenance"
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Recent assets */}
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-medium text-gray-900">Recent Assets</h2>
            <Link to="/assets" className="text-xs text-primary-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentAssets?.data?.map((asset) => (
              <Link
                key={asset.id}
                to={`/assets/${asset.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{asset.name}</p>
                  <p className="text-xs text-gray-400">{asset.asset_id} · {asset.category.name}</p>
                </div>
                <AssetStatusBadge status={asset.status} />
              </Link>
            ))}
            {!recentAssets?.data?.length && (
              <p className="px-5 py-6 text-sm text-gray-400 text-center">No assets yet</p>
            )}
          </div>
        </div>

        {/* Pending onboarding */}
        {role !== 'employee' && (
          <div className="card">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-medium text-gray-900">Pending Onboarding</h2>
              <Link to="/onboarding" className="text-xs text-primary-600 hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-gray-50">
              {pendingOnboarding?.data?.map((req) => (
                <Link
                  key={req.id}
                  to={`/onboarding/${req.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{req.employee.full_name}</p>
                    <p className="text-xs text-gray-400">
                      Requested by {req.requested_by.full_name} · {formatDate(req.created_at)}
                    </p>
                  </div>
                  <OnboardingStatusBadge status={req.status} />
                </Link>
              ))}
              {!pendingOnboarding?.data?.length && (
                <p className="px-5 py-6 text-sm text-gray-400 text-center">No pending requests</p>
              )}
            </div>
          </div>
        )}

        {/* Warranty expiring */}
        {['coo', 'it_head', 'management'].includes(role ?? '') && (
          <div className="card">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-medium text-gray-900">Warranty Expiring Soon</h2>
              <span className="text-xs text-gray-400">Next 90 days</span>
            </div>
            <div className="divide-y divide-gray-50">
              {warrantyExpiring?.data?.map((asset) => (
                <Link
                  key={asset.id}
                  to={`/assets/${asset.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{asset.name}</p>
                    <p className="text-xs text-gray-400">{asset.asset_id}</p>
                  </div>
                  <p className="text-xs text-red-500 font-medium">
                    Expires {formatDate(asset.warranty_end)}
                  </p>
                </Link>
              ))}
              {!warrantyExpiring?.data?.length && (
                <p className="px-5 py-6 text-sm text-gray-400 text-center">No expiring warranties</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
