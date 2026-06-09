import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, Calendar, Settings, LogOut,
  CreditCard, ShoppingCart, CheckSquare, MessageSquare,
  UserCheck, CalendarClock, ChevronDown, Package,
  Wrench, Shield, X, DollarSign, ChevronLeft, ChevronRight,
  TrendingUp, ClipboardList, Search, User,
} from 'lucide-react'
import { NotificationBell } from '../ui/NotificationBell'
import { useEffect, useState, useRef, useCallback } from 'react'
import { api } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../lib/ThemeContext'
import { usePermissions } from '../../hooks/usePermissions'
import { PermissionsProvider } from '../../hooks/usePermissionOverrides'
import { HotkeyHelp } from '../ui/HotkeyHelp'
import { GlobalSearch } from '../GlobalSearch'
import { branchesApi, type BranchRaw } from '../../api/branches.api'
import { badgesApi } from '../../api/badges.api'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import { Sheet, SheetContent } from '../ui/sheet'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import type { Badges } from '../../types'

// ─── Page title map ───────────────────────────────────────────────────────────

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':     'Дашборд',
  '/clients':       'Клиенты',
  '/subscriptions': 'Абонементы',
  '/sale':          'Продажа',
  '/schedule':      'Расписание',
  '/leads':         'Лиды',
  '/tasks':         'Задачи',
  '/chat':          'Чат',
  '/employees':     'Сотрудники',
  '/schedule-work': 'График смен',
  '/timesheet':     'Табель',
  '/warehouse':     'Склад',
  '/payroll':       'Зарплата',
  '/management':    'Управление',
  '/settings':      'Настройки',
}

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
  const color = status === 'ok' ? 'var(--color-success)' : status === 'slow' ? 'var(--color-warning)' : status === 'error' ? 'var(--color-danger)' : 'var(--text-muted)'
  const label = status === 'ok'
    ? `Сервер работает${latency !== null ? ` (${latency}ms)` : ''}`
    : status === 'slow'
    ? `Высокая задержка${latency !== null ? ` (${latency}ms)` : ''}`
    : status === 'error'
    ? 'Сервер недоступен'
    : 'Проверка...'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 20, height: 20, cursor: 'default', flexShrink: 0,
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%', background: color,
            animation: status === 'error' ? 'pulse 1.5s ease-in-out infinite' : undefined,
            boxShadow: `0 0 0 2px ${color}33`,
            transition: 'background 300ms ease-out',
          }} />
        </div>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
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

