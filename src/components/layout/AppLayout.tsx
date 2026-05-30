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
  ShoppingCart,
  Target,
  CheckSquare,
  MessageSquare,
  UserCheck,
  CalendarClock,
  ChevronDown,
  Package,
  Wrench,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../lib/ThemeContext'
import { HotkeyHelp } from '../ui/HotkeyHelp'
import { useEffect, useState, useRef } from 'react'
import { branchesApi, type BranchRaw } from '../../api/branches.api'
import { badgesApi } from '../../api/badges.api'
import type { Badges } from '../../types'

const navItems = [
  { to: '/dashboard',     label: 'Дашборд',    icon: LayoutDashboard },
  { to: '/clients',       label: 'Клиенты',     icon: Users },
  { to: '/subscriptions', label: 'Абонементы',  icon: CreditCard },
  { to: '/sale',          label: 'Продажа',     icon: ShoppingCart },
  { to: '/schedule',      label: 'Расписание',  icon: Calendar },
  { to: '/leads',         label: 'Лиды',        icon: Target },
  { to: '/tasks',         label: 'Задачи',      icon: CheckSquare },
  { to: '/chat',          label: 'Чат',         icon: MessageSquare },
  { to: '/employees',     label: 'Сотрудники',  icon: UserCheck },
  { to: '/schedule-work', label: 'График',      icon: CalendarClock },
  { to: '/warehouse',     label: 'Склад',       icon: Package },
]

const roleLabel: Record<string, string> = {
  developer:  'Разработчик',
  owner:      'Владелец',
  franchisee: 'Франчайзи',
  admin:      'Администратор',
  trainer:    'Тренер',
  staff:      'Менеджер',
  technical:  'Тех. персонал',
}

const sidebarStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  bottom: 0,
  width: 220,
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--bg-sidebar)',
  borderRight: '1px solid var(--border)',
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
  background: 'var(--bg-sidebar)',
  borderBottom: '1px solid var(--border)',
  zIndex: 10,
}

// ─── BranchSwitcher ────────────────────────────────────────────────────────────

