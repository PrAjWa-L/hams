import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { assetsApi } from '@/api/assets'
import { departmentsApi, vendorsApi } from '@/api/users'
import PageHeader from '@/components/shared/PageHeader'

export default function AssetCreatePage() {
  const navigate = useNavigate()
  const { register, handleSubmit, watch, formState: { errors } } = useForm<Record<string, string>>()

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => assetsApi.categories.list(),
  })

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: departmentsApi.list,
  })

  const { data: vendorsData } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => vendorsApi.list(),
  })

  const create = useMutation({
    mutationFn: (data: Record<string, string>) => {
      const payload: Record<string, unknown> = {}
      Object.entries(data).forEach(([k, v]) => { if (v) payload[k] = v })
      return assetsApi.create(payload as Parameters<typeof assetsApi.create>[0])
    },
    onSuccess: (asset) => {
      toast.success(`Asset ${asset.asset_id} registered`)
      navigate(`/assets/${asset.id}`)
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
      toast.error(msg ?? 'Failed to register asset')
    },
  })

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
        {/* Basic */}
        <div className="card p-6">
          <h3 className="font-medium text-gray-900 mb-4">Basic Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Asset Name *</label>
              <input {...register('name', { required: true })} className="input" placeholder="e.g. Dell Latitude 5540" />
              {errors.name && <p className="text-red-500 text-xs mt-1">Required</p>}
            </div>
            <div>
              <label className="label">Category *</label>
              <select {...register('category_id', { required: true })} className="input">
                <option value="">Select category</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.domain})</option>
                ))}
              </select>
              {errors.category_id && <p className="text-red-500 text-xs mt-1">Required</p>}
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
              <select {...register('vendor_id')} className="input">
                <option value="">Select vendor</option>
                {vendorsData?.data?.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Purchase */}
        <div className="card p-6">
          <h3 className="font-medium text-gray-900 mb-4">Purchase Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Purchase Date</label>
              <input {...register('purchase_date')} type="date" className="input" />
            </div>
            <div>
              <label className="label">Purchase Cost (₹)</label>
              <input {...register('purchase_cost')} type="number" step="0.01" className="input" />
            </div>
            <div>
              <label className="label">PO Reference</label>
              <input {...register('po_reference')} className="input" placeholder="PO number from your PO tool" />
            </div>
          </div>
        </div>

        {/* Warranty */}
        <div className="card p-6">
          <h3 className="font-medium text-gray-900 mb-4">Warranty & AMC</h3>
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
              <label className="label">AMC Cost (₹)</label>
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

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={create.isPending} className="btn-primary">
            {create.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
            Register Asset
          </button>
        </div>
      </form>
    </div>
  )
}
