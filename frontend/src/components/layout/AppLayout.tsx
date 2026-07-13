import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function AppLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--ct-body-bg)' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 'var(--ct-sidebar-w)', minHeight: '100vh' }}>
        {/* Top gradient accent bar */}
        <div style={{
          height: '280px',
          background: 'linear-gradient(195deg, #42424a 0%, #191919 100%)',
          position: 'absolute',
          top: 0,
          left: 'var(--ct-sidebar-w)',
          right: 0,
          zIndex: 0,
        }} />
        <div style={{ position: 'relative', zIndex: 1, padding: '28px 32px', maxWidth: '1400px', margin: '0 auto' }}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}