function BranchSwitcher({ role }: { role: string }) {
  const [branches, setBranches] = useState<BranchRaw[]>([])
  const [active,   setActive]   = useState<string | null>(null)
  const [open,     setOpen]     = useState(false)

  const canSwitch = role === 'developer' || role === 'owner'

  useEffect(() => {
    setActive(localStorage.getItem('activeBranchId'))
    branchesApi.getAll()
      .then(data => { if (data.length) setBranches(data) })
      .catch(() => { /* ignore */ })
  }, [])

  const activeBranch = branches.find(b => b.id === active) ?? branches[0] ?? null

  const handleSelect = (id: string) => {
    if (id === active) { setOpen(false); return }
    setOpen(false)
    localStorage.setItem('activeBranchId', id)
    const overlay = document.createElement('div')
    overlay.style.cssText = [
      'position:fixed;inset:0;z-index:9999',
      'background:rgba(9,9,11,0.9)',
      'display:flex;align-items:center;justify-content:center',
      'color:white;font-size:15px;gap:12px',
    ].join(';')
    overlay.innerHTML = [
      '<div style="width:20px;height:20px;border:2px solid var(--accent);',
      'border-top-color:transparent;border-radius:50%;',
      'animation:spin 0.6s linear infinite"></div>',
      'Переключение филиала...',
    ].join('')
    document.body.appendChild(overlay)
    setTimeout(() => window.location.reload(), 400)
  }

  if (!activeBranch) return null

  if (!canSwitch) {
    return (
      <div style={{ padding: '6px 13px 10px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>Филиал</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{activeBranch.name}</div>
      </div>
    )
  }

  return (
    <div style={{ padding: '6px 13px 10px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>Филиал</div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '4px 0', background: 'transparent', border: 'none',
          cursor: 'pointer', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600,
        }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeBranch.name}</span>
        <ChevronDown size={12} color="var(--text-muted)" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {open && branches.length > 1 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 8, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        }}>
          {branches.map(b => (
            <button
              key={b.id}
              onClick={() => handleSelect(b.id)}
              style={{
                display: 'block', width: '100%', padding: '8px 13px', textAlign: 'left',
                background: b.id === active ? 'var(--accent-muted)' : 'transparent',
                border: 'none', cursor: 'pointer',
                color: b.id === active ? 'var(--accent)' : 'var(--text-primary)', fontSize: 12,
                borderBottom: '1px solid var(--border)',
              }}
            >
              {b.name}
              {b.city && <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>{b.city}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── NavButton ────────────────────────────────────────────────────────────────

function NavButton({ to, icon: Icon, label, badge }: { to: string; icon: React.ElementType; label: string; badge?: number }) {
  return (
    <NavLink
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
        color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
        background: isActive ? 'var(--accent-muted)' : 'transparent',
        borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
        transition: 'all 0.15s',
        cursor: 'pointer',
      })}
    >
      <Icon size={16} strokeWidth={1.75} />
      <span style={{ flex: 1 }}>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span style={{
          minWidth: 18, height: 18, borderRadius: 9, background: '#ef4444',
          color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '0 4px',
          flexShrink: 0,
        }}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </NavLink>
  )
}

export default function AppLayout() {
  const { user, signOut } = useAuth()
  const { isDark, setTheme } = useTheme()
  const navigate = useNavigate()
  const [badges, setBadges] = useState<Badges>({ leads_new: 0, tasks_overdue: 0, low_stock_items: 0 })
  const badgeTimer = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    const load = () => {
      badgesApi.get().then(setBadges).catch(() => { /* ignore */ })
    }
    load()
    badgeTimer.current = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(badgeTimer.current)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const handleThemeToggle = () => {
    if (!user) return
    void setTheme(isDark ? 'white' : 'dark', user.id)
  }

  const canManage = user?.role === 'developer' || user?.role === 'owner' || user?.role === 'franchisee'

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-base)' }}>
      {/* ── Sidebar ── */}
      <aside style={sidebarStyle}>
        {/* Logo */}
        <div
          style={{
            padding: '21px 13px 13px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)', letterSpacing: 0.5 }}>
              Slimway
            </span>
            <span style={{
              background: 'var(--accent-muted)',
              color: 'var(--accent)',
              border: '1px solid var(--accent)',
              fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 6, letterSpacing: 1,
            }}>
              CRM
            </span>
          </div>
          {user?.role && (
            <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: 0 }}>
              {roleLabel[user.role] ?? user.role}
            </p>
          )}
        </div>

        {/* Branch switcher */}
        {user?.role && <BranchSwitcher role={user.role} />}

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
          {navItems.map(({ to, label, icon }) => {
            let badge: number | undefined
            if (to === '/leads')     badge = badges.leads_new       || undefined
            if (to === '/tasks')     badge = badges.tasks_overdue   || undefined
            if (to === '/warehouse') badge = badges.low_stock_items || undefined
            return <NavButton key={to} to={to} icon={icon} label={label} badge={badge} />
          })}
        </nav>

        {/* Bottom: Управление + Настройки + Выйти */}
        <div
          style={{
            padding: '8px 6px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {canManage && (
            <NavButton to="/management" icon={Wrench} label="Управление" />
          )}

          <NavButton to="/settings" icon={Settings} label="Настройки" />

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
      <div style={{ marginLeft: 220, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Header */}
        <header style={headerStyle}>
          <button
            onClick={handleThemeToggle}
            title={isDark ? 'Светлая тема' : 'Тёмная тема'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 34, height: 34, borderRadius: 8,
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s',
            }}
          >
            {isDark ? <Sun size={15} strokeWidth={1.75} /> : <Moon size={15} strokeWidth={1.75} />}
          </button>

          {user?.role === 'developer' && (
            <span style={{
              background: 'rgba(38,60,217,0.15)', color: '#263CD9',
              border: '1px solid rgba(38,60,217,0.35)',
              fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, letterSpacing: 1, flexShrink: 0,
            }}>
              DEV
            </span>
          )}

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3 }}>
              {user?.fullName || user?.email || ''}
            </div>
            {user?.role && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                {roleLabel[user.role] ?? user.role}
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: 21, paddingTop: 'calc(56px + 21px)' }}>
          <Outlet />
        </main>
      </div>
      <HotkeyHelp />
    </div>
  )
}
