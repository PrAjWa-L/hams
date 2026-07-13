import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Search, Upload, Monitor, Laptop, Printer } from 'lucide-react'
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
      {/* ── Header — rendered on dark gradient ──────── */}
      <div style={{ marginBottom: '32px' }}>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>
          Pages / Assets
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '2.5rem', fontWeight: 500, letterSpacing: '-0.04em', lineHeight: 1, color: '#ffffff' }}>
                {total.toString().padStart(3, '0')}
              </span>
              <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)' }}>assets tracked</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', marginTop: '4px' }}>Asset Registry</p>
          </div>
          {canCreate && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <Link to="/assets/import" style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)',
                textDecoration: 'none', backdropFilter: 'blur(4px)', transition: 'background 0.15s',
              }}>
                <Upload size={14} /> Import
              </Link>
              <Link to="/assets/new" style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                background: '#ffffff', color: '#344767', border: 'none',
                textDecoration: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', transition: 'box-shadow 0.15s',
              }}>
                <Plus size={14} /> New Asset
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Filters card — floats below the gradient ── */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '16px' }}>
        {/* Category pills */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilters((f) => ({ ...f, category_id: undefined, page: 1 }))}
            style={{
              padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
              border: '1px solid',
              borderColor: !activeCategoryId ? '#344767' : '#d2d6da',
              background: !activeCategoryId ? '#344767' : 'transparent',
              color: !activeCategoryId ? 'white' : '#8392ab',
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
                  padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                  border: '1px solid',
                  borderColor: active ? '#344767' : '#d2d6da',
                  background: active ? '#344767' : 'transparent',
                  color: active ? 'white' : '#8392ab',
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

        {/* Search + status filter */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '6px', flex: 1, maxWidth: '420px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#8392ab', pointerEvents: 'none' }} />
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
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#6b7280' }}>
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