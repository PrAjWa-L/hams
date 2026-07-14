import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { onboardingApi } from '@/api/workflow'
import type { AssetDomain } from '@/types'

interface RequirementRow {
  category: string
  domain: AssetDomain
  quantity: number
  notes: string
}

const ASSET_CATEGORIES = [
  'Laptop', 'Desktop', 'Monitor', 'Keyboard', 'Mouse', 'Headset',
  'Mobile Phone', 'Tablet', 'Docking Station', 'Webcam',
  'Chair', 'Desk', 'Locker', 'Access Card', 'Parking Slot', 'Other',
]

export default function OnboardingCreatePage() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    employee_name: '',
    employee_emp_id: '',
    employee_email: '',
    employee_phone: '',
    employee_designation: '',
    employee_department: '',
    join_date: '',
    notes: '',
  })

  const [requirements, setRequirements] = useState<RequirementRow[]>([
    { category: '', domain: 'IT', quantity: 1, notes: '' },
  ])

  const set = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const create = useMutation({
    mutationFn: () =>
      onboardingApi.create({
        employee_name: form.employee_name,
        employee_emp_id: form.employee_emp_id,
        employee_email: form.employee_email,
        employee_phone: form.employee_phone || undefined,
        employee_designation: form.employee_designation || undefined,
        employee_department: form.employee_department || undefined,
        join_date: form.join_date || undefined,
        notes: form.notes || undefined,
        asset_requirements: requirements
          .filter((r) => r.category)
          .map((r) => ({
            category: r.category,
            domain: r.domain,
            quantity: r.quantity,
            notes: r.notes || undefined,
          })),
      }),
    onSuccess: (data) => {
      toast.success('Onboarding request created')
      navigate(`/onboarding/${data.id}`)
    },
    onError: () => toast.error('Failed to create request'),
  })

  const addRow = () =>
    setRequirements((prev) => [...prev, { category: '', domain: 'IT', quantity: 1, notes: '' }])

  const removeRow = (i: number) =>
    setRequirements((prev) => prev.filter((_, idx) => idx !== i))

  const updateRow = (i: number, field: keyof RequirementRow, value: string | number) =>
    setRequirements((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r))
    )

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.employee_name.trim()) e.employee_name = 'Name is required'
    if (!form.employee_emp_id.trim()) e.employee_emp_id = 'Employee ID is required'
    if (form.employee_email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.employee_email.trim()))
      e.employee_email = 'Enter a valid email address'
    if (!requirements.some((r) => r.category))
      e.requirements = 'At least one asset requirement is needed'
    setFormErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    create.mutate()
  }

  const canSubmit = !create.isPending

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/onboarding" className="btn-ghost p-2">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-semibold">New Onboarding Request</h1>
          <p className="text-sm text-gray-500">Fill in the new joiner's details and asset requirements</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Employee Details */}
        <div className="card p-6 space-y-4">
          <h2 className="font-medium text-gray-900">Employee Details</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input className="input" placeholder="e.g. Ravi Kumar" value={form.employee_name} onChange={set('employee_name')} />
              {formErrors.employee_name && <p style={{color:'#ea0606',fontSize:'11px',marginTop:'4px'}}>{formErrors.employee_name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee ID <span className="text-red-500">*</span>
              </label>
              <input className="input" placeholder="e.g. EMP-1042" value={form.employee_emp_id} onChange={set('employee_emp_id')} />
              {formErrors.employee_emp_id && <p style={{color:'#ea0606',fontSize:'11px',marginTop:'4px'}}>{formErrors.employee_emp_id}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input type="email" className="input" placeholder="ravi.kumar@company.com" value={form.employee_email} onChange={set('employee_email')} />
              {formErrors.employee_email && <p style={{color:'#ea0606',fontSize:'11px',marginTop:'4px'}}>{formErrors.employee_email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input className="input" placeholder="+91 98765 43210" value={form.employee_phone} onChange={set('employee_phone')} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
              <input className="input" placeholder="e.g. Software Engineer" value={form.employee_designation} onChange={set('employee_designation')} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input className="input" placeholder="e.g. Engineering" value={form.employee_department} onChange={set('employee_department')} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Join Date</label>
              <input type="date" className="input" value={form.join_date} onChange={set('join_date')} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea className="input" rows={2} placeholder="Any additional context…" value={form.notes} onChange={set('notes')} />
          </div>
        </div>

        {/* Asset Requirements */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-gray-900">Asset Requirements</h2>
            <button onClick={addRow} className="btn-secondary text-sm">
              <Plus size={14} /> Add Item
            </button>
          </div>

          {formErrors.requirements && <p style={{color:'#ea0606',fontSize:'12px',marginBottom:'8px'}}>{formErrors.requirements}</p>}
          <div className="space-y-3">
            {requirements.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_120px_80px_1fr_36px] gap-2 items-start">
                <div>
                  {i === 0 && <label className="block text-xs text-gray-500 mb-1">Category *</label>}
                  <select className="input text-sm" value={row.category} onChange={(e) => updateRow(i, 'category', e.target.value)}>
                    <option value="">Select…</option>
                    {ASSET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  {i === 0 && <label className="block text-xs text-gray-500 mb-1">Domain</label>}
                  <select className="input text-sm" value={row.domain} onChange={(e) => updateRow(i, 'domain', e.target.value as AssetDomain)}>
                    <option value="IT">IT</option>
                    <option value="FACILITY">Facility</option>
                  </select>
                </div>

                <div>
                  {i === 0 && <label className="block text-xs text-gray-500 mb-1">Qty</label>}
                  <input type="number" min={1} className="input text-sm" value={row.quantity} onChange={(e) => updateRow(i, 'quantity', Number(e.target.value))} />
                </div>

                <div>
                  {i === 0 && <label className="block text-xs text-gray-500 mb-1">Notes</label>}
                  <input type="text" className="input text-sm" placeholder="Optional…" value={row.notes} onChange={(e) => updateRow(i, 'notes', e.target.value)} />
                </div>

                <div className={i === 0 ? 'mt-5' : ''}>
                  <button onClick={() => removeRow(i)} disabled={requirements.length === 1} className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link to="/onboarding" className="btn-secondary">Cancel</Link>
          <button onClick={handleSubmit} disabled={!canSubmit} className="btn-primary">
            {create.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
            Submit for Approval
          </button>
        </div>
      </div>
    </div>
  )
}