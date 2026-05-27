import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { onboardingApi } from '@/api/workflow'
import { useAuthStore } from '@/store/auth'
import { OnboardingStatusBadge } from '@/components/shared/StatusBadge'
import { formatDate, formatDateTime } from '@/lib/utils'

export default function OnboardingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [rejectReason, setRejectReason] = useState('')
  const [showReject, setShowReject] = useState(false)

  const { data: req, isLoading } = useQuery({
    queryKey: ['onboarding', id],
    queryFn: () => onboardingApi.get(id!),
    enabled: !!id,
  })

  const approve = useMutation({
    mutationFn: () => onboardingApi.approve(id!),
    onSuccess: () => { toast.success('Request approved'); qc.invalidateQueries({ queryKey: ['onboarding', id] }) },
    onError: () => toast.error('Failed to approve'),
  })

  const reject = useMutation({
    mutationFn: () => onboardingApi.reject(id!, rejectReason),
    onSuccess: () => { toast.success('Request rejected'); qc.invalidateQueries({ queryKey: ['onboarding', id] }); setShowReject(false) },
    onError: () => toast.error('Failed to reject'),
  })

  const complete = useMutation({
    mutationFn: () => onboardingApi.complete(id!),
    onSuccess: () => { toast.success('Marked as complete'); qc.invalidateQueries({ queryKey: ['onboarding', id] }) },
  })

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" /></div>
  if (!req) return <p>Not found</p>

  const isCOO = user?.role === 'coo'
  const canComplete = ['it_head', 'management'].includes(user?.role ?? '') && ['approved', 'in_progress'].includes(req.status)
  const canApprove = isCOO && req.status === 'pending_approval'

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/onboarding" className="btn-ghost p-2"><ArrowLeft size={18} /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">{req.employee_name}</h1>
            <OnboardingStatusBadge status={req.status} />
          </div>
          <p className="text-sm text-gray-500">Created {formatDateTime(req.created_at)}</p>
        </div>
        <div className="flex gap-2">
          {canApprove && (
            <>
              <button onClick={() => setShowReject(true)} className="btn-secondary text-red-600 border-red-200 hover:bg-red-50">
                <XCircle size={16} /> Reject
              </button>
              <button onClick={() => approve.mutate()} disabled={approve.isPending} className="btn-primary">
                {approve.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={16} />}
                Approve
              </button>
            </>
          )}
          {canComplete && (
            <button onClick={() => complete.mutate()} disabled={complete.isPending} className="btn-primary">
              {complete.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
              Mark Complete
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* New joiner info */}
        <div className="card p-5 space-y-3">
          <h3 className="font-medium text-gray-900 text-sm">New Joiner</h3>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-gray-400">Name</p>
              <p className="text-sm font-medium">{req.employee_name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Employee ID</p>
              <p className="text-sm font-medium">{req.employee_emp_id}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Email</p>
              <p className="text-sm font-medium">{req.employee_email}</p>
            </div>
            {req.employee_phone && (
              <div>
                <p className="text-xs text-gray-400">Phone</p>
                <p className="text-sm font-medium">{req.employee_phone}</p>
              </div>
            )}
            {req.employee_designation && (
              <div>
                <p className="text-xs text-gray-400">Designation</p>
                <p className="text-sm font-medium">{req.employee_designation}</p>
              </div>
            )}
            {req.employee_department && (
              <div>
                <p className="text-xs text-gray-400">Department</p>
                <p className="text-sm font-medium">{req.employee_department}</p>
              </div>
            )}
            {req.join_date && (
              <div>
                <p className="text-xs text-gray-400">Join Date</p>
                <p className="text-sm font-medium">{formatDate(req.join_date)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Request info */}
        <div className="card p-5 space-y-3">
          <h3 className="font-medium text-gray-900 text-sm">Request Info</h3>
          <div>
            <p className="text-xs text-gray-400">Raised By</p>
            <p className="text-sm font-medium">{req.requested_by.full_name}</p>
            <p className="text-xs text-gray-400">{req.requested_by.role}</p>
          </div>
          {req.approved_by && (
            <div>
              <p className="text-xs text-gray-400">Approved By</p>
              <p className="text-sm font-medium">{req.approved_by.full_name}</p>
              <p className="text-xs text-gray-400">{req.approved_at ? formatDateTime(req.approved_at) : ''}</p>
            </div>
          )}
          {req.rejection_reason && (
            <div>
              <p className="text-xs text-red-400">Rejection Reason</p>
              <p className="text-sm text-red-600">{req.rejection_reason}</p>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="card p-5">
          <h3 className="font-medium text-gray-900 text-sm mb-3">Notes</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{req.notes || '—'}</p>
        </div>
      </div>

      {/* Asset requirements */}
      <div className="card mt-6">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-medium text-gray-900">Asset Requirements</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {req.asset_requirements.map((item, i) => (
            <div key={i} className="px-5 py-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{item.category}</p>
                {item.notes && <p className="text-xs text-gray-400 mt-0.5">{item.notes}</p>}
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-xs font-medium ${item.domain === 'IT' ? 'text-blue-500' : 'text-green-600'}`}>
                  {item.domain}
                </span>
                <span className="badge-gray">Qty: {item.quantity}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reject modal */}
      {showReject && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-md w-full">
            <h3 className="font-semibold mb-4">Reject Onboarding Request</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection…"
              className="input mb-4"
              rows={3}
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowReject(false)} className="btn-secondary">Cancel</button>
              <button
                onClick={() => reject.mutate()}
                disabled={!rejectReason || reject.isPending}
                className="btn-danger"
              >
                {reject.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}