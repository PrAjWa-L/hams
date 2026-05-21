import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { PageMeta } from '@/types'

interface Column<T> {
  key: string
  header: string
  render: (row: T) => React.ReactNode
  width?: string
}

interface Props<T> {
  columns: Column<T>[]
  data: T[]
  meta?: PageMeta
  onPageChange?: (page: number) => void
  isLoading?: boolean
  emptyMessage?: string
}

export default function DataTable<T>({
  columns,
  data,
  meta,
  onPageChange,
  isLoading,
  emptyMessage = 'No records found',
}: Props<T>) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-gray-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-gray-700">
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {meta && meta.total_pages > 1 && (
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-white">
          <p className="text-xs text-gray-500">
            Showing {(meta.page - 1) * meta.page_size + 1}–
            {Math.min(meta.page * meta.page_size, meta.total)} of {meta.total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange?.(meta.page - 1)}
              disabled={!meta.has_prev}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 text-xs text-gray-600">
              {meta.page} / {meta.total_pages}
            </span>
            <button
              onClick={() => onPageChange?.(meta.page + 1)}
              disabled={!meta.has_next}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
