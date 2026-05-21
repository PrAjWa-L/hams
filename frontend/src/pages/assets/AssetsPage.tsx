import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Search, Filter } from 'lucide-react'
import { assetsApi, type AssetFilters } from '@/api/assets'
import { useAuthStore } from '@/store/auth'
import PageHeader from '@/components/shared/PageHeader'
import DataTable from '@/components/shared/DataTable'
import { AssetStatusBadge } from '@/components/shared/StatusBadge'
import { formatDate } from '@/lib/utils'

export default function AssetsPage() {
  const { user } = useAuthStore()
  const canCreate = ['coo', 'it_head', 'it_team', 'management'].includes(user?.role ?? '')

  const [filters, setFilters] = useState<AssetFilters>({ page: 1, page_size: 20 })
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['assets', filters],
    queryFn: () => assetsApi.list(filters),
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setFilters((f) => ({ ...f, search, page: 1 }))
  }

  return (
    <div>
      <PageHeader
        title="Assets"
        subtitle={`${data?.meta?.total ?? 0} total assets`}
        actions={
          canCreate ? (
            <Link to="/assets/new" className="btn-primary">
              <Plus size={16} />
              Register Asset
            </Link>
          ) : undefined
        }
      />

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, code, serial..."
              className="input pl-9"
            />
          </div>
          <button type="submit" className="btn-secondary">Search</button>
        </form>

        <select
          className="input w-40"
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined, page: 1 }))}
        >
          <option value="">All Status</option>
          <option value="available">Available</option>
          <option value="assigned">Assigned</option>
          <option value="under_maintenance">Under Maintenance</option>
          <option value="retired">Retired</option>
        </select>

        {user?.role === 'coo' && (
          <select
            className="input w-36"
            onChange={(e) => setFilters((f) => ({ ...f, domain: e.target.value || undefined, page: 1 }))}
          >
            <option value="">All Domains</option>
            <option value="IT">IT</option>
            <option value="FACILITY">Facility</option>
          </select>
        )}
      </div>

      <DataTable
        isLoading={isLoading}
        data={data?.data ?? []}
        meta={data?.meta}
        onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
        emptyMessage="No assets found. Register your first asset."
        columns={[
          {
            key: 'asset_id',
            header: 'Asset ID',
            width: '130px',
            render: (row) => (
              <Link to={`/assets/${row.id}`} className="font-mono text-xs font-medium text-primary-600 hover:underline">
                {row.asset_id}
              </Link>
            ),
          },
          {
            key: 'name',
            header: 'Asset',
            render: (row) => (
              <div>
                <p className="font-medium text-gray-900">{row.name}</p>
                <p className="text-xs text-gray-400">{row.brand} {row.model}</p>
              </div>
            ),
          },
          {
            key: 'category',
            header: 'Category',
            render: (row) => (
              <div>
                <p className="text-sm">{row.category.name}</p>
                <span className={`text-xs ${row.category.domain === 'IT' ? 'text-blue-500' : 'text-green-600'}`}>
                  {row.category.domain}
                </span>
              </div>
            ),
          },
          {
            key: 'department',
            header: 'Location',
            render: (row) => (
              <div className="text-sm text-gray-600">
                <p>{row.department?.name ?? '—'}</p>
                {row.floor && <p className="text-xs text-gray-400">{row.floor}</p>}
              </div>
            ),
          },
          {
            key: 'warranty',
            header: 'Warranty End',
            render: (row) => (
              <span className="text-sm text-gray-600">{formatDate(row.warranty_end)}</span>
            ),
          },
          {
            key: 'status',
            header: 'Status',
            render: (row) => <AssetStatusBadge status={row.status} />,
          },
        ]}
      />
    </div>
  )
}
