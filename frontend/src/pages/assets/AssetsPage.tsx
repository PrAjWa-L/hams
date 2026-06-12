import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Search, Upload, Monitor, Laptop, Printer, Server } from 'lucide-react'
import { assetsApi, type AssetFilters } from '@/api/assets'
import { useAuthStore } from '@/store/auth'
import DataTable from '@/components/shared/DataTable'
import { AssetStatusBadge } from '@/components/shared/StatusBadge'
import { formatDate } from '@/lib/utils'

const STATUS_COLORS: Record<string, string> = {
  available:         '#dcfce7',
  assigned:          '#dbeafe',
  under_maintenance: '#fef9c3',
  retired:           '#f1f5f9',
  disposed:          '#fee2e2',
}
const STATUS_TEXT: Record<string, string> = {
  available:         '#15803d',
  assigned:          '#1d4ed8',
  under_maintenance: '#a16207',
  retired:           '#475569',
  disposed:          '#b91c1c',
}

export default function AssetsPage() {
  const { user } = useAuthStore()
  const canCreate = ['coo', 'it_head', 'it_team', 'management'].includes(user?.role ?? '')

  const [filters, setFilters] = useState<AssetFilters>({ page: 1, page_size: 20 })
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['assets', filters],
    queryFn: () => assetsApi.list(filters),
  })

  const { data: allData } = useQuery({
    queryKey: ['assets-counts'],
    queryFn: () => assetsApi.list({ page_size: 1 }),
  })

  const { data: categories } = useQuery({
    queryKey: ['asset-categories'],
    queryFn: () => assetsApi.categories.list('IT'),
  })

  const quickFilters = [
    { label: 'Laptops',  name: 'Laptop',  icon: Laptop },
    { label: 'Desktops', name: 'Desktop', icon: Monitor },
    { label: 'Printers', name: 'Printer', icon: Printer },
  ]
  const activeCategoryId = filters.category_id

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setFilters((f) => ({ ...f, search, page: 1 }))
  }

  const total = data?.meta?.total ?? 0

  return (
    <div>
      {/* ── Header ─────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <Server size={18} style={{ color: '#6b7280' }} />
            <p style={{ fontSize: '11px', fontWeight: 500, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Asset Registry
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '2.5rem', fontWeight: 500, letterSpacing: '-0.04em', lineHeight: 1, color: '#111827' }}>
              {total.toString().padStart(3, '0')}
            </span>
            <span style={{ fontSize: '13px', color: '#9ca3af' }}>assets tracked</span>
          </div>
        </div>
        {canCreate && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link to="/assets/import" className="btn-secondary" style={{ fontSize: '13px', gap: '6px' }}>
              <Upload size={14} /> Import
            </Link>
            <Link to="/assets/new" className="btn-primary" style={{ fontSize: '13px', gap: '6px' }}>
              <Plus size={14} /> New Asset
            </Link>
          </div>
        )}
      </div>

      {/* ── Category pills ─────────────────────────── */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilters((f) => ({ ...f, category_id: undefined, page: 1 }))}
          style={{
            padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
            border: '1px solid',
            borderColor: !activeCategoryId ? '#1a1f2e' : '#d1d9e0',
            background: !activeCategoryId ? '#1a1f2e' : 'white',
            color: !activeCategoryId ? 'white' : '#6b7280',
            cursor: 'pointer', transition: 'all 0.15s', letterSpacing: '0.01em',
          }}
        >
          All
        </button>
        {quickFilters.map(({ label, name, icon: Icon }) => {
          const cat = categories?.find((c) => c.name.toLowerCase() === name.toLowerCase())
          if (!cat) return null
          const active = activeCategoryId === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => setFilters((f) => ({ ...f, category_id: active ? undefined : cat.id, page: 1 }))}
              style={{
                padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
                border: '1px solid',
                borderColor: active ? '#1a1f2e' : '#d1d9e0',
                background: active ? '#1a1f2e' : 'white',
                color: active ? 'white' : '#6b7280',
                cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: '5px',
              }}
            >
              <Icon size={12} />
              {label}
            </button>
          )
        })}
      </div>

      {/* ── Search + status filter ─────────────────── */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '6px', flex: 1, maxWidth: '420px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, serial, hostname…"
              className="input"
              style={{ paddingLeft: '32px', fontSize: '13px' }}
            />
          </div>
          <button type="submit" className="btn-secondary" style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>Search</button>
        </form>

        <select
          className="input"
          style={{ width: '150px', fontSize: '13px' }}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined, page: 1 }))}
        >
          <option value="">All status</option>
          <option value="available">Available</option>
          <option value="assigned">Assigned</option>
          <option value="under_maintenance">Maintenance</option>
          <option value="retired">Retired</option>
        </select>

        {user?.role === 'coo' && (
          <select
            className="input"
            style={{ width: '130px', fontSize: '13px' }}
            onChange={(e) => setFilters((f) => ({ ...f, domain: e.target.value || undefined, page: 1 }))}
          >
            <option value="">All domains</option>
            <option value="IT">IT</option>
            <option value="FACILITY">Facility</option>
          </select>
        )}
      </div>

      {/* ── Table ─────────────────────────────────── */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <DataTable
          isLoading={isLoading}
          data={data?.data ?? []}
          meta={data?.meta}
          onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
          emptyMessage="No assets found."
          columns={[
            {
              key: 'asset_id',
              header: 'Asset ID',
              width: '130px',
              render: (row) => (
                <Link
                  to={`/assets/${row.id}`}
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 500, color: '#2563eb', textDecoration: 'none', letterSpacing: '0.03em' }}
                >
                  {row.asset_id}
                </Link>
              ),
            },
            {
              key: 'name',
              header: 'Asset',
              render: (row) => (
                <div>
                  <p style={{ fontWeight: 500, fontSize: '13px', color: '#111827', marginBottom: '1px' }}>{row.name}</p>
                  <p style={{ fontSize: '11px', color: '#9ca3af', fontFamily: "'JetBrains Mono', monospace" }}>
                    {[row.brand, row.model].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
              ),
            },
            {
              key: 'category',
              header: 'Type',
              width: '110px',
              render: (row) => (
                <span style={{
                  fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: '4px',
                  background: '#f1f5f9', color: '#475569', letterSpacing: '0.02em',
                }}>
                  {row.category.name}
                </span>
              ),
            },
            {
              key: 'department',
              header: 'Location',
              render: (row) => (
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  <p style={{ marginBottom: '1px' }}>{row.department?.name ?? '—'}</p>
                  {row.floor && <p style={{ fontSize: '11px', color: '#9ca3af' }}>{row.floor} floor</p>}
                </div>
              ),
            },
            {
              key: 'warranty',
              header: 'Warranty',
              width: '110px',
              render: (row) => (
                <span style={{ fontSize: '12px', color: '#6b7280', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>
                  {formatDate(row.warranty_end) ?? '—'}
                </span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              width: '120px',
              render: (row) => (
                <span style={{
                  fontSize: '11px', fontWeight: 500, padding: '3px 8px', borderRadius: '4px',
                  background: STATUS_COLORS[row.status] ?? '#f1f5f9',
                  color: STATUS_TEXT[row.status] ?? '#475569',
                  letterSpacing: '0.02em', textTransform: 'capitalize',
                }}>
                  {row.status.replace('_', ' ')}
                </span>
              ),
            },
          ]}
        />
      </div>
    </div>
  )
}