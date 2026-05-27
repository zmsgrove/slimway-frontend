import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, Calendar, LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const navItems = [
  { to: '/dashboard', label: 'Дашборд',   icon: LayoutDashboard },
  { to: '/clients',   label: 'Клиенты',    icon: Users },
  { to: '/schedule',  label: 'Расписание', icon: Calendar },
]

const roleLabel: Record<string, string> = {
  owner:      'Владелец',
  franchisee: 'Франчайзи',
  admin:      'Администратор',
  trainer:    'Тренер',
}

const glassStyle: React.CSSProperties = {
  background:           'var(--glass-bg)',
  backdropFilter:       'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
}

export default function AppLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* Sidebar */}
      <aside
        className="fixed top-0 left-0 h-screen flex flex-col py-fib-md px-fib-xs z-20"
        style={{
          width: '220px',
          ...glassStyle,
          borderRight: '1px solid var(--glass-border)',
        }}
      >
        <div className="px-fib-xs mb-fib-lg">
          <span className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
            Slimway
          </span>
          {user?.role && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {roleLabel[user.role] ?? user.role}
            </p>
          )}
        </div>

        <nav className="flex-1 flex flex-col gap-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-fib-xs px-fib-xs py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'hover:bg-white/5'
                }`
              }
              style={({ isActive }) => ({
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              })}
            >
              <Icon size={16} strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-fib-xs px-fib-xs py-2 rounded-md text-sm transition-colors hover:bg-white/5"
          style={{ color: 'var(--text-muted)' }}
        >
          <LogOut size={16} strokeWidth={1.75} />
          Выйти
        </button>
      </aside>

      {/* Main area */}
      <div className="flex flex-col min-h-screen" style={{ marginLeft: '220px' }}>
        {/* Header */}
        <header
          className="fixed top-0 right-0 flex items-center px-fib-md z-10"
          style={{
            left: '220px',
            height: '56px',
            ...glassStyle,
            borderBottom: '1px solid var(--glass-border)',
          }}
        >
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {user?.fullName || user?.email}
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 p-fib-md" style={{ paddingTop: 'calc(56px + 21px)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
