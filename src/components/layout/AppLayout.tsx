import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Calendar,
  Settings,
  LogOut,
  Sun,
  Moon,
  CreditCard,
  Target,
  CheckSquare,
  MessageSquare,
  UserCheck,
  CalendarClock,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../lib/ThemeContext'

const navItems = [
  { to: '/dashboard',     label: 'Дашборд',    icon: LayoutDashboard },
  { to: '/clients',       label: 'Клиенты',     icon: Users },
  { to: '/subscriptions', label: 'Абонементы',  icon: CreditCard },
  { to: '/schedule',      label: 'Расписание',  icon: Calendar },
  { to: '/leads',         label: 'Лиды',        icon: Target },
  { to: '/tasks',         label: 'Задачи',      icon: CheckSquare },
  { to: '/chat',          label: 'Чат',         icon: MessageSquare },
  { to: '/employees',     label: 'Сотрудники',  icon: UserCheck },
  { to: '/schedule-work', label: 'График',      icon: CalendarClock },
]

const roleLabel: Record<string, string> = {
  owner:      'Владелец',
  franchisee: 'Франчайзи',
  admin:      'Администратор',
  trainer:    'Тренер',
}

const sidebarStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  bottom: 0,
  width: 220,
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--glass-bg)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderRight: '1px solid var(--glass-border)',
  zIndex: 20,
}

const headerStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  right: 0,
  left: 220,
  height: 56,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: '0 21px',
  gap: 13,
  background: 'var(--glass-bg)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderBottom: '1px solid var(--glass-border)',
  zIndex: 10,
}

export default function AppLayout() {
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const handleThemeToggle = () => {
    if (!user) return
    void setTheme(theme === 'dark' ? 'light' : 'dark', user.id)
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-base)' }}>
      {/* ── Sidebar ── */}
      <aside style={sidebarStyle}>
        {/* Logo */}
        <div
          style={{
            padding: '21px 13px 13px',
            borderBottom: '1px solid var(--glass-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: '#02BDB6',
                letterSpacing: 0.5,
              }}
            >
              Slimway
            </span>
            <span
              style={{
                background: 'rgba(2,189,182,0.12)',
                color: '#02BDB6',
                border: '1px solid rgba(2,189,182,0.25)',
                fontSize: 9,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 6,
                letterSpacing: 1,
              }}
            >
              CRM
            </span>
          </div>
          {user?.role && (
            <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: 0 }}>
              {roleLabel[user.role] ?? user.role}
            </p>
          )}
        </div>

        {/* Nav */}
        <nav
          style={{
            flex: 1,
            padding: '8px 6px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            overflowY: 'auto',
          }}
        >
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 13px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                textDecoration: 'none',
                color: isActive ? '#02BDB6' : 'var(--text-secondary)',
                background: isActive ? 'rgba(2,189,182,0.10)' : 'transparent',
                borderLeft: isActive ? '2px solid #02BDB6' : '2px solid transparent',
                transition: 'all 0.15s',
                cursor: 'pointer',
              })}
            >
              <Icon size={16} strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: Settings + Logout */}
        <div
          style={{
            padding: '8px 6px',
            borderTop: '1px solid var(--glass-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <NavLink
            to="/settings"
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 13px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              textDecoration: 'none',
              color: isActive ? '#02BDB6' : 'var(--text-secondary)',
              background: isActive ? 'rgba(2,189,182,0.10)' : 'transparent',
              borderLeft: isActive ? '2px solid #02BDB6' : '2px solid transparent',
              transition: 'all 0.15s',
              cursor: 'pointer',
            })}
          >
            <Settings size={16} strokeWidth={1.75} />
            Настройки
          </NavLink>

          <button
            onClick={handleSignOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 13px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 400,
              color: 'var(--text-muted)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderLeft: '2px solid transparent',
              width: '100%',
              textAlign: 'left',
              transition: 'color 0.15s',
            }}
          >
            <LogOut size={16} strokeWidth={1.75} />
            Выйти
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div
        style={{
          marginLeft: 220,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        {/* Header */}
        <header style={headerStyle}>
          {/* Theme toggle */}
          <button
            onClick={handleThemeToggle}
            title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 34,
              height: 34,
              borderRadius: 8,
              border: '1px solid var(--glass-border)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s',
            }}
          >
            {theme === 'dark'
              ? <Sun size={15} strokeWidth={1.75} />
              : <Moon size={15} strokeWidth={1.75} />
            }
          </button>

          {/* User */}
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text-primary)',
                lineHeight: 1.3,
              }}
            >
              {user?.fullName || user?.email || ''}
            </div>
            {user?.role && (
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  marginTop: 1,
                }}
              >
                {roleLabel[user.role] ?? user.role}
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main
          style={{
            flex: 1,
            padding: 21,
            paddingTop: 'calc(56px + 21px)',
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
