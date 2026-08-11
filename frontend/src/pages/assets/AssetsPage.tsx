import { useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Boxes, Download, MapPin, Plus, Search, Upload } from 'lucide-react'
import { assetsApi, type AssetFilters } from '@/api/assets'
import { useAuthStore } from '@/store/auth'
import DataTable from '@/components/shared/DataTable'
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
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const token = localStorage.getItem('access_token')
      const params = new URLSearchParams()
      if (filters.status) params.set('status', filters.status)
      if (filters.domain) params.set('domain', filters.domain)
      if (filters.category_id) params.set('category_id', filters.category_id)
      if (filters.category_name) params.set('category_name', filters.category_name)
      if (filters.site) params.set('site', filters.site)
      if (filters.search) params.set('search', filters.search)
      const resp = await fetch(`/api/v1/assets/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!resp.ok) throw new Error('Export failed')
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `HAMS_Assets_${new Date().toISOString().slice(0,10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('Export failed — please try again')
    } finally {
      setExporting(false)
    }
  }

  const [filters, setFilters] = useState<AssetFilters>({ page: 1, page_size: 20 })
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['assets', filters],
    queryFn: () => assetsApi.list(filters),
  })

  // Stat card counts — filtered by same site/branch but not by status
  const baseFilters = { ...filters, status: undefined, page: 1, page_size: 1 }
  const { data: countAll }   = useQuery({ queryKey: ['assets-count', 'all',         baseFilters], queryFn: () => assetsApi.list({ ...baseFilters }) })
  const { data: countAvail } = useQuery({ queryKey: ['assets-count', 'available',   baseFilters], queryFn: () => assetsApi.list({ ...baseFilters, status: 'available' }) })
  const { data: countAssign }= useQuery({ queryKey: ['assets-count', 'assigned',    baseFilters], queryFn: () => assetsApi.list({ ...baseFilters, status: 'assigned' }) })
  const { data: countMaint } = useQuery({ queryKey: ['assets-count', 'maintenance', baseFilters], queryFn: () => assetsApi.list({ ...baseFilters, status: 'under_maintenance' }) })
  const { data: countRetired}= useQuery({ queryKey: ['assets-count', 'retired',     baseFilters], queryFn: () => assetsApi.list({ ...baseFilters, status: 'retired' }) })

  const STAT_CARDS = [
    { label: 'Total Assets',  key: '',                  color: 'stat-icon-box-dark',    icon: '📦', count: countAll?.meta?.total },
    { label: 'Available',     key: 'available',         color: 'stat-icon-box-success', icon: '✅', count: countAvail?.meta?.total },
    { label: 'Assigned',      key: 'assigned',          color: 'stat-icon-box-info',    icon: '👤', count: countAssign?.meta?.total },
    { label: 'Maintenance',   key: 'under_maintenance', color: 'stat-icon-box-warning', icon: '🔧', count: countMaint?.meta?.total },
    { label: 'Retired',       key: 'retired',           color: 'stat-icon-box-danger',  icon: '🗃️', count: countRetired?.meta?.total },
  ]

  const { data: categories } = useQuery({
    queryKey: ['asset-categories'],
    queryFn: () => assetsApi.categories.list('IT'),
  })

  const SITE_FILTERS = [
    { label: 'Cutis', value: 'Cutis' },
    { label: 'HSR', value: 'HSR' },
    { label: 'Kochi', value: 'Kochi' },
    { label: 'Chandra Layout', value: 'Chandra Layout' },
  ]

  // Each quick-filter count keeps the other active filters, while ignoring its
  // own dimension. This makes the cards useful together (for example HSR + NAS).
  const branchCountBase: AssetFilters = {
    ...filters,
    site: undefined,
    page: 1,
    page_size: 1,
  }
  const branchCountQueries = useQueries({
    queries: SITE_FILTERS.map((site) => ({
      queryKey: ['assets-count', 'site', site.value, branchCountBase],
      queryFn: () => assetsApi.list({ ...branchCountBase, site: site.value }),
    })),
  })

  const typeCountBase: AssetFilters = {
    ...filters,
    category_id: undefined,
    category_name: undefined,
    page: 1,
    page_size: 1,
  }
  const typeCountQueries = useQueries({
    queries: (categories ?? []).map((category) => ({
      queryKey: ['assets-count', 'category', category.id, typeCountBase],
      queryFn: () => assetsApi.list({ ...typeCountBase, category_id: category.id }),
    })),
  })

  const CATEGORY_FILTERS = [
    { label: 'Laptop',          name: 'Laptop' },
    { label: 'Desktop',         name: 'Desktop' },
    { label: 'Printer',         name: 'Printer' },
    { label: 'Rental Printer',  name: 'Rental Printer' },
    { label: 'Server',          name: 'Server' },
    { label: 'NAS',             name: 'NAS' },
    { label: 'Network',         name: 'Network' },
    { label: 'AP',              name: 'AP' },
    { label: 'Firewall',        name: 'Firewall' },
    { label: 'NVR',             name: 'NVR' },
  ]

  const activeCategoryId = filters.category_id
  const activeCategoryName = filters.category_name
    ?? categories?.find((category) => category.id === activeCategoryId)?.name
    ?? ''
  const activeSite = filters.site ?? ''

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
              <button
                onClick={handleExport}
                disabled={exporting}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                  background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)',
                  backdropFilter: 'blur(4px)', cursor: exporting ? 'default' : 'pointer',
                  opacity: exporting ? 0.7 : 1, fontFamily: 'inherit',
                }}
              >
                <Download size={14} /> {exporting ? 'Exporting…' : 'Export'}
              </button>
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

      {/* ── Stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '20px' }}>
        {STAT_CARDS.map(({ label, key, color, icon, count }) => {
          const isActive = (filters.status ?? '') === key
          return (
            <div
              key={label}
              className="stat-card card-hover"
              style={{ paddingTop: '44px', cursor: 'pointer', outline: isActive ? '2px solid #1d7d99' : 'none', outlineOffset: '2px' }}
              onClick={() => setFilters((f) => ({ ...f, status: key || undefined, page: 1 }))}
            >
              <div className={`stat-icon-box ${color}`} style={{ fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {icon}
              </div>
              <p className="stat-label" style={{ marginTop: '8px' }}>{label}</p>
              <p className="stat-value">{count ?? '—'}</p>
            </div>
          )
        })}
      </div>

      {/* ── Quick filters by workbook grouping ── */}
      <div className="card" style={{ padding: '18px 20px', marginBottom: '20px' }}>
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#344767', marginBottom: '3px' }}>
            Quick asset filters
          </p>
          <p style={{ fontSize: '11px', color: '#8392ab' }}>
            Select a branch or asset type to narrow the registry. Select it again to clear it.
          </p>
        </div>

        <QuickFilterSection title="Branch" icon={<MapPin size={14} />}>
          {SITE_FILTERS.map((site, index) => (
            <QuickFilterCard
              key={site.value}
              label={site.label}
              count={branchCountQueries[index]?.data?.meta?.total}
              active={activeSite === site.value}
              onClick={() => setFilters((current) => ({
                ...current,
                site: current.site === site.value ? undefined : site.value,
                page: 1,
              }))}
            />
          ))}
        </QuickFilterSection>

        <QuickFilterSection title="Asset type" icon={<Boxes size={14} />}>
          {(categories ?? []).map((category, index) => (
            <QuickFilterCard
              key={category.id}
              label={category.name}
              count={typeCountQueries[index]?.data?.meta?.total}
              active={activeCategoryId === category.id || activeCategoryName === category.name}
              onClick={() => setFilters((current) => {
                const isActive = current.category_id === category.id
                  || current.category_name === category.name
                return {
                  ...current,
                  category_id: isActive ? undefined : category.id,
                  category_name: undefined,
                  page: 1,
                }
              })}
            />
          ))}
        </QuickFilterSection>
      </div>

      {/* ── Filters card — floats below the gradient ── */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '16px' }}>

        {/* Branch / site pills */}
        <div style={{ marginBottom: '10px' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, color: '#8392ab', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Branch</p>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['All', ...SITE_FILTERS.map(s => s.label)].map((site) => {
              const active = site === 'All' ? !activeSite : activeSite === site
              return (
                <button
                  key={site}
                  onClick={() => {
                    const val = site === 'All' ? '' : site
                    setFilters((f) => ({ ...f, site: val || undefined, page: 1 }))
                  }}
                  style={{
                    padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                    border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s',
                    borderColor: active ? '#1d7d99' : '#d2d6da',
                    background: active ? '#1d7d99' : 'transparent',
                    color: active ? 'white' : '#8392ab',
                    fontFamily: 'inherit',
                  }}
                >
                  {site}
                </button>
              )
            })}
          </div>
        </div>

        {/* Category pills */}
        <div style={{ marginBottom: '14px' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, color: '#8392ab', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Category</p>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setFilters((f) => ({ ...f, category_id: undefined, category_name: undefined, page: 1 }))}
              style={{
                padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s',
                borderColor: !activeCategoryId && !activeCategoryName ? '#344767' : '#d2d6da',
                background: !activeCategoryId && !activeCategoryName ? '#344767' : 'transparent',
                color: !activeCategoryId && !activeCategoryName ? 'white' : '#8392ab',
                fontFamily: 'inherit',
              }}
            >
              All
            </button>
            {CATEGORY_FILTERS.map(({ label, name }) => {
              const active = activeCategoryName === name
              return (
                <button
                  key={name}
                  onClick={() => setFilters((f) => ({
                    ...f,
                    category_id: undefined,
                    category_name: active ? undefined : name,
                    page: 1,
                  }))}
                  style={{
                    padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                    border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s',
                    borderColor: active ? '#344767' : '#d2d6da',
                    background: active ? '#344767' : 'transparent',
                    color: active ? 'white' : '#8392ab',
                    fontFamily: 'inherit',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
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
            value={filters.status ?? ''}
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

function QuickFilterSection({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div style={{ marginTop: '14px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px',
        color: '#8392ab', fontSize: '10px', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        {icon}
        <span>{title}</span>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '8px',
      }}>
        {children}
      </div>
    </div>
  )
}

function QuickFilterCard({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count?: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={{
        minWidth: 0,
        padding: '10px 12px',
        borderRadius: '8px',
        border: `1.5px solid ${active ? '#1d7d99' : '#e9ecef'}`,
        background: active ? '#e8f5f8' : '#ffffff',
        color: active ? '#17667c' : '#344767',
        cursor: 'pointer',
        fontFamily: 'inherit',
        textAlign: 'left',
        transition: 'border-color 0.15s, background 0.15s, transform 0.15s',
      }}
    >
      <span style={{
        display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        fontSize: '11px', fontWeight: 600, marginBottom: '4px',
      }}>
        {label}
      </span>
      <span style={{
        display: 'block', fontFamily: "'JetBrains Mono', monospace",
        fontSize: '18px', fontWeight: 500, lineHeight: 1,
      }}>
        {count ?? '—'}
      </span>
    </button>
  )
}
