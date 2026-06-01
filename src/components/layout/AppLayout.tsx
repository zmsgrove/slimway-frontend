import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
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
  CalendarCheck,
  ChevronDown,
  Package,
  Wrench,
  Shield,
  X,
  DollarSign,
} from 'lucide-react'
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
  const color = status === 'ok' ? '#10b981' : status === 'slow' ? '#f59e0b' : status === 'error' ? '#ef4444' : '#71717A'
  const label = status === 'ok'
    ? `Сервер работает${latency !== null ? ` (${latency}ms)` : ''}`
    : status === 'slow'
    ? `Высокая задержка${latency !== null ? ` (${latency}ms)` : ''}`
    : status === 'error'
    ? 'Сервер недоступен'
    : 'Проверка...'

  return (
    <div title={label} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, cursor: 'default', flexShrink: 0 }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%', background: color,
        animation: status === 'error' ? 'pulse 1.5s ease-in-out infinite' : undefined,
        boxShadow: `0 0 0 2px ${color}33`,
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0, whiteSpace: 'nowrap' }}>
      {weather && city && (
        <>
          <span>{weather.icon} {weather.temp > 0 ? '+' : ''}{weather.temp}°C</span>
          <span style={{ color: 'var(--border)', userSelect: 'none' }}>|</span>
        </>
      )}
      <span style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace', fontSize: 13 }}>{timeStr}</span>
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

// ─── AppLayoutInner (uses permissions hook inside PermissionsProvider) ────────

