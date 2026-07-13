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
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table className="ct-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} style={{ width: col.width }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      <div style={{ height: '14px', background: '#f0f2f5', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: '48px', textAlign: 'center', color: '#8392ab', fontSize: '13px' }}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key}>{col.render(row)}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {meta && meta.total_pages > 1 && (
        <div style={{
          padding: '12px 20px', borderTop: '1px solid #f0f2f5',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <p style={{ fontSize: '12px', color: '#8392ab' }}>
            Showing {(meta.page - 1) * meta.page_size + 1}–
            {Math.min(meta.page * meta.page_size, meta.total)} of {meta.total}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => onPageChange?.(meta.page - 1)}
              disabled={!meta.has_prev}
              style={{
                padding: '6px', borderRadius: '6px', border: 'none', background: 'transparent',
                cursor: meta.has_prev ? 'pointer' : 'not-allowed', opacity: meta.has_prev ? 1 : 0.4,
                color: '#344767',
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ padding: '0 10px', fontSize: '12px', color: '#344767', fontWeight: 600 }}>
              {meta.page} / {meta.total_pages}
            </span>
            <button
              onClick={() => onPageChange?.(meta.page + 1)}
              disabled={!meta.has_next}
              style={{
                padding: '6px', borderRadius: '6px', border: 'none', background: 'transparent',
                cursor: meta.has_next ? 'pointer' : 'not-allowed', opacity: meta.has_next ? 1 : 0.4,
                color: '#344767',
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}