import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Server, Users, ClipboardList,
  Wrench, Package, LogOut, User, Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { useLogout } from '@/hooks/useAuth'
import type { Role } from '@/types'

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  roles?: Role[]
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/assets', label: 'Assets', icon: Server },
  { to: '/assignments', label: 'Assignments', icon: Package, roles: ['coo', 'it_head', 'it_team', 'management'] },
  { to: '/my-assets', label: 'My Assets', icon: Package, roles: ['employee'] },
  { to: '/onboarding', label: 'Onboarding', icon: ClipboardList, roles: ['coo', 'hr', 'it_head', 'management'] },
  { to: '/maintenance', label: 'Maintenance', icon: Wrench, roles: ['coo', 'it_head', 'it_team', 'management'] },
  { to: '/users', label: 'Users', icon: Users, roles: ['coo', 'hr', 'it_head'] },
]

export default function Sidebar() {
  const { user } = useAuthStore()
  const logout = useLogout()

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  )

  return (
    <aside className="w-60 bg-gray-900 text-white flex flex-col h-full fixed left-0 top-0 z-20">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center">
            <Building2 size={20} />
          </div>
          <div>
            <p className="font-semibold text-sm leading-tight">HAMS</p>
            <p className="text-xs text-gray-400">Asset Management</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-primary-600 text-white font-medium'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-3 pb-4 border-t border-gray-700 pt-3 space-y-1">
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
              isActive
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            )
          }
        >
          <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
            {user?.full_name?.[0] ?? 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-medium truncate">{user?.full_name}</p>
            <p className="text-gray-400 text-xs capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
        </NavLink>
        <button
          onClick={() => logout.mutate()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
