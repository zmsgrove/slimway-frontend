import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell, X, CheckCheck, Inbox, Target, CheckSquare, Calendar,
  CreditCard, Users, Clock, DollarSign, Info, AlertCircle,
} from 'lucide-react'
import { notificationsApi, type AppNotification } from '../../api/notifications.api'

// ─── helpers ─────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min  = Math.floor(diff / 60000)
  const hour = Math.floor(diff / 3600000)
  if (min  <  1) return 'только что'
  if (min  < 60) return `${min} мин назад`
  if (hour < 24) return `${hour} ч назад`
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) {
    return `вчера ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
  }
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) +
         ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

function getGroup(iso: string): 'today' | 'yesterday' | 'earlier' {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return 'today'
  const y = new Date(now)
  y.setDate(now.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'yesterday'
  return 'earlier'
}

const GROUP_LABEL: Record<string, string> = {
  today:     'Сегодня',
  yesterday: 'Вчера',
  earlier:   'Раньше',
}

interface TypeMeta { Icon: React.ElementType; color: string }

function getTypeMeta(type: string): TypeMeta {
  if (type.startsWith('lead'))         return { Icon: Target,      color: '#f59e0b' }
  if (type.startsWith('task'))         return { Icon: CheckSquare,  color: '#8b5cf6' }
  if (type.startsWith('booking'))      return { Icon: Calendar,     color: '#10b981' }
  if (type.startsWith('subscription')) return { Icon: CreditCard,   color: '#263CD9' }
  if (type === 'client.created')       return { Icon: Users,        color: 'var(--accent)' }
  if (type === 'shift.tomorrow')       return { Icon: Clock,        color: '#f97316' }
  if (type === 'payment.received')     return { Icon: DollarSign,   color: '#10b981' }
  if (type === 'system.update')        return { Icon: Info,         color: '#3b82f6' }
  return { Icon: AlertCircle, color: 'var(--text-muted)' }
}

function getRelatedPath(n: AppNotification): string | null {
  if (!n.related_type || !n.related_id) return null
  if (n.related_type === 'lead')         return '/leads'
  if (n.related_type === 'task')         return '/tasks'
  if (n.related_type === 'booking')      return '/schedule'
  if (n.related_type === 'subscription') return '/subscriptions'
  if (n.related_type === 'client')       return '/clients'
  return null
}

// ─── NotificationItem ─────────────────────────────────────────────────────────

function NotificationItem({
  n,
  onRead,
  onDelete,
}: {
  n: AppNotification
  onRead: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  const navigate = useNavigate()
  const { Icon, color } = getTypeMeta(n.type)

  const handleClick = () => {
    if (!n.is_read) onRead(n.id)
    const path = getRelatedPath(n)
    if (path) navigate(path)
  }

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '10px 14px',
        background: hovered
          ? 'color-mix(in srgb, var(--accent) 4%, var(--bg-card))'
          : 'transparent',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 100ms ease-out',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Unread dot */}
      <div style={{
        width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 5,
        background: n.is_read ? 'transparent' : 'var(--accent)',
        transition: 'background 200ms ease-out',
      }} />

      {/* Type icon */}
      <div style={{
        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
        background: `color-mix(in srgb, ${color} 10%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 18%, transparent)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={14} color={color} strokeWidth={1.75} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12,
          fontWeight: n.is_read ? 400 : 600,
          color: 'var(--text)',
          lineHeight: 1.35,
          marginBottom: n.body ? 3 : 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {n.title}
        </div>
        {n.body && (
          <div style={{
            fontSize: 11, color: 'var(--text-muted)',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            marginBottom: 3,
          }}>
            {n.body}
          </div>
        )}
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          {relativeTime(n.created_at)}
        </div>
      </div>

      {/* Delete button */}
      {hovered && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(n.id) }}
          style={{
            position: 'absolute', top: 8, right: 10,
            width: 20, height: 20, borderRadius: 5,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-muted)',
            transition: 'all 100ms ease-out',
          }}
          title="Удалить"
        >
          <X size={10} />
        </button>
      )}
    </div>
  )
}

// ─── NotificationPanel ────────────────────────────────────────────────────────

