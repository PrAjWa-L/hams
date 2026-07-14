import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { assetsApi } from '@/api/assets'
import { departmentsApi } from '@/api/users'
import PageHeader from '@/components/shared/PageHeader'

const CATEGORY_GROUPS: Record<string, string[]> = {
  'Medical Equipment': [
    'Dermatology Machine',
    'Diagnostic Device',
    'Surgical Equipment',
    'Patient Monitoring',
    'Imaging Equipment',
    'Lab Equipment',
    'Other',
  ],
  IT: [
    'Laptop',
    'Desktop',
    'Monitor',
    'Keyboard & Mouse',
    'Printer',
    'Scanner',
    'Network Switch',
    'Router',
    'UPS',
    'Server',
    'Webcam',
    'Headset',
    'Docking Station',
    'Tablet',
    'Mobile Phone',
    'Other',
  ],
}

export default function AssetCreatePage() {
  const navigate = useNavigate()
  const [topLevel, setTopLevel] = useState<string>('')          // 'Medical Equipment' | 'IT'
  const [selectedDomain, setSelectedDomain] = useState<string>('')
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('')
  const [customCategory, setCustomCategory] = useState<string>('')

  const { register, handleSubmit, formState: { errors } } = useForm<Record<string, string | boolean>>()

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => assetsApi.categories.list(),
  })

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: departmentsApi.list,
  })

  const create = useMutation({
    mutationFn: (data: Record<string, string | boolean>) => {
      const payload: Record<string, unknown> = {}
      Object.entries(data).forEach(([k, v]) => {
        if (v !== '' && v !== undefined) payload[k] = v
      })
      // Resolve the effective category name from two-step picker
      const effectiveCategory = selectedCategoryName === 'Other'
        ? customCategory
        : selectedCategoryName === '' ? topLevel : selectedCategoryName
      // Find matching DB category by name, or pass category_name as fallback
      const matchedCat = categories?.find(
        (c) => c.name.toLowerCase() === effectiveCategory.toLowerCase()
      )
      if (matchedCat) {
        payload.category_id = matchedCat.id
        delete payload.category_name
      } else {
        payload.category_name = effectiveCategory
      }
      delete payload.custom_category
      // Always pass resolved domain
      payload.domain = selectedDomain
      return assetsApi.create(payload as Parameters<typeof assetsApi.create>[0])
    },
    onSuccess: (asset) => {
      toast.success(`Asset ${asset.asset_id} registered`)
      navigate(`/assets/${asset.id}`)
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message
      toast.error(msg ?? 'Failed to register asset')
    },
  })

  const isMedical = topLevel === 'Medical Equipment'
  const showSubCategory = !!topLevel
  const showOtherInput = selectedCategoryName === 'Other'

  return (
    <div>
      <PageHeader
        title="Register New Asset"
        subtitle="Add a new asset to the inventory"
        actions={
          <button onClick={() => navigate(-1)} className="btn-secondary">
            <ArrowLeft size={16} /> Back
          </button>
        }
      />

      <form onSubmit={handleSubmit((d) => create.mutate(d))} className="space-y-6 max-w-3xl">

        {/* Basic Information */}
        <div className="card p-6">
          <h3 className="font-medium text-gray-900 mb-4">Basic Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Asset Name *</label>
              <input
                {...register('name', { required: true })}
                className="input"
                placeholder="e.g. Dell Latitude 5540"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">Required</p>}
            </div>
            <div className="col-span-2 grid grid-cols-2 gap-4">
              {/* Step 1 — Top-level type */}
              <div>
                <label className="label">Category Type *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {Object.keys(CATEGORY_GROUPS).map((group) => (
                    <button
                      key={group}
                      type="button"
                      onClick={() => {
                        setTopLevel(group)
                        setSelectedCategoryName('')
                        setCustomCategory('')
                        setSelectedDomain(group === 'IT' ? 'IT' : 'FACILITY')
                      }}
                      style={{
                        flex: 1, padding: '10px 12px', borderRadius: '10px', border: '1.5px solid',
                        borderColor: topLevel === group ? '#1d7d99' : '#dcebee',
                        background: topLevel === group ? '#eaf7fb' : '#f4fafb',
                        color: topLevel === group ? '#0f4c5c' : '#6f8d96',
                        fontWeight: topLevel === group ? 700 : 500,
                        fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s',
                        fontFamily: 'inherit',
                        boxShadow: topLevel === group ? '0 0 0 3px rgba(29,125,153,0.12)' : 'none',
                      }}
                    >
                      {group === 'IT' ? '💻 IT' : '🏥 Medical'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2 — Sub-category */}
              {showSubCategory && (
                <div>
                  <label className="label">Sub-category *</label>
                  <select
                    {...register('category_name', { required: true })}
                    className="input"
                    value={selectedCategoryName}
                    onChange={(e) => {
                      setSelectedCategoryName(e.target.value)
                      setCustomCategory('')
                    }}
                  >
                    <option value="">Select…</option>
                    {CATEGORY_GROUPS[topLevel].map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  {errors.category_name && <p className="text-red-500 text-xs mt-1">Required</p>}
                </div>
              )}

              {/* Other — free text */}
              {showOtherInput && (
                <div className="col-span-2">
                  <label className="label">Describe the category *</label>
                  <input
                    {...register('custom_category', { required: true })}
                    className="input"
                    placeholder={`e.g. ${topLevel === 'IT' ? 'KVM Switch' : 'Autoclave'}`}
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                  />
                  {errors.custom_category && <p className="text-red-500 text-xs mt-1">Required</p>}
                </div>
              )}
            </div>
            <div>
              <label className="label">Brand</label>
              <input {...register('brand')} className="input" placeholder="e.g. Dell, HP" />
            </div>
            <div>
              <label className="label">Model</label>
              <input {...register('model')} className="input" placeholder="e.g. Latitude 5540" />
            </div>
            <div>
              <label className="label">Serial Number</label>
              <input {...register('serial_number')} className="input" />
            </div>
            <div>
              <label className="label">Barcode</label>
              <input {...register('barcode')} className="input" />
            </div>
            <div>
              <label className="label">Department</label>
              <select {...register('department_id')} className="input">
                <option value="">Select department</option>
                {departments?.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Floor</label>
              <input {...register('floor')} className="input" placeholder="e.g. Ground Floor" />
            </div>
            <div>
              <label className="label">Vendor</label>
              <input {...register('vendor_name')} className="input" placeholder="e.g. Rashi Peripherals" />
            </div>
            <div>
              <label className="label">Company Purchased From</label>
              <input {...register('purchased_from')} className="input" placeholder="e.g. Amazon, direct from vendor" />
            </div>
            <div>
              <label className="label">Location Notes</label>
              <input {...register('location_notes')} className="input" placeholder="e.g. Near server room" />
            </div>
          </div>
        </div>

        {/* IT Device Specifications */}
        {selectedDomain === 'IT' && (
          <div className="card p-6">
            <h3 className="font-medium text-gray-900 mb-1">IT Device Specifications</h3>
            <p className="text-xs text-gray-400 mb-4">Network, hardware and software details</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Hostname</label>
                <input {...register('hostname')} className="input" placeholder="e.g. HOSP-LT-001" />
              </div>
              <div>
                <label className="label">IP Address</label>
                <input {...register('ip_address')} className="input" placeholder="e.g. 192.168.1.100" />
              </div>
              <div>
                <label className="label">MAC Address</label>
                <input {...register('mac_address')} className="input" placeholder="e.g. AA:BB:CC:DD:EE:FF" />
              </div>
              <div>
                <label className="label">Processor</label>
                <input {...register('processor')} className="input" placeholder="e.g. Intel Core i5" />
              </div>
              <div>
                <label className="label">Generation</label>
                <input {...register('generation')} className="input" placeholder="e.g. 11th Gen" />
              </div>
              <div>
                <label className="label">RAM</label>
                <input {...register('ram')} className="input" placeholder="e.g. 8GB DDR4" />
              </div>
              <div>
                <label className="label">HDD / SSD</label>
                <input {...register('hdd')} className="input" placeholder="e.g. 512GB SSD" />
              </div>
              <div>
                <label className="label">Label</label>
                <input {...register('label')} className="input" placeholder="Physical label on device" />
              </div>
              <div>
                <label className="label">Operating System</label>
                <input {...register('os_name')} className="input" placeholder="e.g. Windows 11 Pro" />
              </div>
              <div className="flex items-center gap-3 pt-5">
                <input
                  {...register('os_activated')}
                  type="checkbox"
                  id="os_activated"
                  className="w-4 h-4 rounded border-gray-300 text-primary-600"
                />
                <label htmlFor="os_activated" className="text-sm text-gray-700 cursor-pointer">
                  OS Activated
                </label>
              </div>
              <div>
                <label className="label">MS Office Version</label>
                <input {...register('ms_office')} className="input" placeholder="e.g. Office 2021" />
              </div>
              <div className="flex items-center gap-3 pt-5">
                <input
                  {...register('ms_office_activated')}
                  type="checkbox"
                  id="ms_office_activated"
                  className="w-4 h-4 rounded border-gray-300 text-primary-600"
                />
                <label htmlFor="ms_office_activated" className="text-sm text-gray-700 cursor-pointer">
                  MS Office Activated
                </label>
              </div>
              <div className="col-span-2">
                <label className="label">Antivirus</label>
                <input {...register('antivirus')} className="input" placeholder="e.g. Quick Heal Total Security" />
              </div>
                <div className="flex items-center gap-3">
                  <input
                    {...register('admin_login')}
                    type="checkbox"
                    id="admin_login"
                    className="w-4 h-4 rounded border-gray-300 text-primary-600"
                  />
                  <label htmlFor="admin_login" className="text-sm text-gray-700 cursor-pointer">
                    Administrator Login Enabled
                  </label>
                </div>
              </div>
            </div>
        )}

        {/* Service Schedule — medical equipment only */}
        {isMedical && (
          <div className="card p-6 border-l-4 border-l-green-400">
            <h3 className="font-medium text-gray-900 mb-1">Service Schedule</h3>
            <p className="text-xs text-gray-400 mb-4">For medical equipment — last and next service dates</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Last Service Date</label>
                <input {...register('last_service_date')} type="date" className="input" />
              </div>
              <div>
                <label className="label">Next Service Due</label>
                <input {...register('next_service_due')} type="date" className="input" />
              </div>
            </div>
          </div>
        )}

        {/* Purchase Details */}
        <div className="card p-6">
          <h3 className="font-medium text-gray-900 mb-4">Purchase Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Purchase Date</label>
              <input {...register('purchase_date')} type="date" className="input" />
            </div>
            <div>
              <label className="label">Purchase Cost</label>
              <input {...register('purchase_cost')} type="number" step="0.01" className="input" />
            </div>
            <div>
              <label className="label">PO Reference</label>
              <input {...register('po_reference')} className="input" placeholder="PO number from your PO tool" />
            </div>
          </div>
        </div>

        {/* Warranty and AMC */}
        <div className="card p-6">
          <h3 className="font-medium text-gray-900 mb-4">Warranty and AMC</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Warranty Start</label>
              <input {...register('warranty_start')} type="date" className="input" />
            </div>
            <div>
              <label className="label">Warranty End</label>
              <input {...register('warranty_end')} type="date" className="input" />
            </div>
            <div>
              <label className="label">AMC Vendor</label>
              <input {...register('amc_vendor')} className="input" />
            </div>
            <div>
              <label className="label">AMC Cost</label>
              <input {...register('amc_cost')} type="number" step="0.01" className="input" />
            </div>
            <div>
              <label className="label">AMC Start</label>
              <input {...register('amc_start')} type="date" className="input" />
            </div>
            <div>
              <label className="label">AMC End</label>
              <input {...register('amc_end')} type="date" className="input" />
            </div>
          </div>
        </div>

        {/* Additional Notes */}
        <div className="card p-6">
          <h3 className="font-medium text-gray-900 mb-4">Additional Notes</h3>
          <textarea
            {...register('notes')}
            className="input"
            rows={3}
            placeholder="Any additional remarks..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pb-8">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={create.isPending} className="btn-primary">
            {create.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
            Register Asset
          </button>
        </div>

      </form>
    </div>
  )
}