import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const navItems = [
  { to: '/dashboard', label: 'Дашборд', icon: '▦' },
  { to: '/clients', label: 'Клиенты', icon: '◎' },
  { to: '/schedule', label: 'Расписание', icon: '◫' },
]

export default function AppLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Sidebar — фиксированный */}
      <aside
        className="fixed top-0 left-0 h-screen w-56 flex flex-col py-6 px-3 z-20"
        style={{
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRight: '1px solid rgba(255,255,255,0.12)'
        }}
      >
        <div className="px-3 mb-8">
          <span className="text-white font-semibold text-lg">Slimway</span>
          <p className="text-zinc-500 text-xs mt-0.5">{user?.role}</p>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={handleSignOut}
          className="px-3 py-2 text-zinc-500 hover:text-white text-sm text-left transition-colors"
        >
          Выйти
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 ml-56 flex flex-col min-h-screen">
        {/* Header — фиксированный */}
        <header
          className="fixed top-0 left-56 right-0 h-14 flex items-center px-6 z-10"
          style={{
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(255,255,255,0.12)'
          }}
        >
          <span className="text-zinc-400 text-sm">{user?.fullName || user?.email}</span>
        </header>

        {/* Page content */}
        <main className="flex-1 mt-14 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
