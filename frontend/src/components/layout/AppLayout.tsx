import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function AppLayout() {
  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f0f2f5' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: '220px', overflowY: 'auto' }}>
        <div style={{ padding: '28px 32px', maxWidth: '1280px', margin: '0 auto' }}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}