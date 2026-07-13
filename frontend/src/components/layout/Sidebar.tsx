import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Server, Users, ClipboardList,
  Wrench, Package, LogOut, Building2, Upload, ChevronRight,
} from 'lucide-react'
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
  { to: '/dashboard',     label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/assets',        label: 'Assets',      icon: Server },
  { to: '/assets/import', label: 'Import',      icon: Upload, roles: ['coo', 'it_head', 'it_team'] },
  { to: '/assignments',   label: 'Assignments', icon: Package, roles: ['coo', 'it_head', 'it_team', 'management'] },
  { to: '/my-assets',     label: 'My Assets',   icon: Package, roles: ['employee'] },
  { to: '/onboarding',    label: 'Onboarding',  icon: ClipboardList, roles: ['coo', 'hr', 'it_head', 'management'] },
  { to: '/maintenance',   label: 'Maintenance', icon: Wrench, roles: ['coo', 'it_head', 'it_team', 'management'] },
  { to: '/users',         label: 'Users',       icon: Users, roles: ['coo', 'hr', 'it_head'] },
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
      width: 'var(--ct-sidebar-w)',
      background: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 20,
      boxShadow: '0 20px 27px rgba(0,0,0,0.05)',
    }}>
      {/* Brand header — gradient box, CT signature element */}
      <div style={{
        margin: '16px 12px 0',
        background: 'linear-gradient(195deg, #42424a 0%, #191919 100%)',
        borderRadius: '12px',
        padding: '14px 16px',
        boxShadow: '0 4px 20px -4px rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '8px',
          background: 'rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Building2 size={18} color="white" />
        </div>
        <div>
          <p style={{ color: '#fff', fontWeight: 700, fontSize: '14px', letterSpacing: '0.04em', lineHeight: 1 }}>HAMS</p>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', marginTop: '3px', letterSpacing: '0.02em' }}>Asset Management</p>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/assets'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? '#344767' : '#67748e',
              background: isActive ? '#f0f2f5' : 'transparent',
              textDecoration: 'none',
              transition: 'all 0.15s',
              letterSpacing: '0.01em',
            })}
            onMouseEnter={(e) => {
              const el = e.currentTarget
              if (!el.style.background.includes('#f0f2f5')) {
                el.style.background = '#f8f9fa'
                el.style.color = '#344767'
              }
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget
              if (!el.style.background.includes('#f0f2f5')) {
                el.style.background = 'transparent'
                el.style.color = '#67748e'
              }
            }}
          >
            {({ isActive }) => (
              <>
                <span style={{
                  width: '28px', height: '28px', borderRadius: '6px', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isActive
                    ? 'linear-gradient(195deg, #42424a 0%, #191919 100%)'
                    : 'transparent',
                  boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                  transition: 'all 0.15s',
                }}>
                  <item.icon
                    size={14}
                    strokeWidth={2}
                    style={{ color: isActive ? 'white' : '#67748e' }}
                  />
                </span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {isActive && <ChevronRight size={13} style={{ color: '#344767', opacity: 0.4 }} />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Divider */}
      <div style={{ margin: '0 12px' }}>
        <hr style={{ border: 'none', borderTop: '1px solid #f0f2f5' }} />
      </div>

      {/* User footer */}
      <div style={{ padding: '12px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 12px', borderRadius: '8px',
          background: '#f8f9fa',
          marginBottom: '6px',
        }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'linear-gradient(195deg, #42424a 0%, #191919 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: 700, color: 'white', flexShrink: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}>
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ color: '#344767', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.full_name}
            </p>
            <p style={{ color: '#8392ab', fontSize: '10px', textTransform: 'capitalize', marginTop: '1px' }}>
              {user?.role?.replace('_', ' ')}
            </p>
          </div>
        </div>
        <button
          onClick={() => logout.mutate()}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 12px', borderRadius: '8px', border: 'none',
            background: 'transparent', color: '#8392ab',
            fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s',
            fontFamily: 'inherit', fontWeight: 500,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#f8f9fa'; e.currentTarget.style.color = '#344767' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8392ab' }}
        >
          <LogOut size={14} strokeWidth={2} />
          Sign out
        </button>
      </div>
    </aside>
  )
}