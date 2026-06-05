import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, Calendar, Settings, LogOut, Sun, Moon,
  CreditCard, ShoppingCart, Target, CheckSquare, MessageSquare,
  UserCheck, CalendarClock, CalendarCheck, ChevronDown, Package,
  Wrench, Shield, X, DollarSign,
} from 'lucide-react'
import { NotificationBell } from '../ui/NotificationBell'
import { useEffect, useState, useRef } from 'react'
import { api } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../lib/ThemeContext'
import { usePermissions } from '../../hooks/usePermissions'
import { PermissionsProvider } from '../../hooks/usePermissionOverrides'
import { HotkeyHelp } from '../ui/HotkeyHelp'
import { GlobalSearch } from '../GlobalSearch'
import { branchesApi, type BranchRaw } from '../../api/branches.api'
import { badgesApi } from '../../api/badges.api'
import type { Badges } from '../../types'

// ─── Weather helpers ──────────────────────────────────────────────────────────

function weatherIcon(code: number): string {
  if (code === 0) return '☀️'
  if (code <= 3) return '⛅'
  if (code <= 48) return '🌫️'
  if (code <= 67) return '🌧️'
  if (code <= 77) return '❄️'
  if (code <= 82) return '🌦️'
  return '⛈️'
}

interface WeatherCache { temp: number; icon: string; ts: number }

async function fetchWeather(city: string): Promise<WeatherCache | null> {
  try {
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=ru`)
    const geoData = await geoRes.json() as { results?: Array<{ latitude: number; longitude: number }> }
    const loc = geoData.results?.[0]
    if (!loc) return null
    const wxRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,weather_code&timezone=auto`)
    const wxData = await wxRes.json() as { current?: { temperature_2m: number; weather_code: number } }
    if (!wxData.current) return null
    return { temp: Math.round(wxData.current.temperature_2m), icon: weatherIcon(wxData.current.weather_code), ts: Date.now() }
  } catch { return null }
}

// ─── ServerStatusDot ──────────────────────────────────────────────────────────

type ServerStatus = 'ok' | 'slow' | 'error' | 'unknown'

function ServerStatusDot({ status, latency }: { status: ServerStatus; latency: number | null }) {
  const color = status === 'ok' ? '#10b981' : status === 'slow' ? '#f59e0b' : status === 'error' ? '#ef4444' : 'var(--text-muted)'
  const label = status === 'ok'
    ? `Сервер работает${latency !== null ? ` (${latency}ms)` : ''}`
    : status === 'slow'
    ? `Высокая задержка${latency !== null ? ` (${latency}ms)` : ''}`
    : status === 'error'
    ? 'Сервер недоступен'
    : 'Проверка...'

  return (
    <div
      title={label}
      style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, cursor: 'default', flexShrink: 0 }}
    >
      <div style={{
        width: 7, height: 7, borderRadius: '50%', background: color,
        animation: status === 'error' ? 'pulse 1.5s ease-in-out infinite' : undefined,
        boxShadow: `0 0 0 2px ${color}33`,
        transition: 'background 300ms ease-out',
      }} />
    </div>
  )
}

// ─── WeatherTimeBlock ─────────────────────────────────────────────────────────

function WeatherTimeBlock({ city, timezone }: { city: string | null; timezone: string | null }) {
  const [timeStr, setTimeStr] = useState('')
  const [weather, setWeather] = useState<WeatherCache | null>(null)

  useEffect(() => {
    const toIana = (tz: string): string | undefined => {
      if (!tz || tz === 'UTC') return undefined
      const m = tz.match(/^UTC([+-])(\d+)$/)
      if (!m) return tz
      const sign = m[1] === '+' ? '-' : '+'
      return `Etc/GMT${sign}${m[2]}`
    }
    const tick = () => {
      const ianaZone = timezone ? toIana(timezone) : undefined
      try {
        const str = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: ianaZone })
        setTimeStr(str)
      } catch {
        setTimeStr(new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [timezone])

  useEffect(() => {
    if (!city) return
    const CACHE_KEY = `slimway_weather_${city}`
    const CACHE_TTL = 30 * 60 * 1000
    const tryLoad = async () => {
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as WeatherCache | null
        if (cached && Date.now() - cached.ts < CACHE_TTL) { setWeather(cached); return }
      } catch { /* ignore */ }
      const result = await fetchWeather(city)
      if (result) { localStorage.setItem(CACHE_KEY, JSON.stringify(result)); setWeather(result) }
    }
    void tryLoad()
    const id = setInterval(() => void tryLoad(), 30 * 60 * 1000)
    return () => clearInterval(id)
  }, [city])

  if (!timeStr) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0, whiteSpace: 'nowrap' }}>
      {weather && city && (
        <>
          <span style={{ fontSize: 11 }}>{weather.icon} {weather.temp > 0 ? '+' : ''}{weather.temp}°C</span>
          <span style={{ width: 1, height: 12, background: 'var(--border)', display: 'inline-block', verticalAlign: 'middle' }} />
        </>
      )}
      <span style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{timeStr}</span>
    </div>
  )
}

