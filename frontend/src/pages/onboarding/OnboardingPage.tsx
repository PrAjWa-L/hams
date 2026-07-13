import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { onboardingApi } from '@/api/workflow'
import { useAuthStore } from '@/store/auth'
import PageHeader from '@/components/shared/PageHeader'
import DataTable from '@/components/shared/DataTable'
import { OnboardingStatusBadge } from '@/components/shared/StatusBadge'
import { formatDate } from '@/lib/utils'

const STATUSES = ['pending_hr_approval', 'pending_coo_approval', 'approved', 'rejected', 'in_progress', 'completed']

export default function OnboardingPage() {
  const { user } = useAuthStore()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['onboarding', page, status],
    queryFn: () => onboardingApi.list({ status: status || undefined }),
  })

  const canCreate = ['it_head', 'management', 'coo'].includes(user?.role ?? '')

  return (
    <div>
      <PageHeader
        title="Onboarding Requests"
        subtitle={`${data?.meta?.total ?? 0} total requests`}
        actions={
          canCreate ? (
            <Link to="/onboarding/new" className="btn-primary">
              <Plus size={16} /> New Request
            </Link>
          ) : undefined
        }
      />

      <div className="flex gap-3 mb-4">
        <select
          className="input w-48"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      <DataTable
        isLoading={isLoading}
        data={data?.data ?? []}
        meta={data?.meta}
        onPageChange={setPage}
        emptyMessage="No onboarding requests found"
        columns={[
          {
            key: 'employee',
            header: 'Employee',
            render: (row) => (
              <div>
                <p className="font-medium text-sm">{row.employee_name}</p>
                <p className="text-xs text-gray-400">{row.employee_emp_id}</p>
              </div>
            ),
          },
          {
            key: 'designation',
            header: 'Role / Dept',
            render: (row) => (
              <div>
                <p className="text-sm">{row.employee_designation || '—'}</p>
                <p className="text-xs text-gray-400">{row.employee_department || ''}</p>
              </div>
            ),
          },
          {
            key: 'requested_by',
            header: 'Requested By',
            render: (row) => <span className="text-sm">{row.requested_by.full_name}</span>,
          },
          {
            key: 'requirements',
            header: 'Requirements',
            render: (row) => (
              <span className="text-sm text-gray-600">
                {row.asset_requirements.length} item{row.asset_requirements.length !== 1 ? 's' : ''}
              </span>
            ),
          },
          {
            key: 'join_date',
            header: 'Join Date',
            render: (row) => <span className="text-sm">{row.join_date ? formatDate(row.join_date) : '—'}</span>,
          },
          {
            key: 'status',
            header: 'Status',
            render: (row) => <OnboardingStatusBadge status={row.status} />,
          },
          {
            key: 'actions',
            header: '',
            width: '80px',
            render: (row) => (
              <Link to={`/onboarding/${row.id}`} className="text-xs text-primary-600 hover:underline">
                View
              </Link>
            ),
          },
        ]}
      />
    </div>
  )
}