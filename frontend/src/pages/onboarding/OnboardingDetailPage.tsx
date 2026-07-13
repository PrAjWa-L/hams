import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, CheckCircle, XCircle, Clock, UserCheck } from 'lucide-react'
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
  const [rejectStage, setRejectStage] = useState<'hr' | 'coo'>('hr')

  const { data: req, isLoading } = useQuery({
    queryKey: ['onboarding', id],
    queryFn: () => onboardingApi.get(id!),
    enabled: !!id,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['onboarding', id] })

  const hrApprove = useMutation({
    mutationFn: () => onboardingApi.hrApprove(id!),
    onSuccess: () => { toast.success('Forwarded to COO for final approval'); invalidate() },
    onError: () => toast.error('Failed to approve'),
  })

  const hrReject = useMutation({
    mutationFn: () => onboardingApi.hrReject(id!, rejectReason),
    onSuccess: () => { toast.success('Request rejected'); invalidate(); setShowReject(false) },
    onError: () => toast.error('Failed to reject'),
  })

  const cooApprove = useMutation({
    mutationFn: () => onboardingApi.approve(id!),
    onSuccess: () => { toast.success('Request approved — IT can now fulfil'); invalidate() },
    onError: () => toast.error('Failed to approve'),
  })

  const cooReject = useMutation({
    mutationFn: () => onboardingApi.reject(id!, rejectReason),
    onSuccess: () => { toast.success('Request rejected'); invalidate(); setShowReject(false) },
    onError: () => toast.error('Failed to reject'),
  })

  const complete = useMutation({
    mutationFn: () => onboardingApi.complete(id!),
    onSuccess: () => { toast.success('Marked as complete'); invalidate() },
  })

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><Loader2 className="animate-spin" style={{ color: '#8392ab' }} /></div>
  if (!req) return <p>Not found</p>

  const role = user?.role ?? ''
  const canHRApprove = role === 'hr' && req.status === 'pending_hr_approval'
  const canCOOApprove = role === 'coo' && req.status === 'pending_coo_approval'
  const canComplete = ['it_head', 'management'].includes(role) && ['approved', 'in_progress'].includes(req.status)

  // Workflow steps for the progress trail
  const steps = [
    { label: 'Submitted', sublabel: req.requested_by?.full_name, done: true },
    { label: 'HR Review', sublabel: req.hr_approved_by?.full_name ?? (req.status === 'pending_hr_approval' ? 'Awaiting HR' : null), done: !!req.hr_approved_at, active: req.status === 'pending_hr_approval' },
    { label: 'COO Approval', sublabel: req.approved_by?.full_name ?? (req.status === 'pending_coo_approval' ? 'Awaiting COO' : null), done: !!req.approved_at, active: req.status === 'pending_coo_approval' },
    { label: 'IT Fulfilment', sublabel: req.status === 'completed' ? 'Completed' : null, done: req.status === 'completed', active: req.status === 'approved' || req.status === 'in_progress' },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <Link to="/onboarding" style={{ padding: '6px', borderRadius: '8px', background: 'rgba(255,255,255,0.15)', color: 'white', display: 'flex' }}>
          <ArrowLeft size={18} />
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: 0 }}>{req.employee_name}</h1>
            <OnboardingStatusBadge status={req.status} />
          </div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '3px' }}>Created {formatDateTime(req.created_at)}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {canHRApprove && (
            <>
              <button onClick={() => { setRejectStage('hr'); setShowReject(true) }} className="btn-secondary" style={{ color: '#cf2020', borderColor: '#fca5a5', fontSize: '13px' }}>
                <XCircle size={15} /> Reject
              </button>
              <button onClick={() => hrApprove.mutate()} disabled={hrApprove.isPending} className="btn-success" style={{ fontSize: '13px' }}>
                {hrApprove.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={15} />}
                Forward to COO
              </button>
            </>
          )}
          {canCOOApprove && (
            <>
              <button onClick={() => { setRejectStage('coo'); setShowReject(true) }} className="btn-secondary" style={{ color: '#cf2020', borderColor: '#fca5a5', fontSize: '13px' }}>
                <XCircle size={15} /> Reject
              </button>
              <button onClick={() => cooApprove.mutate()} disabled={cooApprove.isPending} className="btn-info" style={{ fontSize: '13px' }}>
                {cooApprove.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={15} />}
                Final Approve
              </button>
            </>
          )}
          {canComplete && (
            <button onClick={() => complete.mutate()} disabled={complete.isPending} className="btn-primary" style={{ fontSize: '13px' }}>
              {complete.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
              Mark Complete
            </button>
          )}
        </div>
      </div>

      {/* Workflow progress trail */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: '20px', marginTop: '32px' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#8392ab', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>Approval Progress</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {steps.map((step, i) => (
            <div key={step.label} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: req.status === 'rejected' && step.active ? '#fde7e7'
                    : step.done ? 'linear-gradient(195deg, #66bb6a 0%, #43a047 100%)'
                    : step.active ? 'linear-gradient(195deg, #49a3f1 0%, #1A73E8 100%)'
                    : '#f0f2f5',
                  boxShadow: (step.done || step.active) ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                }}>
                  {step.done
                    ? <CheckCircle size={15} color="white" />
                    : step.active
                    ? <Clock size={15} color="white" />
                    : <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#d2d6da' }} />
                  }
                </div>
                <p style={{ fontSize: '11px', fontWeight: 600, color: step.done || step.active ? '#344767' : '#8392ab', whiteSpace: 'nowrap' }}>{step.label}</p>
                {step.sublabel && <p style={{ fontSize: '10px', color: '#8392ab', whiteSpace: 'nowrap', marginTop: '-4px' }}>{step.sublabel}</p>}
              </div>
              {i < steps.length - 1 && (
                <div style={{
                  flex: 1, height: '2px', marginBottom: '22px',
                  background: step.done ? 'linear-gradient(90deg, #43a047, #66bb6a)' : '#f0f2f5',
                }} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
        {/* New joiner info */}
        <div className="card" style={{ padding: '20px' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: '#8392ab', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>New Joiner</p>
          {[
            { label: 'Name', value: req.employee_name },
            { label: 'Employee ID', value: req.employee_emp_id },
            { label: 'Email', value: req.employee_email },
            { label: 'Phone', value: req.employee_phone },
            { label: 'Designation', value: req.employee_designation },
            { label: 'Department', value: req.employee_department },
            { label: 'Join Date', value: req.join_date ? formatDate(req.join_date) : null },
          ].filter(f => f.value).map(f => (
            <div key={f.label} style={{ marginBottom: '10px' }}>
              <p style={{ fontSize: '10px', color: '#8392ab', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</p>
              <p style={{ fontSize: '13px', color: '#344767', fontWeight: 500, marginTop: '2px' }}>{f.value}</p>
            </div>
          ))}
        </div>

        {/* Workflow actors */}
        <div className="card" style={{ padding: '20px' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: '#8392ab', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>Approval Trail</p>
          {[
            { label: 'Submitted By', icon: UserCheck, user: req.requested_by, at: req.created_at },
            { label: 'HR Approved By', icon: UserCheck, user: req.hr_approved_by, at: req.hr_approved_at },
            { label: 'COO Approved By', icon: UserCheck, user: req.approved_by, at: req.approved_at },
          ].map(item => item.user && (
            <div key={item.label} style={{ marginBottom: '14px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(195deg, #42424a, #191919)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '10px', fontWeight: 700, color: 'white',
              }}>
                {item.user.full_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p style={{ fontSize: '10px', color: '#8392ab', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</p>
                <p style={{ fontSize: '13px', color: '#344767', fontWeight: 500 }}>{item.user.full_name}</p>
                {item.at && <p style={{ fontSize: '11px', color: '#8392ab' }}>{formatDateTime(item.at)}</p>}
              </div>
            </div>
          ))}
          {req.rejection_reason && (
            <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#fde7e7', marginTop: '8px' }}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#cf2020', marginBottom: '2px' }}>Rejection Reason</p>
              <p style={{ fontSize: '13px', color: '#cf2020' }}>{req.rejection_reason}</p>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="card" style={{ padding: '20px' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: '#8392ab', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>Notes</p>
          <p style={{ fontSize: '13px', color: '#344767', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{req.notes || '—'}</p>
        </div>
      </div>

      {/* Asset requirements */}
      <div className="card" style={{ marginTop: '16px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f2f5' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#344767', margin: 0 }}>Asset Requirements</p>
        </div>
        {req.asset_requirements.map((item: any, i: number) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #f8f9fa' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#344767', margin: 0 }}>{item.category}</p>
              {item.notes && <p style={{ fontSize: '11px', color: '#8392ab', marginTop: '2px' }}>{item.notes}</p>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className={item.domain === 'IT' ? 'badge badge-blue' : 'badge badge-green'}>{item.domain}</span>
              <span className="badge badge-gray">Qty: {item.quantity}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Reject modal */}
      {showReject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div className="card" style={{ padding: '24px', maxWidth: '420px', width: '100%' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#344767', marginBottom: '16px' }}>
              {rejectStage === 'hr' ? 'Reject (HR)' : 'Reject (COO)'}
            </h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection…"
              className="input"
              rows={3}
              style={{ marginBottom: '16px', width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowReject(false)} className="btn-secondary">Cancel</button>
              <button
                onClick={() => rejectStage === 'hr' ? hrReject.mutate() : cooReject.mutate()}
                disabled={!rejectReason || hrReject.isPending || cooReject.isPending}
                className="btn-danger"
              >
                {(hrReject.isPending || cooReject.isPending) ? <Loader2 size={14} className="animate-spin" /> : null}
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}