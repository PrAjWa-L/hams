import { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  actions?: ReactNode
  light?: boolean  // true = white text (when rendered on dark gradient)
}

export default function PageHeader({ title, subtitle, actions, light }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
      <div>
        <h1 style={{
          fontSize: '20px', fontWeight: 700, margin: 0,
          color: light ? '#ffffff' : '#344767',
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{
            fontSize: '13px', marginTop: '4px',
            color: light ? 'rgba(255,255,255,0.6)' : '#8392ab',
          }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {actions}
        </div>
      )}
    </div>
  )
}