function BranchSwitcher({ role, collapsed }: { role: string; collapsed: boolean }) {
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

  if (collapsed) {
    return (
      <div style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'center' }}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
              color: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, cursor: 'default', flexShrink: 0,
            }}>
              {activeBranch.name[0]?.toUpperCase() ?? 'B'}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">{activeBranch.name}</TooltipContent>
        </Tooltip>
      </div>
    )
  }

  if (!canSwitch) {
    return (
      <div style={{ padding: '8px 14px 10px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Филиал</div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeBranch.name}</div>
      </div>
    )
  }

  return (
    <div ref={ref} style={{ padding: '8px 14px 10px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Филиал</div>
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

function NavButton({
  to, icon: Icon, label, badge, collapsed,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
  collapsed: boolean;
}) {
  const content = (
    <NavLink
      to={to}
      className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
      style={collapsed ? { justifyContent: 'center', padding: '8px 0' } : undefined}
    >
      <Icon size={16} strokeWidth={1.75} style={{ flexShrink: 0 }} />
      {!collapsed && (
        <>
          <span className="nav-item-label">{label}</span>
          {badge !== undefined && badge > 0 && (
            <span style={{
              minWidth: 17, height: 17, borderRadius: 9,
              background: 'var(--color-danger)', color: '#fff',
              fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 4px', flexShrink: 0, lineHeight: 1,
            }}>
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </>
      )}
      {collapsed && badge !== undefined && badge > 0 && (
        <span style={{
          position: 'absolute', top: 4, right: 8,
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--color-danger)', flexShrink: 0,
        }} />
      )}
    </NavLink>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div style={{ position: 'relative' }}>{content}</div>
        </TooltipTrigger>
        <TooltipContent side="right">
          {label}
          {badge !== undefined && badge > 0 && ` (${badge > 99 ? '99+' : badge})`}
        </TooltipContent>
      </Tooltip>
    )
  }

  return content
}

// ─── NavSection label ─────────────────────────────────────────────────────────

function NavSection({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div style={{ height: 8 }} />
  return (
    <div className="nav-group-label">{label}</div>
  )
}

// ─── SidebarContent (shared between desktop and Sheet) ─────────────────────────

function SidebarContent({
  collapsed,
  user,
  perm,
  badges,
  navItems,
  handleSignOut,
  onToggle,
}: {
  collapsed: boolean;
  user: ReturnType<typeof useAuth>['user'];
  perm: ReturnType<typeof usePermissions>;
  badges: Badges;
  navItems: Array<{ to: string; label: string; icon: React.ElementType; group?: string }>;
  handleSignOut: () => Promise<void>;
  onToggle?: () => void;
}) {
  const userInitials = (user?.fullName ?? user?.email ?? '?')
    .split(' ')
    .slice(0, 2)
    .map(s => s[0] ?? '')
    .join('')
    .toUpperCase()

  const groups: Record<string, typeof navItems> = {
    main: navItems.filter(i => i.group === 'main'),
    work: navItems.filter(i => i.group === 'work'),
    finance: navItems.filter(i => i.group === 'finance'),
    system: navItems.filter(i => i.group === 'system'),
  }

  return (
    <>
      {/* Logo + toggle */}
      <div style={{
        padding: collapsed ? '16px 0' : '16px 14px 14px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: 8,
      }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: 'var(--accent)', color: 'var(--accent-fg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, letterSpacing: -0.5,
            }}>
              S
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', letterSpacing: -0.3, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                Slimway
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>CRM</div>
            </div>
          </div>
        )}

        {collapsed && (
          <div style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: 'var(--accent)', color: 'var(--accent-fg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, letterSpacing: -0.5,
          }}>
            S
          </div>
        )}

        {onToggle && (
          <button
            onClick={onToggle}
            className="sidebar-toggle"
            title={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
            style={{ flexShrink: 0 }}
          >
            {collapsed
              ? <ChevronRight size={13} strokeWidth={2} />
              : <ChevronLeft size={13} strokeWidth={2} />
            }
          </button>
        )}
      </div>

      {/* Branch switcher */}
      {user?.role && <BranchSwitcher role={user.role} collapsed={collapsed} />}

      {/* Nav */}
      <nav style={{
        flex: 1,
        padding: collapsed ? '6px 8px' : '6px 8px',
        display: 'flex', flexDirection: 'column', gap: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
      }}>
        {groups.main.length > 0 && (
          <>
            <NavSection label="Основное" collapsed={collapsed} />
            {groups.main.map(({ to, label, icon }) => {
              let badge: number | undefined
              if (to === '/leads') badge = badges.leads_new || undefined
              return <NavButton key={to} to={to} icon={icon} label={label} badge={badge} collapsed={collapsed} />
            })}
          </>
        )}
        {groups.work.length > 0 && (
          <>
            <NavSection label="Рабочее время" collapsed={collapsed} />
            {groups.work.map(({ to, label, icon }) => {
              let badge: number | undefined
              if (to === '/tasks') badge = badges.tasks_overdue || undefined
              return <NavButton key={to} to={to} icon={icon} label={label} badge={badge} collapsed={collapsed} />
            })}
          </>
        )}
        {groups.finance.length > 0 && (
          <>
            <NavSection label="Финансы" collapsed={collapsed} />
            {groups.finance.map(({ to, label, icon }) => {
              let badge: number | undefined
              if (to === '/warehouse') badge = badges.low_stock_items || undefined
              return <NavButton key={to} to={to} icon={icon} label={label} badge={badge} collapsed={collapsed} />
            })}
          </>
        )}
      </nav>

      {/* Bottom nav */}
      <div style={{
        padding: collapsed ? '6px 8px' : '6px 8px',
        borderTop: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', gap: 1,
      }}>
        {groups.system.length > 0 && (
          <>
            <NavSection label="Система" collapsed={collapsed} />
            {groups.system.map(({ to, label, icon }) => (
              <NavButton key={to} to={to} icon={icon} label={label} collapsed={collapsed} />
            ))}
          </>
        )}

        {!collapsed && (
          <div style={{
            marginTop: 4,
            padding: '8px 10px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'transparent',
          }}>
            <div className="avatar-initials avatar-sm" style={{ flexShrink: 0 }}>{userInitials}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.fullName || user?.email || ''}
              </div>
              {user?.role && (
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                  {roleLabel[user.role] ?? user.role}
                </div>
              )}
            </div>
            <button
              onClick={handleSignOut}
              title="Выйти"
              className="icon-btn"
              style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', width: 24, height: 24, borderRadius: 6 }}
            >
              <LogOut size={13} strokeWidth={1.75} />
            </button>
          </div>
        )}

        {collapsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleSignOut}
                className="nav-item"
                style={{ border: 'none', width: '100%', cursor: 'pointer', justifyContent: 'center', padding: '8px 0', color: 'var(--text-muted)' }}
              >
                <LogOut size={16} strokeWidth={1.75} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Выйти</TooltipContent>
          </Tooltip>
        )}
      </div>
    </>
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

  // Sidebar state
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('sidebarCollapsed') === 'true' } catch { return false }
  })
  const [mobileOpen, setMobileOpen] = useState(false)

  const sidebarWidth = collapsed ? 64 : 240

  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev
      try { localStorage.setItem('sidebarCollapsed', String(next)) } catch { /* ignore */ }
      return next
    })
  }, [])

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
    ? [{ to: '/schedule-work', label: 'График', icon: CalendarClock, group: 'main' }]
    : [
        // ОСНОВНОЕ
        { to: '/dashboard',     label: 'Дашборд',    icon: LayoutDashboard, group: 'main',    show: true },
        { to: '/clients',       label: 'Клиенты',    icon: Users,           group: 'main',    show: perm.can('clients', 'view') },
        { to: '/subscriptions', label: 'Абонементы', icon: CreditCard,      group: 'main',    show: perm.can('subscriptions', 'view') },
        { to: '/sale',          label: 'Продажа',    icon: ShoppingCart,    group: 'main',    show: perm.can('subscriptions', 'create') },
        { to: '/schedule',      label: 'Расписание', icon: Calendar,        group: 'main',    show: perm.can('schedule', 'view') },
        { to: '/leads',         label: 'Лиды',       icon: TrendingUp,      group: 'main',    show: perm.can('leads', 'view') },
        { to: '/tasks',         label: 'Задачи',     icon: CheckSquare,     group: 'main',    show: perm.can('tasks', 'view') },
        { to: '/chat',          label: 'Чат',        icon: MessageSquare,   group: 'main',    show: true },
        // РАБОЧЕЕ ВРЕМЯ
        { to: '/employees',     label: 'Сотрудники', icon: UserCheck,       group: 'work',    show: perm.can('employees', 'view') },
        { to: '/schedule-work', label: 'График',     icon: CalendarClock,   group: 'work',    show: perm.can('shifts', 'view') },
        { to: '/timesheet',     label: 'Табель',     icon: ClipboardList,   group: 'work',    show: user?.role === 'developer' || user?.role === 'owner' || user?.role === 'franchisee' },
        // ФИНАНСЫ
        { to: '/warehouse',     label: 'Склад',      icon: Package,         group: 'finance', show: perm.can('warehouse', 'view') },
        { to: '/payroll',       label: 'Зарплата',   icon: DollarSign,      group: 'finance', show: perm.can('employees', 'view') },
        // СИСТЕМА
        { to: '/management',    label: 'Управление', icon: Wrench,          group: 'system',  show: perm.can('management', 'view') },
        { to: '/settings',      label: 'Настройки',  icon: Settings,        group: 'system',  show: true },
      ].filter(item => item.show)

  const userInitials = (user?.fullName ?? user?.email ?? '?')
    .split(' ')
    .slice(0, 2)
    .map(s => s[0] ?? '')
    .join('')
    .toUpperCase()

  const sidebarProps = { collapsed, user, perm, badges, navItems: navItems as typeof navItems, handleSignOut }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)' }}>

      {/* ── Desktop Sidebar ── */}
      <aside style={{
        position: 'fixed', top: 0, left: 0, bottom: 0,
        width: sidebarWidth,
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
        zIndex: 'var(--z-sidebar)' as unknown as number,
        transition: 'width 200ms var(--ease-out)',
        overflow: 'hidden',
      }}>
        <SidebarContent {...sidebarProps} onToggle={toggleCollapsed} />
      </aside>

      {/* ── Mobile sidebar via Sheet ── */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          style={{
            width: 240, padding: 0,
            background: 'var(--bg-sidebar)',
            display: 'flex', flexDirection: 'column',
          }}
        >
          <SidebarContent {...sidebarProps} collapsed={false} />
        </SheetContent>
      </Sheet>

      {/* ── Main area ── */}
      <div style={{
        marginLeft: sidebarWidth,
        display: 'flex', flexDirection: 'column',
        minHeight: '100vh',
        transition: 'margin-left 200ms var(--ease-out)',
      }}>

        {/* Header */}
        <header style={{
          position: 'fixed',
          top: 0, right: 0,
          left: sidebarWidth,
          height: 56,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px',
          gap: 12,
          background: 'var(--bg-sidebar)',
          borderBottom: '1px solid var(--border)',
          zIndex: 'var(--z-header)' as unknown as number,
          transition: 'left 200ms var(--ease-out)',
        }}>
          {/* Left: page title */}
          <div style={{ flex: '0 0 auto', minWidth: 0 }}>
            <h1 style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--text)',
              letterSpacing: '-0.01em',
              lineHeight: 1,
              whiteSpace: 'nowrap',
            }}>
              {PAGE_TITLES[location.pathname] ?? ''}
            </h1>
          </div>

          {/* Center: search bar */}
          <div style={{ flex: 1, maxWidth: 380, margin: '0 auto' }}>
            <button
              onClick={() => {
                window.dispatchEvent(new KeyboardEvent('keydown', {
                  key: 'k', ctrlKey: true, bubbles: true, cancelable: true,
                }))
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', height: 32,
                padding: '0 12px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 99,
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontSize: 12,
                transition: 'border-color 150ms ease-out, background 150ms ease-out',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--text-muted)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'
              }}
            >
              <Search size={13} strokeWidth={1.75} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, textAlign: 'left' }}>Поиск...</span>
              <span style={{
                fontSize: 10, fontWeight: 500,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 4, padding: '1px 5px',
                color: 'var(--text-muted)',
                flexShrink: 0,
                fontFamily: 'ui-monospace, monospace',
              }}>
                Ctrl K
              </span>
            </button>
          </div>

          {/* Right side controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
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

            {/* Theme toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleThemeToggle}
                  className="icon-btn"
                  style={{ border: '1px solid var(--border)', width: 32, height: 32 }}
                >
                  {isDark
                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                  }
                </button>
              </TooltipTrigger>
              <TooltipContent>{isDark ? 'Светлая тема' : 'Тёмная тема'}</TooltipContent>
            </Tooltip>

            {/* Notification bell */}
            <NotificationBell />

            {/* Avatar dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    padding: '2px 4px', borderRadius: 'var(--radius-sm)',
                    transition: 'background 150ms ease-out',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                >
                  <div className="avatar-initials avatar-sm">{userInitials}</div>
                  <ChevronDown size={11} color="var(--text-muted)" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" style={{ minWidth: 180 }}>
                <div style={{ padding: '8px 12px 6px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                    {user?.fullName || user?.email || ''}
                  </div>
                  {user?.role && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                      {roleLabel[user.role] ?? user.role}
                    </div>
                  )}
                </div>
                <DropdownMenuItem onClick={() => navigate('/settings')} style={{ gap: 8 }}>
                  <User size={13} strokeWidth={1.75} />
                  Профиль
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')} style={{ gap: 8 }}>
                  <Settings size={13} strokeWidth={1.75} />
                  Настройки
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  style={{ gap: 8, color: 'var(--color-danger)' }}
                >
                  <LogOut size={13} strokeWidth={1.75} />
                  Выйти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* MFA баннер */}
        {showMfaBanner && (
          <div style={{
            position: 'fixed', top: 56, left: sidebarWidth, right: 0, zIndex: 9,
            background: 'color-mix(in srgb, var(--color-warning) 8%, var(--bg-sidebar) 92%)',
            borderBottom: '1px solid color-mix(in srgb, var(--color-warning) 25%, transparent)',
            padding: '9px 20px', display: 'flex', alignItems: 'center', gap: 10,
            transition: 'left 200ms var(--ease-out)',
          }}>
            <Shield size={15} style={{ color: 'var(--color-warning)', flexShrink: 0 }} strokeWidth={1.75} />
            <span style={{ fontSize: 12, color: 'var(--text)', flex: 1 }}>
              Рекомендуем включить двухфакторную аутентификацию для защиты аккаунта.
            </span>
            <button
              onClick={() => { navigate('/settings#security') }}
              style={{
                padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                background: 'var(--color-warning-muted)', border: '1px solid color-mix(in srgb, var(--color-warning) 35%, transparent)',
                color: 'var(--color-warning)', cursor: 'pointer', flexShrink: 0,
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
              border: '1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)',
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
          paddingTop: showMfaBanner ? 'calc(56px + 38px + 20px)' : 'calc(56px + 20px)',
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