function AppLayoutInner() {
  const { user, signOut } = useAuth()
  const { isDark, setTheme } = useTheme()
  const perm = usePermissions()
  const navigate = useNavigate()
  const location = useLocation()
  const [badges, setBadges] = useState<Badges>({ leads_new: 0, tasks_overdue: 0, low_stock_items: 0 })
  const badgeTimer = useRef<ReturnType<typeof setInterval>>()
  const [showMfaBanner, setShowMfaBanner] = useState(false)
  const [branchCity, setBranchCity] = useState<string | null>(null)
  const [branchTimezone, setBranchTimezone] = useState<string | null>(null)
  const [serverStatus, setServerStatus] = useState<ServerStatus>('unknown')
  const [serverLatency, setServerLatency] = useState<number | null>(null)
  const [serverErrorToastShown, setServerErrorToastShown] = useState(false)

  // Редирект для technical — только /schedule-work
  useEffect(() => {
    if (perm.isTechnical && location.pathname !== '/schedule-work') {
      navigate('/schedule-work', { replace: true })
    }
  }, [perm.isTechnical, location.pathname, navigate])

  // MFA баннер для developer/owner
  useEffect(() => {
    if (!user?.role || !['developer', 'owner'].includes(user.role)) return
    if (localStorage.getItem('mfa_banner_dismissed')) return
    api.get<{ enabled: boolean }>('/auth/mfa/status')
      .then(({ data }) => { if (!data.enabled) setShowMfaBanner(true) })
      .catch(() => { /* игнорируем */ })
  }, [user?.role])

  useEffect(() => {
    const load = () => {
      badgesApi.get().then(setBadges).catch(() => { /* ignore */ })
    }
    load()
    badgeTimer.current = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(badgeTimer.current)
  }, [])

  // Загружаем город и timezone текущего филиала
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

  // Пинг сервера каждые 30 секунд
  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL as string | undefined
    if (!API_URL) return

    const checkHealth = async () => {
      try {
        const start = Date.now()
        const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(5000) })
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

  // Toast при недоступности сервера
  useEffect(() => {
    if (serverStatus === 'error' && !serverErrorToastShown) {
      setServerErrorToastShown(true)
    }
  }, [serverStatus, serverErrorToastShown])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const handleThemeToggle = () => {
    if (!user) return
    void setTheme(isDark ? 'white' : 'dark', user.id)
  }

  // Для technical показываем только /schedule-work
  const navItems = perm.isTechnical
    ? [{ to: '/schedule-work', label: 'График', icon: CalendarClock }]
    : [
        { to: '/dashboard',     label: 'Дашборд',    icon: LayoutDashboard,  show: true },
        { to: '/clients',       label: 'Клиенты',    icon: Users,            show: perm.can('clients', 'view') },
        { to: '/subscriptions', label: 'Абонементы', icon: CreditCard,       show: perm.can('subscriptions', 'view') },
        { to: '/sale',          label: 'Продажа',    icon: ShoppingCart,     show: perm.can('subscriptions', 'create') },
        { to: '/schedule',      label: 'Расписание', icon: Calendar,         show: perm.can('schedule', 'view') },
        { to: '/leads',         label: 'Лиды',       icon: Target,           show: perm.can('leads', 'view') },
        { to: '/tasks',         label: 'Задачи',     icon: CheckSquare,      show: perm.can('tasks', 'view') },
        { to: '/chat',          label: 'Чат',        icon: MessageSquare,    show: true },
        { to: '/employees',     label: 'Сотрудники', icon: UserCheck,        show: perm.can('employees', 'view') },
        { to: '/schedule-work', label: 'График',     icon: CalendarClock,    show: perm.can('shifts', 'view') },
        { to: '/timesheet',     label: 'Табель',     icon: CalendarCheck,    show: user?.role === 'developer' || user?.role === 'owner' || user?.role === 'franchisee' },
        { to: '/warehouse',     label: 'Склад',      icon: Package,          show: perm.can('warehouse', 'view') },
      ].filter(item => item.show)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-base)' }}>
      {/* ── Sidebar ── */}
      <aside style={sidebarStyle}>
        {/* Logo */}
        <div style={{ padding: '21px 13px 13px', borderBottom: '1px solid var(--border)' }}>
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
        <nav style={{ flex: 1, padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          {navItems.map(({ to, label, icon }) => {
            let badge: number | undefined
            if (to === '/leads')     badge = badges.leads_new       || undefined
            if (to === '/tasks')     badge = badges.tasks_overdue   || undefined
            if (to === '/warehouse') badge = badges.low_stock_items || undefined
            return <NavButton key={to} to={to} icon={icon} label={label} badge={badge} />
          })}
        </nav>

        {/* Bottom */}
        <div style={{ padding: '8px 6px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {perm.can('employees', 'view') && (
            <NavButton to="/payroll" icon={DollarSign} label="Зарплата" />
          )}
          {perm.can('management', 'view') && (
            <NavButton to="/management" icon={Wrench} label="Управление" />
          )}

          <NavButton to="/settings" icon={Settings} label="Настройки" />

          <button
            onClick={handleSignOut}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 13px',
              borderRadius: 8, fontSize: 13, fontWeight: 400,
              color: 'var(--text-muted)', background: 'transparent', border: 'none',
              cursor: 'pointer', borderLeft: '2px solid transparent',
              width: '100%', textAlign: 'left', transition: 'color 0.15s',
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

          <WeatherTimeBlock city={branchCity} timezone={branchTimezone} />

          <ServerStatusDot status={serverStatus} latency={serverLatency} />

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

        {/* Toast: сервер недоступен */}
        {serverStatus === 'error' && serverErrorToastShown && (
          <div style={{
            position: 'fixed', bottom: 21, right: 21, zIndex: 9999,
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)',
            borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#ef4444',
            display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 4px 16px rgba(239,68,68,0.2)',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s ease-in-out infinite', display: 'inline-block', flexShrink: 0 }} />
            Сервер недоступен, проверьте соединение
            <button
              onClick={() => setServerErrorToastShown(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', padding: 2, marginLeft: 4 }}
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* MFA баннер */}
        {showMfaBanner && (
          <div style={{
            position: 'fixed', top: 56, left: 220, right: 0, zIndex: 9,
            background: 'linear-gradient(90deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.06) 100%)',
            borderBottom: '1px solid rgba(245,158,11,0.3)',
            padding: '10px 21px', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Shield size={16} color="#f59e0b" strokeWidth={1.75} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1 }}>
              Рекомендуем включить двухфакторную аутентификацию для защиты аккаунта.
            </span>
            <button
              onClick={() => { navigate('/settings#security') }}
              style={{
                padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)',
                color: '#f59e0b', cursor: 'pointer', flexShrink: 0,
              }}
            >
              Настроить сейчас
            </button>
            <button
              onClick={() => { localStorage.setItem('mfa_banner_dismissed', '1'); setShowMfaBanner(false) }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 24, height: 24, borderRadius: 6, border: 'none',
                background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0,
              }}
              title="Скрыть"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Page content */}
        <main style={{ flex: 1, padding: 21, paddingTop: showMfaBanner ? 'calc(56px + 41px + 21px)' : 'calc(56px + 21px)' }}>
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