const roleLabel: Record<string, string> = {
  developer:  'Разработчик',
  owner:      'Владелец',
  franchisee: 'Франчайзи',
  admin:      'Администратор',
  staff:      'Менеджер',
  technical:  'Тех. персонал',
}

// ─── BranchSwitcher ────────────────────────────────────────────────────────────

function BranchSwitcher({ role }: { role: string }) {
  const [branches, setBranches] = useState<BranchRaw[]>([])
  const [active, setActive]   = useState<string | null>(null)
  const [open, setOpen]       = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const canSwitch = role === 'developer' || role === 'owner'

  useEffect(() => {
    setActive(localStorage.getItem('activeBranchId'))
    branchesApi.getAll()
      .then(data => { if (data.length) setBranches(data) })
      .catch(() => { /* ignore */ })
  }, [])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

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
      'color:white;font-size:13px;gap:10px;',
    ].join(';')
    overlay.innerHTML = [
      '<div style="width:18px;height:18px;border:2px solid var(--accent);',
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
      <div style={{ padding: '8px 12px 10px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Филиал</div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{activeBranch.name}</div>
      </div>
    )
  }

  return (
    <div ref={ref} style={{ padding: '8px 12px 10px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
      <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Филиал</div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '3px 0', background: 'transparent', border: 'none',
          cursor: 'pointer', color: 'var(--text)', fontSize: 12, fontWeight: 500, gap: 6,
        }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, textAlign: 'left' }}>
          {activeBranch.name}
        </span>
        <ChevronDown
          size={11}
          color="var(--text-muted)"
          style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms ease-out' }}
        />
      </button>

      {open && branches.length > 1 && (
        <div
          className="dropdown-animate"
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          }}
        >
          {branches.map(b => (
            <button
              key={b.id}
              onClick={() => handleSelect(b.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                width: '100%', padding: '8px 12px', textAlign: 'left',
                background: b.id === active ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
                border: 'none', cursor: 'pointer',
                color: b.id === active ? 'var(--accent)' : 'var(--text)',
                fontSize: 12, fontWeight: b.id === active ? 500 : 400,
                borderBottom: '1px solid var(--border)',
                transition: 'background 100ms ease-out',
              }}
            >
              {b.id === active && (
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
              )}
              {b.name}
              {b.city && <span style={{ color: 'var(--text-muted)', marginLeft: 'auto', fontSize: 11 }}>{b.city}</span>}
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
      className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
    >
      <Icon size={15} strokeWidth={1.75} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 13 }}>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span style={{
          minWidth: 17, height: 17, borderRadius: 9,
          background: '#ef4444', color: '#fff',
          fontSize: 10, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 4px', flexShrink: 0, lineHeight: 1,
        }}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </NavLink>
  )
}

// ─── NavSection label ─────────────────────────────────────────────────────────