function NotificationPanel({
  notifications,
  onRead,
  onReadAll,
  onDelete,
  onClose,
}: {
  notifications: AppNotification[]
  onRead: (id: string) => void
  onReadAll: () => void
  onDelete: (id: string) => void
  onClose: () => void
}) {
  const groups: ('today' | 'yesterday' | 'earlier')[] = ['today', 'yesterday', 'earlier']
  const grouped: Record<string, AppNotification[]> = {
    today: [], yesterday: [], earlier: [],
  }
  for (const n of notifications) {
    grouped[getGroup(n.created_at)].push(n)
  }

  const hasUnread = notifications.some(n => !n.is_read)

  return (
    <div
      className="dropdown-animate"
      style={{
        position: 'absolute', top: 'calc(100% + 8px)', right: 0,
        width: 380, maxHeight: 480,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
        zIndex: 300,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
          Уведомления
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {hasUnread && (
            <button
              onClick={onReadAll}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'transparent', cursor: 'pointer',
                fontSize: 11, color: 'var(--text-muted)',
                fontFamily: 'inherit',
                transition: 'all 100ms ease-out',
              }}
              title="Прочитать все"
            >
              <CheckCheck size={12} />
              Прочитать все
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              width: 22, height: 22, borderRadius: 5, border: 'none',
              background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {notifications.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 10, padding: 40,
            color: 'var(--text-muted)',
          }}>
            <Inbox size={32} strokeWidth={1.25} />
            <span style={{ fontSize: 12 }}>Уведомлений нет</span>
          </div>
        ) : (
          groups.map(g => {
            const items = grouped[g]
            if (!items.length) return null
            return (
              <div key={g}>
                <div style={{
                  padding: '7px 14px 4px',
                  fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  background: 'var(--bg-card)',
                  position: 'sticky', top: 0, zIndex: 1,
                  borderBottom: '1px solid var(--border)',
                }}>
                  {GROUP_LABEL[g]}
                </div>
                {items.map(n => (
                  <NotificationItem
                    key={n.id}
                    n={n}
                    onRead={onRead}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ─── NotificationBell ─────────────────────────────────────────────────────────

export function NotificationBell({ onCountChange }: { onCountChange?: (n: number) => void }) {
  const [open, setOpen]                         = useState(false)
  const [notifications, setNotifications]       = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount]           = useState(0)
  const [loaded, setLoaded]                     = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval>>()

  const fetchCount = useCallback(async () => {
    try {
      const count = await notificationsApi.getUnreadCount()
      setUnreadCount(count)
      onCountChange?.(count)
    } catch { /* ignore */ }
  }, [onCountChange])

  const fetchAll = useCallback(async () => {
    try {
      const data = await notificationsApi.getAll({ limit: 50 })
      setNotifications(data)
      const count = data.filter(n => !n.is_read).length
      setUnreadCount(count)
      onCountChange?.(count)
      setLoaded(true)
    } catch { /* ignore */ }
  }, [onCountChange])

  // Poll unread count every 30s
  useEffect(() => {
    void fetchCount()
    pollRef.current = setInterval(() => void fetchCount(), 30_000)
    return () => clearInterval(pollRef.current)
  }, [fetchCount])

  // Load all when panel opens
  useEffect(() => {
    if (open) void fetchAll()
  }, [open, fetchAll])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      setUnreadCount(c => Math.max(0, c - 1))
      onCountChange?.(Math.max(0, unreadCount - 1))
    } catch { /* ignore */ }
  }

  const handleReadAll = async () => {
    try {
      await notificationsApi.markAllRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
      onCountChange?.(0)
    } catch { /* ignore */ }
  }

  const handleDelete = async (id: string) => {
    const n = notifications.find(x => x.id === id)
    try {
      await notificationsApi.remove(id)
      setNotifications(prev => prev.filter(x => x.id !== id))
      if (n && !n.is_read) {
        setUnreadCount(c => Math.max(0, c - 1))
        onCountChange?.(Math.max(0, unreadCount - 1))
      }
    } catch { /* ignore */ }
  }

  const displayCount = unreadCount > 99 ? '99+' : unreadCount > 0 ? String(unreadCount) : null

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Уведомления"
        className="icon-btn"
        style={{
          border: '1px solid var(--border)', width: 32, height: 32,
          position: 'relative',
        }}
      >
        <Bell size={14} strokeWidth={1.75} />
        {displayCount && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: 16, height: 16, borderRadius: 8,
            background: '#ef4444', color: '#fff',
            fontSize: 9, fontWeight: 700, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px',
            border: '1.5px solid var(--bg-sidebar)',
          }}>
            {displayCount}
          </span>
        )}
      </button>

      {open && (
        <NotificationPanel
          notifications={loaded ? notifications : []}
          onRead={handleRead}
          onReadAll={handleReadAll}
          onDelete={handleDelete}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}
