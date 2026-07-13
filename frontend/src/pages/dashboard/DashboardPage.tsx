import { useQuery } from '@tanstack/react-query'
import { Server, Users, ClipboardList, AlertTriangle, CheckCircle, Clock, Package } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { assetsApi } from '@/api/assets'
import { onboardingApi, assignmentsApi, maintenanceApi } from '@/api/workflow'
import { formatDate } from '@/lib/utils'
import { AssetStatusBadge, OnboardingStatusBadge } from '@/components/shared/StatusBadge'
import { Link } from 'react-router-dom'

interface StatCardProps {
  label: string
  value: number | string
  icon: React.ComponentType<{ size?: number; color?: string }>
  colorClass: string
  to?: string
  change?: string
}

function StatCard({ label, value, icon: Icon, colorClass, to, change }: StatCardProps) {
  const inner = (
    <div className="stat-card" style={{ paddingTop: '44px' }}>
      <div className={`stat-icon-box ${colorClass}`}>
        <Icon size={22} color="white" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '8px' }}>
        <div>
          <p className="stat-label">{label}</p>
          <p className="stat-value">{value}</p>
        </div>
        {change && (
          <p style={{ fontSize: '12px', color: '#8392ab', textAlign: 'right', marginTop: '2px' }}>{change}</p>
        )}
      </div>
    </div>
  )
  return to
    ? <Link to={to} style={{ textDecoration: 'none', display: 'block' }} className="card-hover">{inner}</Link>
    : <div className="card-hover">{inner}</div>
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

  const firstName = user?.full_name?.split(' ')[0] ?? 'there'

  return (
    <div>
      {/* Page header — rendered on dark gradient */}
      <div style={{ marginBottom: '40px' }}>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', marginBottom: '4px', fontWeight: 500 }}>
          Pages / Dashboard
        </p>
        <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: 700, margin: 0 }}>
          Welcome back, {firstName} 👋
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginTop: '4px', textTransform: 'capitalize' }}>
          {role?.replace('_', ' ')} Dashboard
        </p>
      </div>

      {/* Stat cards — floated over the gradient */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
        <StatCard
          label="Total Assets"
          value={assetsData?.meta?.total ?? '—'}
          icon={Server}
          colorClass="stat-icon-box-info"
          to="/assets"
        />
        {role !== 'employee' ? (
          <StatCard
            label="Pending Approvals"
            value={pendingOnboarding?.meta?.total ?? '—'}
            icon={Clock}
            colorClass="stat-icon-box-warning"
            to="/onboarding"
          />
        ) : (
          <StatCard
            label="My Assets"
            value={myAssets?.length ?? '—'}
            icon={Package}
            colorClass="stat-icon-box-success"
            to="/my-assets"
          />
        )}
        <StatCard
          label="Warranty Expiring"
          value={warrantyExpiring?.meta?.total ?? '—'}
          icon={AlertTriangle}
          colorClass="stat-icon-box-danger"
          to="/assets"
          change="Next 90 days"
        />
        <StatCard
          label="Maintenance Due"
          value={upcomingMaintenance?.length ?? '—'}
          icon={CheckCircle}
          colorClass="stat-icon-box-purple"
          to="/maintenance"
          change="Next 30 days"
        />
      </div>

      {/* Lower cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Recent Assets */}
        <div className="card">
          <div style={{
            padding: '20px 20px 16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: '1px solid #f0f2f5',
          }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#344767', margin: 0 }}>Recent Assets</h3>
              <p style={{ fontSize: '12px', color: '#8392ab', marginTop: '2px' }}>Latest registered assets</p>
            </div>
            <Link to="/assets" style={{
              fontSize: '12px', fontWeight: 600, color: '#344767',
              textDecoration: 'none', padding: '6px 14px', borderRadius: '6px',
              background: '#f0f2f5', transition: 'background 0.15s',
            }}>
              View all
            </Link>
          </div>
          <div>
            {recentAssets?.data?.map((asset) => (
              <Link
                key={asset.id}
                to={`/assets/${asset.id}`}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 20px', textDecoration: 'none',
                  borderBottom: '1px solid #f8f9fa', transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#fafbfc')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
                    background: 'linear-gradient(195deg, #49a3f1 0%, #1A73E8 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(26,115,232,0.3)',
                  }}>
                    <Server size={15} color="white" />
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#344767', margin: 0 }}>{asset.name}</p>
                    <p style={{ fontSize: '11px', color: '#8392ab', marginTop: '2px' }}>
                      {asset.asset_id} · {asset.category.name}
                    </p>
                  </div>
                </div>
                <AssetStatusBadge status={asset.status} />
              </Link>
            ))}
            {!recentAssets?.data?.length && (
              <p style={{ padding: '32px', textAlign: 'center', color: '#8392ab', fontSize: '13px' }}>
                No assets yet
              </p>
            )}
          </div>
        </div>

        {/* Pending Onboarding or Warranty */}
        {role !== 'employee' ? (
          <div className="card">
            <div style={{
              padding: '20px 20px 16px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: '1px solid #f0f2f5',
            }}>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#344767', margin: 0 }}>Pending Onboarding</h3>
                <p style={{ fontSize: '12px', color: '#8392ab', marginTop: '2px' }}>Requests awaiting approval</p>
              </div>
              <Link to="/onboarding" style={{
                fontSize: '12px', fontWeight: 600, color: '#344767',
                textDecoration: 'none', padding: '6px 14px', borderRadius: '6px',
                background: '#f0f2f5',
              }}>
                View all
              </Link>
            </div>
            <div>
              {pendingOnboarding?.data?.map((req) => (
                <Link
                  key={req.id}
                  to={`/onboarding/${req.id}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 20px', textDecoration: 'none',
                    borderBottom: '1px solid #f8f9fa', transition: 'background 0.12s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#fafbfc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(195deg, #FFA726 0%, #FB8C00 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: 700, color: 'white',
                      boxShadow: '0 2px 8px rgba(251,140,0,0.3)',
                    }}>
                      {req.employee_name?.charAt(0)?.toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#344767', margin: 0 }}>{req.employee_name}</p>
                      <p style={{ fontSize: '11px', color: '#8392ab', marginTop: '2px' }}>
                        By {req.requested_by.full_name} · {formatDate(req.created_at)}
                      </p>
                    </div>
                  </div>
                  <OnboardingStatusBadge status={req.status} />
                </Link>
              ))}
              {!pendingOnboarding?.data?.length && (
                <p style={{ padding: '32px', textAlign: 'center', color: '#8392ab', fontSize: '13px' }}>
                  No pending requests
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="card">
            <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #f0f2f5' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#344767', margin: 0 }}>Your Assets</h3>
              <p style={{ fontSize: '12px', color: '#8392ab', marginTop: '2px' }}>Assets assigned to you</p>
            </div>
            <div>
              {myAssets?.map((a: any) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderBottom: '1px solid #f8f9fa' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '8px',
                    background: 'linear-gradient(195deg, #66bb6a 0%, #43a047 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(67,160,71,0.3)',
                  }}>
                    <Package size={15} color="white" />
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#344767', margin: 0 }}>{a.asset?.name ?? 'Asset'}</p>
                    <p style={{ fontSize: '11px', color: '#8392ab', marginTop: '2px' }}>{a.asset?.asset_id}</p>
                  </div>
                </div>
              ))}
              {!myAssets?.length && (
                <p style={{ padding: '32px', textAlign: 'center', color: '#8392ab', fontSize: '13px' }}>No assets assigned</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}