function NavSection({ label }: { label: string }) {
  return (
    <div style={{ padding: '8px 12px 4px', fontSize: 10, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {label}
    </div>
  )
}

// ─── AppLayoutInner ────────────────────────────────────────────────────────────

function AppLayoutInner() {
  const { user, signOut } = useAuth()
  const { isDark, setTheme } = useTheme()
  const perm = usePermissions()
  const navigate = useNavigate()
  const location = useLocation()
  const [badges, setBadges] = useState<Badges>({ leads_new: 0, tasks_overdue: 0, low_stock_items: 0, notifications_unread: 0 })
  const badgeTimer = useRef<ReturnType<typeof setInterval>>()
  const [showMfaBanner, setShowMfaBanner] = useState(false)
  const [branchCity, setBranchCity] = useState<string | null>(null)
  const [branchTimezone, setBranchTimezone] = useState<string | null>(null)
  const [serverStatus, setServerStatus] = useState<ServerStatus>('unknown')
  const [serverLatency, setServerLatency] = useState<number | null>(null)
  const [serverErrorToastShown, setServerErrorToastShown] = useState(false)

  useEffect(() => {
    if (perm.isTechnical && location.pathname !== '/schedule-work') {
      navigate('/schedule-work', { replace: true })
    }
  }, [perm.isTechnical, location.pathname, navigate])

  useEffect(() => {
    if (!user?.role || !['developer', 'owner'].includes(user.role)) return
    if (localStorage.getItem('mfa_banner_dismissed')) return
    api.get<{ enabled: boolean }>('/auth/mfa/status')
      .then(({ data }) => { if (!data.enabled) setShowMfaBanner(true) })
      .catch(() => { /* ignore */ })
  }, [user?.role])

  useEffect(() => {
    const load = () => { badgesApi.get().then(setBadges).catch(() => { /* ignore */ }) }
    load()
    badgeTimer.current = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(badgeTimer.current)
  }, [])

  useEffect(() => {
    const activeBranchId = localStorage.getItem('activeBranchId')
    if (!activeBranchId) return
    Promise.all([
      api.get<{ city?: string | null }>('/branches').catch(() => ({ data: [] as BranchRaw[] })),
      api.get<{ timezone?: string | null }>('/branch-settings').catch(() => ({ data: {} })),
    ]).then(([branchesRes, settingsRes]) => {
      const branches = branchesRes.data as BranchRaw[]
      const branch = Array.isArray(branches) ? branches.find(b => b.id === activeBranchId) : null
      setBranchCity(branch?.city ?? null)
      const settings = settingsRes.data as { timezone?: string | null }
      setBranchTimezone(settings?.timezone ?? null)
    }).catch(() => { /* ignore */ })
  }, [])

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL as string | undefined
    if (!API_URL) return
    const checkHealth = async () => {
      try {
        const start = Date.now()
        const BASE_URL = API_URL.replace(/\/api\/v1\/?$/, '')
        const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(5000) })
        const latency = Date.now() - start
        setServerLatency(latency)
        if (!res.ok) { setServerStatus('error') }
        else if (latency > 2000) { setServerStatus('slow') }
        else { setServerStatus('ok'); setServerErrorToastShown(false) }
      } catch {
        setServerStatus('error')
        setServerLatency(null)
      }
    }
    void checkHealth()
    const id = setInterval(() => void checkHealth(), 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (serverStatus === 'error' && !serverErrorToastShown) {
      setServerErrorToastShown(true)
    }
  }, [serverStatus, serverErrorToastShown])

  const handleSignOut = async () => { await signOut(); navigate('/login') }
  const handleThemeToggle = () => {
    if (!user) return
    void setTheme(isDark ? 'white' : 'dark', user.id)
  }

  const navItems = perm.isTechnical
    ? [{ to: '/schedule-work', label: 'График', icon: CalendarClock }]
    : [
        { to: '/dashboard',     label: 'Дашборд',    icon: LayoutDashboard, show: true },
        { to: '/clients',       label: 'Клиенты',    icon: Users,           show: perm.can('clients', 'view') },
        { to: '/subscriptions', label: 'Абонементы', icon: CreditCard,      show: perm.can('subscriptions', 'view') },
        { to: '/sale',          label: 'Продажа',    icon: ShoppingCart,    show: perm.can('subscriptions', 'create') },
        { to: '/schedule',      label: 'Расписание', icon: Calendar,        show: perm.can('schedule', 'view') },
        { to: '/leads',         label: 'Лиды',       icon: Target,          show: perm.can('leads', 'view') },
        { to: '/tasks',         label: 'Задачи',     icon: CheckSquare,     show: perm.can('tasks', 'view') },
        { to: '/chat',          label: 'Чат',        icon: MessageSquare,   show: true },
        { to: '/employees',     label: 'Сотрудники', icon: UserCheck,       show: perm.can('employees', 'view') },
        { to: '/schedule-work', label: 'График',     icon: CalendarClock,   show: perm.can('shifts', 'view') },
        { to: '/timesheet',     label: 'Табель',     icon: CalendarCheck,   show: user?.role === 'developer' || user?.role === 'owner' || user?.role === 'franchisee' },
        { to: '/warehouse',     label: 'Склад',      icon: Package,         show: perm.can('warehouse', 'view') },
      ].filter(item => item.show)

  const userInitials = (user?.fullName ?? user?.email ?? '?')
    .split(' ')
    .slice(0, 2)
    .map(s => s[0] ?? '')
    .join('')
    .toUpperCase()

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: 216,
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
        zIndex: 20,
      }}>
        {/* Logo */}
        <div style={{ padding: '18px 14px 14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'var(--accent)', color: 'var(--accent-fg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, letterSpacing: -0.5, flexShrink: 0,
            }}>
              S
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', letterSpacing: -0.3, lineHeight: 1.2 }}>
                Slimway
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>
                CRM
              </div>
            </div>
          </div>
        </div>

        {/* Branch switcher */}
        {user?.role && <BranchSwitcher role={user.role} />}

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 8px', display: 'flex', flexDirection: 'column', gap: 1, overflowY: 'auto' }}>
          {!perm.isTechnical && <NavSection label="Основное" />}
          {navItems.map(({ to, label, icon }) => {
            let badge: number | undefined
            if (to === '/leads')     badge = badges.leads_new       || undefined
            if (to === '/tasks')     badge = badges.tasks_overdue   || undefined
            if (to === '/warehouse') badge = badges.low_stock_items || undefined
            return <NavButton key={to} to={to} icon={icon} label={label} badge={badge} />
          })}
        </nav>

        {/* Bottom nav */}
        <div style={{ padding: '8px 8px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {perm.can('employees', 'view') && (
            <NavButton to="/payroll" icon={DollarSign} label="Зарплата" />
          )}
          {perm.can('management', 'view') && (
            <NavButton to="/management" icon={Wrench} label="Управление" />
          )}
          <NavButton to="/settings" icon={Settings} label="Настройки" />

          <button
            onClick={handleSignOut}
            className="nav-item"
            style={{ border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', marginTop: 2, fontSize: 13, color: 'var(--text-muted)' }}
          >
            <LogOut size={15} strokeWidth={1.75} style={{ flexShrink: 0 }} />
            Выйти
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div style={{ marginLeft: 216, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* Header */}
        <header style={{
          position: 'fixed', top: 0, right: 0, left: 216, height: 52,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          padding: '0 20px', gap: 10,
          background: 'var(--bg-sidebar)',
          borderBottom: '1px solid var(--border)',
          zIndex: 10,
        }}>
          {/* Theme toggle */}
          <button
            onClick={handleThemeToggle}
            title={isDark ? 'Светлая тема' : 'Тёмная тема'}
            className="icon-btn"
            style={{ border: '1px solid var(--border)', width: 32, height: 32 }}
          >
            {isDark ? <Sun size={14} strokeWidth={1.75} /> : <Moon size={14} strokeWidth={1.75} />}
          </button>

          {/* Notification bell */}
          <NotificationBell />

          <WeatherTimeBlock city={branchCity} timezone={branchTimezone} />

          <ServerStatusDot status={serverStatus} latency={serverLatency} />

          {user?.role === 'developer' && (
            <span style={{
              background: 'rgba(38,60,217,0.12)', color: '#263CD9',
              border: '1px solid rgba(38,60,217,0.3)',
              fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
              letterSpacing: '0.05em', flexShrink: 0,
            }}>
              DEV
            </span>
          )}

          {/* User block */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', lineHeight: 1.3 }}>
                {user?.fullName || user?.email || ''}
              </div>
              {user?.role && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                  {roleLabel[user.role] ?? user.role}
                </div>
              )}
            </div>
            <div
              className="avatar-initials avatar-sm"
              title={user?.fullName || user?.email || ''}
            >
              {userInitials}
            </div>
          </div>
        </header>

        {/* MFA баннер */}
        {showMfaBanner && (
          <div style={{
            position: 'fixed', top: 52, left: 216, right: 0, zIndex: 9,
            background: 'color-mix(in srgb, #f59e0b 8%, var(--bg-sidebar) 92%)',
            borderBottom: '1px solid rgba(245,158,11,0.25)',
            padding: '9px 20px', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Shield size={15} color="#f59e0b" strokeWidth={1.75} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--text)', flex: 1 }}>
              Рекомендуем включить двухфакторную аутентификацию для защиты аккаунта.
            </span>
            <button
              onClick={() => { navigate('/settings#security') }}
              style={{
                padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.35)',
                color: '#f59e0b', cursor: 'pointer', flexShrink: 0,
                transition: 'background 150ms ease-out',
              }}
            >
              Настроить
            </button>
            <button
              onClick={() => { localStorage.setItem('mfa_banner_dismissed', '1'); setShowMfaBanner(false) }}
              className="icon-btn"
              style={{ width: 24, height: 24, border: 'none', background: 'transparent', color: 'var(--text-muted)' }}
              title="Скрыть"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Toast: сервер недоступен */}
        {serverStatus === 'error' && serverErrorToastShown && (
          <div
            className="toast-animate"
            style={{
              position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
              background: 'var(--bg-card)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 10, padding: '10px 14px', fontSize: 12,
              color: 'var(--text)',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            }}
          >
            <span className="status-dot status-dot-danger" />
            Сервер недоступен
            <button
              onClick={() => setServerErrorToastShown(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2, marginLeft: 4 }}
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Page content */}
        <main style={{
          flex: 1,
          padding: 20,
          paddingTop: showMfaBanner ? 'calc(52px + 38px + 20px)' : 'calc(52px + 20px)',
        }}>
          <Outlet />
        </main>
      </div>

      <HotkeyHelp />
      <GlobalSearch />
    </div>
  )
}

export default function AppLayout() {
  return (
    <PermissionsProvider>
      <AppLayoutInner />
    </PermissionsProvider>
  )
}
