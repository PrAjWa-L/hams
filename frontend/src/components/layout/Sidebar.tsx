import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Server, Users, ClipboardList,
  Wrench, Package, LogOut, Building2, Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { useLogout } from '@/hooks/useAuth'
import type { Role } from '@/types'

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>
  roles?: Role[]
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard',    label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/assets',       label: 'Assets',      icon: Server },
  { to: '/assets/import', label: 'Import',     icon: Upload, roles: ['coo', 'it_head', 'it_team'] },
  { to: '/assignments',  label: 'Assignments', icon: Package, roles: ['coo', 'it_head', 'it_team', 'management'] },
  { to: '/my-assets',    label: 'My Assets',   icon: Package, roles: ['employee'] },
  { to: '/onboarding',   label: 'Onboarding',  icon: ClipboardList, roles: ['coo', 'hr', 'it_head', 'management'] },
  { to: '/maintenance',  label: 'Maintenance', icon: Wrench, roles: ['coo', 'it_head', 'it_team', 'management'] },
  { to: '/users',        label: 'Users',       icon: Users, roles: ['coo', 'hr', 'it_head'] },
]

export default function Sidebar() {
  const { user } = useAuthStore()
  const logout = useLogout()

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  )

  const initials = user?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('') ?? 'U'

  return (
    <aside style={{
      width: '220px',
      background: '#0f1117',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 20,
      borderRight: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Building2 size={16} color="white" />
          </div>
          <div>
            <p style={{ color: '#fff', fontWeight: 600, fontSize: '13px', letterSpacing: '0.06em', lineHeight: 1 }}>HAMS</p>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', marginTop: '2px', letterSpacing: '0.04em' }}>Asset Management</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/assets'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 10px',
              borderRadius: '7px',
              fontSize: '13px',
              fontWeight: isActive ? 500 : 400,
              color: isActive ? '#ffffff' : 'rgba(255,255,255,0.45)',
              background: isActive ? 'rgba(59,130,246,0.18)' : 'transparent',
              borderLeft: isActive ? '2px solid #3b82f6' : '2px solid transparent',
              textDecoration: 'none',
              transition: 'all 0.15s',
              letterSpacing: '0.01em',
            })}
            onMouseEnter={(e) => {
              const el = e.currentTarget
              if (!el.style.background.includes('0.18')) {
                el.style.background = 'rgba(255,255,255,0.05)'
                el.style.color = 'rgba(255,255,255,0.75)'
              }
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget
              if (!el.style.background.includes('0.18')) {
                el.style.background = 'transparent'
                el.style.color = 'rgba(255,255,255,0.45)'
              }
            }}
          >
            <item.icon size={15} strokeWidth={1.75} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div style={{ padding: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '8px 10px', borderRadius: '7px',
          background: 'rgba(255,255,255,0.04)',
          marginBottom: '4px',
        }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: '#1d4ed8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: 600, color: 'white', flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ color: '#fff', fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.full_name}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', textTransform: 'capitalize', marginTop: '1px' }}>
              {user?.role?.replace('_', ' ')}
            </p>
          </div>
        </div>
        <button
          onClick={() => logout.mutate()}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
            padding: '7px 10px', borderRadius: '7px', border: 'none',
            background: 'transparent', color: 'rgba(255,255,255,0.35)',
            fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}
        >
          <LogOut size={14} strokeWidth={1.75} />
          Sign out
        </button>
      </div>
    </aside>
  )
}