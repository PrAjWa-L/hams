import { useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Upload, FileText, CheckCircle, XCircle, SkipForward, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { assetsApi } from '@/api/assets'
import type { ImportSummary, ImportRowResult } from '@/api/assets'
import PageHeader from '@/components/shared/PageHeader'

type StatusFilter = 'all' | 'created' | 'skipped' | 'error'

export default function AssetImportPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [result, setResult] = useState<ImportSummary | null>(null)
  const [filter, setFilter] = useState<StatusFilter>('all')

  const doImport = useMutation({
    mutationFn: (file: File) => assetsApi.importCsv(file),
    onSuccess: (data) => {
      setResult(data)
      if (data.errors === 0) {
        toast.success(`Import complete — ${data.created} assets created`)
      } else {
        toast.error(`Import finished with ${data.errors} error(s)`)
      }
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message
      toast.error(msg ?? 'Import failed')
    },
  })

  function handleFile(file: File | null) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a .csv file')
      return
    }
    setResult(null)
    doImport.mutate(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0] ?? null)
  }

  const filteredRows: ImportRowResult[] = result
    ? (filter === 'all' ? result.results : result.results.filter((r) => r.status === filter))
    : []

  const statusIcon = (s: ImportRowResult['status']) => {
    if (s === 'created') return <CheckCircle size={14} className="text-green-500 shrink-0" />
    if (s === 'skipped') return <SkipForward size={14} className="text-yellow-500 shrink-0" />
    return <XCircle size={14} className="text-red-500 shrink-0" />
  }

  return (
    <div>
      <PageHeader
        title="Import Assets from CSV"
        subtitle="Upload a Seqrite 'System and Hardware Details' export to bulk-add IT assets"
      />

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors
          ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'}`}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <Upload size={32} className="text-gray-400" />
        <p className="text-sm font-medium text-gray-600">
          {doImport.isPending ? 'Importing…' : 'Drop your CSV here or click to browse'}
        </p>
        <p className="text-xs text-gray-400">Seqrite "System and Hardware Details" export (.csv)</p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {/* Column mapping info */}
      {!result && !doImport.isPending && (
        <div className="mt-6 card p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={16} className="text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-700">What gets imported</h3>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs text-gray-600">
            {[
              ['Endpoint Name', 'Hostname & Asset name'],
              ['IP Address', 'IP Address'],
              ['MAC Address 1', 'MAC Address'],
              ['OS Name', 'Operating System'],
              ['Physical Memory', 'RAM'],
              ['Storage', 'HDD/SSD summary'],
              ['Processor Name', 'Processor'],
              ['Manufacturer + Model', 'Brand & Model'],
              ['BIOS Serial Number', 'Serial number (dedup key)'],
              ['Product Name + Version', 'Antivirus'],
              ['Group', 'Label'],
              ['User Name', 'Notes (last logged-in user)'],
            ].map(([csv, field]) => (
              <div key={csv} className="flex gap-2">
                <span className="font-mono text-blue-600 truncate">{csv}</span>
                <span className="text-gray-400">→</span>
                <span>{field}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-400">
            Rows with a duplicate serial number or hostname are skipped automatically.
          </p>
        </div>
      )}

      {/* Loading */}
      {doImport.isPending && (
        <div className="mt-6 card p-8 flex flex-col items-center gap-3 text-gray-500">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <p className="text-sm">Processing rows…</p>
        </div>
      )}

      {/* Results summary */}
      {result && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total rows', value: result.total, color: 'text-gray-700' },
              { label: 'Created', value: result.created, color: 'text-green-600' },
              { label: 'Skipped', value: result.skipped, color: 'text-yellow-600' },
              { label: 'Errors', value: result.errors, color: 'text-red-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="card p-4 text-center">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {result.errors > 0 && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>Some rows failed. Review the errors below and fix the source data before re-importing.</span>
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex gap-2">
            {(['all', 'created', 'skipped', 'error'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors capitalize
                  ${filter === s
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}
              >
                {s === 'all' ? `All (${result.total})` : s === 'created'
                  ? `Created (${result.created})` : s === 'skipped'
                  ? `Skipped (${result.skipped})` : `Errors (${result.errors})`}
              </button>
            ))}
          </div>

          {/* Results table */}
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 w-12">#</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Endpoint Name</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 w-24">Status</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Asset ID / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRows.map((r) => (
                  <tr key={r.row} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-xs text-gray-400">{r.row}</td>
                    <td className="px-4 py-2 text-xs font-mono text-gray-700">{r.endpoint_name}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium capitalize
                        ${r.status === 'created' ? 'text-green-600'
                          : r.status === 'skipped' ? 'text-yellow-600'
                          : 'text-red-600'}`}>
                        {statusIcon(r.status)} {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">
                      {r.asset_id
                        ? <span className="font-mono text-blue-600">{r.asset_id}</span>
                        : r.reason ?? '—'}
                    </td>
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-xs text-gray-400">
                      No rows match this filter
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <button
            onClick={() => { setResult(null); setFilter('all') }}
            className="btn-secondary text-sm"
          >
            Import another file
          </button>
        </div>
      )}
    </div>
  )
}