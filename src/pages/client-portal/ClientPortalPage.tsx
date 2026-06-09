import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Home, Calendar, CreditCard, List, MessageCircle,
  ChevronLeft, ChevronRight, Send, Loader,
  CheckCircle, XCircle, Clock, ShoppingBag,
} from 'lucide-react'
import { clientPortalApi } from '../../api/clientPortal.api'

const DEVICE_LABELS: Record<string, string> = {
  vacuactiv: 'VacuActiv', rollshape: 'RollShape', infrastep: 'InfraStep', infrashape: 'InfraShape',
}

const tok_key = 'client_portal_token'
const bid_key = 'client_portal_branch'

type Tab = 'home' | 'bookings' | 'subs' | 'activity' | 'chat'

function toISO(d: Date) { return d.toISOString().slice(0, 10) }
function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  wrap: { minHeight: '100dvh', background: '#0a0a0a', color: '#f0f0f0', fontFamily: 'system-ui, sans-serif', maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' as const },
  card: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 16 },
  btn: (active?: boolean): React.CSSProperties => ({
    height: 44, padding: '0 16px', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    background: active ? 'var(--accent)' : 'rgba(255,255,255,0.08)', border: active ? 'none' : '1px solid rgba(255,255,255,0.12)',
    color: active ? '#fff' : '#ccc',
  }),
  input: { height: 44, padding: '0 14px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: '#f0f0f0', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' as const, fontFamily: 'inherit' },
  muted: { color: '#888', fontSize: 12 },
  label: { fontSize: 11, color: '#666', marginBottom: 5, display: 'block', textTransform: 'uppercase' as const, letterSpacing: 0.5 },
}

// ─── LoginScreen ──────────────────────────────────────────────────────────────

function LoginScreen({ portalToken, onLogin }: { portalToken: string; onLogin: (token: string) => void }) {
  const [phone,   setPhone]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!phone.trim()) { setError('Введите номер телефона'); return }
    setLoading(true); setError(null)
    try {
      const res = await clientPortalApi.auth(phone.trim(), portalToken)
      localStorage.setItem(tok_key, res.token)
      onLogin(res.token)
    } catch {
      setError('Клиент не найден. Проверьте номер телефона.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ ...s.wrap, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'color-mix(in srgb, var(--accent) 15%, transparent)', border: '2px solid color-mix(in srgb, var(--accent) 40%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>
            💎
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px' }}>Slimway</h1>
          <p style={{ ...s.muted, margin: 0 }}>Личный кабинет клиента</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={s.label}>Номер телефона</label>
            <input style={s.input} type="tel" placeholder="+7 777 000 00 00" value={phone} onChange={e => setPhone(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void handleSubmit() }} />
          </div>
          {error && <div style={{ fontSize: 13, color: '#f87171', padding: '8px 12px', background: 'var(--color-danger-muted)', borderRadius: 8 }}>{error}</div>}
          <button onClick={() => void handleSubmit()} disabled={loading} style={{ ...s.btn(true), width: '100%', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── TabBar ───────────────────────────────────────────────────────────────────

function TabBar({ tab, onChange, unread }: { tab: Tab; onChange: (t: Tab) => void; unread: number }) {
  const TABS: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: 'home',     icon: <Home size={18} />,          label: 'Главная'  },
    { id: 'bookings', icon: <Calendar size={18} />,      label: 'Записи'   },
    { id: 'subs',     icon: <CreditCard size={18} />,    label: 'Абон.'    },
    { id: 'activity', icon: <List size={18} />,          label: 'Лента'    },
    { id: 'chat',     icon: <MessageCircle size={18} />, label: 'Чат'      },
  ]
  return (
    <div style={{ display: 'flex', background: 'rgba(0,0,0,0.8)', borderTop: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
      {TABS.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          style={{ flex: 1, height: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', position: 'relative' }}>
          <span style={{ color: tab === t.id ? 'var(--accent)' : '#555' }}>{t.icon}</span>
          <span style={{ fontSize: 10, color: tab === t.id ? 'var(--accent)' : '#555' }}>{t.label}</span>
          {t.id === 'chat' && unread > 0 && (
            <span style={{ position: 'absolute', top: 8, right: '50%', marginRight: -18, width: 16, height: 16, background: 'var(--color-danger)', borderRadius: '50%', fontSize: 10, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// ─── HomeTab ──────────────────────────────────────────────────────────────────

function HomeTab({ me, subs, bookings }: { me: Record<string, unknown>; subs: Record<string, unknown>[]; bookings: Record<string, unknown>[] }) {
  const name = (me.full_name as string ?? '').split(' ')[0]
  const activeSub = subs.find(s => s.status === 'active')
  const now = new Date().toISOString().slice(0, 10)
  const nextBooking = bookings.find(b => {
    const slot = b.schedule_slots as Record<string, unknown> | null
    return slot && (slot.date as string) >= now && !b.attended
  })
  const slot = nextBooking?.schedule_slots as Record<string, unknown> | null
  const device = slot?.devices as Record<string, unknown> | null

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 22, fontWeight: 700 }}>
        Привет, {name}! 👋
      </div>

      {activeSub ? (
        <div style={{ ...s.card, background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 15%, transparent), color-mix(in srgb, var(--accent) 5%, transparent))', borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)' }}>
          <div style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Активный абонемент</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{activeSub.name as string}</div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>{activeSub.slot_1_sessions_left as number}</div>
              <div style={{ ...s.muted }}>сессий осталось</div>
            </div>
            {!!activeSub.date_end && (
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{fmtDate(activeSub.date_end as string)}</div>
                <div style={{ ...s.muted }}>действует до</div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ ...s.card, textAlign: 'center', padding: 24 }}>
          <CreditCard size={32} color="#555" style={{ margin: '0 auto 8px' }} />
          <div style={{ color: '#888' }}>Нет активного абонемента</div>
        </div>
      )}

      {nextBooking && slot ? (
        <div style={{ ...s.card }}>
          <div style={{ fontSize: 11, color: 'var(--color-warning)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Ближайшая запись</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{fmtDate(slot.date as string)}</div>
          <div style={{ ...s.muted, marginTop: 4 }}>
            {slot.time_start as string} — {slot.time_end as string}
            {device && ` · ${DEVICE_LABELS[device.type as string] ?? device.type} №${device.number}`}
          </div>
        </div>
      ) : (
        <div style={{ ...s.card, textAlign: 'center', padding: 24 }}>
          <Calendar size={32} color="#555" style={{ margin: '0 auto 8px' }} />
          <div style={{ color: '#888' }}>Нет предстоящих записей</div>
        </div>
      )}
    </div>
  )
}

// ─── BookingsTab ──────────────────────────────────────────────────────────────

function BookingsTab({ token, bookings, subs, onRefresh }: {
  token: string
  bookings: Record<string, unknown>[]
  subs: Record<string, unknown>[]
  onRefresh: () => void
}) {
  const [showNew,    setShowNew]    = useState(false)
  const [selDate,    setSelDate]    = useState(toISO(new Date()))
  const [slots,      setSlots]      = useState<Record<string, unknown>[]>([])
  const [loadSlots,  setLoadSlots]  = useState(false)
  const [selSub,     setSelSub]     = useState('')
  const [selSlot,    setSelSlot]    = useState('')
  const [booking,    setBooking]    = useState(false)
  const [bookErr,    setBookErr]    = useState<string | null>(null)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null)

  const now = toISO(new Date())
  const future = bookings.filter(b => {
    const slot = b.schedule_slots as Record<string, unknown> | null
    return slot && (slot.date as string) >= now
  })
  const activeSub = subs.find(s => s.status === 'active')

  const loadSlotsFn = async (d: string) => {
    setLoadSlots(true); setSlots([])
    try {
      const data = await clientPortalApi.getSchedule(token, d)
      setSlots(data)
    } finally {
      setLoadSlots(false)
    }
  }

  const handleDateChange = (d: string) => {
    setSelDate(d); setSelSlot(''); void loadSlotsFn(d)
  }

  useEffect(() => { if (showNew) void loadSlotsFn(selDate) }, [showNew])

  const handleBook = async () => {
    if (!selSub || !selSlot) return
    setBooking(true); setBookErr(null)
    try {
      await clientPortalApi.createBooking(token, { subscription_id: selSub, slot_1_schedule_slot_id: selSlot, date: selDate })
      setShowNew(false); setSelSlot('')
      onRefresh()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Ошибка'
      setBookErr(msg)
    } finally {
      setBooking(false)
    }
  }

  const handleCancel = (id: string) => {
    setCancelError(null)
    setConfirmCancel(id)
  }

  const doCancel = async () => {
    if (!confirmCancel) return
    setCancelling(confirmCancel)
    setConfirmCancel(null)
    try {
      await clientPortalApi.cancelBooking(token, confirmCancel)
      onRefresh()
    } catch (e: unknown) {
      const errMsg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Ошибка при отмене'
      setCancelError(errMsg)
    } finally {
      setCancelling(null)
    }
  }

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Мои записи</div>
        <button onClick={() => setShowNew(v => !v)} style={s.btn(showNew)}>
          {showNew ? 'Закрыть' : '+ Записаться'}
        </button>
      </div>

      {showNew && (
        <div style={{ ...s.card, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={s.label}>Абонемент</label>
            <select value={selSub} onChange={e => setSelSub(e.target.value)}
              style={{ ...s.input, appearance: 'none' }}>
              <option value="">Выбрать...</option>
              {subs.filter(s => s.status === 'active').map(sub => (
                <option key={sub.id as string} value={sub.id as string}>{sub.name as string} ({sub.slot_1_sessions_left as number} сессий)</option>
              ))}
            </select>
          </div>
          <div>
            <label style={s.label}>Дата</label>
            <input type="date" style={s.input} value={selDate} min={now}
              onChange={e => handleDateChange(e.target.value)} />
          </div>
          {loadSlots ? (
            <div style={{ textAlign: 'center', color: '#888', padding: 16 }}><Loader size={18} /></div>
          ) : slots.length === 0 ? (
            <div style={{ color: '#888', fontSize: 13, textAlign: 'center', padding: 8 }}>Нет свободных слотов</div>
          ) : (
            <div>
              <label style={s.label}>Слот</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {slots.map(slot => {
                  const dev = slot.devices as Record<string, unknown> | null
                  return (
                    <button key={slot.id as string} onClick={() => setSelSlot(slot.id as string)}
                      style={{ ...s.btn(selSlot === slot.id), padding: '0 12px', height: 38, fontSize: 13 }}>
                      {slot.time_start as string}
                      {dev && ` · ${DEVICE_LABELS[dev.type as string] ?? dev.type}`}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          {bookErr && <div style={{ fontSize: 13, color: '#f87171' }}>{bookErr}</div>}
          <button onClick={() => void handleBook()} disabled={!selSub || !selSlot || booking}
            style={{ ...s.btn(true), width: '100%', opacity: selSub && selSlot && !booking ? 1 : 0.5 }}>
            {booking ? 'Запись...' : 'Подтвердить запись'}
          </button>
        </div>
      )}

      {/* Модал подтверждения отмены */}
      {confirmCancel && (
        <div style={{ ...s.card, background: 'color-mix(in srgb, var(--color-danger) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Отменить запись?</div>
          <div style={{ ...s.muted, marginBottom: 12 }}>Это действие нельзя отменить.</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => void doCancel()} style={{ ...s.btn(), background: 'var(--color-danger)', color: '#fff', border: 'none', flex: 1 }}>Отменить запись</button>
            <button onClick={() => setConfirmCancel(null)} style={{ ...s.btn(), flex: 1 }}>Назад</button>
          </div>
        </div>
      )}

      {/* Ошибка отмены */}
      {cancelError && (
        <div style={{ ...s.card, background: 'color-mix(in srgb, var(--color-danger) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: '#f87171' }}>Отмена невозможна</div>
          <div style={{ fontSize: 13, color: '#f87171', marginBottom: 10 }}>{cancelError}</div>
          <button onClick={() => setCancelError(null)} style={{ ...s.btn(), width: '100%' }}>Понятно</button>
        </div>
      )}

      {future.length === 0 && !showNew && (
        <div style={{ ...s.card, textAlign: 'center', padding: 32, color: '#888' }}>
          Предстоящих записей нет
          {activeSub && <div style={{ marginTop: 8, fontSize: 13, color: 'var(--accent)', cursor: 'pointer' }} onClick={() => setShowNew(true)}>Записаться →</div>}
        </div>
      )}

      {future.map(b => {
        const slot   = b.schedule_slots as Record<string, unknown> | null
        const dev    = slot ? (slot.devices as Record<string, unknown> | null) : null
        const status = b.status as string | undefined
        const statusLabel = status === 'pending' ? '⏳ Ожидает подтверждения'
          : status === 'confirmed' ? '✅ Подтверждено'
          : status === 'cancelled' ? '❌ Отменено'
          : undefined
        const statusColor = status === 'pending' ? 'var(--color-warning)' : status === 'confirmed' ? 'var(--color-success)' : 'var(--color-danger)'
        return (
          <div key={b.id as string} style={{ ...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{slot ? fmtDate(slot.date as string) : '—'}</div>
              <div style={{ ...s.muted }}>
                {slot ? `${slot.time_start as string} — ${slot.time_end as string}` : ''}
                {dev ? ` · ${DEVICE_LABELS[dev.type as string] ?? dev.type}` : ''}
              </div>
              {statusLabel && <div style={{ fontSize: 11, color: statusColor, marginTop: 4 }}>{statusLabel}</div>}
            </div>
            {status !== 'cancelled' && (
              <button onClick={() => handleCancel(b.id as string)} disabled={cancelling === b.id}
                style={{ height: 34, padding: '0 12px', background: 'var(--color-danger-muted)', border: '1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)', borderRadius: 8, color: '#f87171', fontSize: 12, cursor: 'pointer' }}>
                {cancelling === b.id ? '...' : 'Отменить'}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── SubsTab ──────────────────────────────────────────────────────────────────

function SubsTab({ subs }: { subs: Record<string, unknown>[] }) {
  const active = subs.filter(s => s.status === 'active')
  const past   = subs.filter(s => s.status !== 'active')

  const SubCard = ({ sub }: { sub: Record<string, unknown> }) => {
    const used  = (sub.slot_1_sessions_total as number) - (sub.slot_1_sessions_left as number)
    const total = sub.slot_1_sessions_total as number
    const pct   = total > 0 ? Math.round((used / total) * 100) : 0
    const isActive = sub.status === 'active'

    return (
      <div style={{ ...s.card, opacity: isActive ? 1 : 0.6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{sub.name as string}</div>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: isActive ? 'var(--color-success-muted)' : 'rgba(113,113,122,0.15)', color: isActive ? 'var(--color-success)' : '#888' }}>
            {isActive ? 'Активный' : sub.status === 'frozen' ? 'Заморожен' : sub.status === 'expired' ? 'Истёк' : 'Отменён'}
          </span>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, marginBottom: 6 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: isActive ? 'var(--accent)' : '#555', borderRadius: 3, transition: 'width 0.4s' }} />
        </div>
        <div style={{ ...s.muted }}>{used} из {total} сессий использовано</div>
        {!!sub.slot_2_type && <div style={{ ...s.muted, marginTop: 2, fontSize: 11 }}>Слот 2: {sub.slot_2_sessions_left as number}/{sub.slot_2_sessions_total as number}</div>}
        {!!sub.slot_3_type && <div style={{ ...s.muted, marginTop: 2, fontSize: 11 }}>Слот 3: {sub.slot_3_sessions_left as number}/{sub.slot_3_sessions_total as number}</div>}
        {!!sub.slot_4_type && <div style={{ ...s.muted, marginTop: 2, fontSize: 11 }}>Слот 4: {sub.slot_4_sessions_left as number}/{sub.slot_4_sessions_total as number}</div>}
        {!!sub.date_end && (
          <div style={{ ...s.muted, marginTop: 4 }}>До {fmtDate(sub.date_end as string)}</div>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 18, fontWeight: 700 }}>Абонементы</div>
      {active.map(s => <SubCard key={s.id as string} sub={s} />)}
      {past.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8 }}>История</div>
          {past.map(s => <SubCard key={s.id as string} sub={s} />)}
        </>
      )}
      {subs.length === 0 && (
        <div style={{ ...s.card, textAlign: 'center', padding: 32, color: '#888' }}>Абонементов нет</div>
      )}
    </div>
  )
}

// ─── ActivityTab ──────────────────────────────────────────────────────────────

function ActivityTab({ activity }: { activity: Record<string, unknown>[] }) {
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 18, fontWeight: 700 }}>Лента активности</div>
      {activity.length === 0 && (
        <div style={{ ...s.card, textAlign: 'center', padding: 32, color: '#888' }}>Активности пока нет</div>
      )}
      {activity.map((item: Record<string, unknown>) => {
        const isBooking = item.type === 'booking'
        const icon = isBooking
          ? (item.attended ? <CheckCircle size={18} color="var(--color-success)" /> : <Clock size={18} color="var(--color-warning)" />)
          : <ShoppingBag size={18} color="var(--accent)" />

        return (
          <div key={item.id as string} style={{ ...s.card, display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ flexShrink: 0 }}>{icon}</div>
            <div style={{ flex: 1 }}>
              {isBooking ? (
                <>
                  <div style={{ fontWeight: 500 }}>{item.attended ? 'Посещение' : 'Запись'}</div>
                  <div style={{ ...s.muted }}>{item.date ? fmtDate(item.date as string) : '—'}</div>
                </>
              ) : (
                <>
                  <div style={{ fontWeight: 500 }}>{item.name as string}</div>
                  <div style={{ ...s.muted }}>
                    Покупка{item.price ? ` · ${(item.price as number).toLocaleString('ru-RU')} ₸` : ''}
                  </div>
                </>
              )}
            </div>
            <div style={{ ...s.muted, flexShrink: 0 }}>
              {new Date(item.created_at as string).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── ChatTab ──────────────────────────────────────────────────────────────────

type Msg = { id: string; sender: string; text: string; created_at: string; is_read: boolean }

function ChatTab({ token, onUnreadChange }: { token: string; onUnreadChange: (n: number) => void }) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [text,     setText]     = useState('')
  const [sending,  setSending]  = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const load = async () => {
    try {
      const data = await clientPortalApi.getMessages(token)
      setMessages(data)
      onUnreadChange(0)
    } catch { /* ignore */ }
  }

  useEffect(() => { void load() }, [])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const handleSend = async () => {
    if (!text.trim() || sending) return
    const optimistic: Msg = { id: Date.now().toString(), sender: 'client', text: text.trim(), created_at: new Date().toISOString(), is_read: true }
    setMessages(prev => [...prev, optimistic])
    const t = text.trim(); setText('')
    setSending(true)
    try {
      await clientPortalApi.sendMessage(token, t)
      await load()
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 16, fontWeight: 700 }}>
        Чат с менеджером
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#666', padding: 32 }}>Напишите нам — мы ответим!</div>
        )}
        {messages.map(m => (
          <div key={m.id} style={{ display: 'flex', justifyContent: m.sender === 'client' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '75%', padding: '10px 14px', borderRadius: m.sender === 'client' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: m.sender === 'client' ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
              color: m.sender === 'client' ? '#fff' : '#f0f0f0', fontSize: 14, lineHeight: 1.4,
            }}>
              {m.sender === 'manager' && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Менеджер</div>}
              {m.text}
              <div style={{ fontSize: 10, color: m.sender === 'client' ? 'rgba(255,255,255,0.6)' : '#666', marginTop: 4, textAlign: 'right' }}>
                {new Date(m.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 8 }}>
        <input
          style={{ ...s.input, flex: 1 }}
          placeholder="Сообщение..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend() } }}
        />
        <button onClick={() => void handleSend()} disabled={!text.trim() || sending}
          style={{ width: 44, height: 44, background: text.trim() ? 'var(--accent)' : 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 12, cursor: text.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Send size={18} color={text.trim() ? '#fff' : '#555'} />
        </button>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ClientPortalPage() {
  const { token: urlToken } = useParams<{ token?: string }>()
  const navigate = useNavigate()
  const [token,     setToken]     = useState<string | null>(urlToken ?? localStorage.getItem(tok_key))
  const [me,        setMe]        = useState<Record<string, unknown> | null>(null)
  const [subs,      setSubs]      = useState<Record<string, unknown>[]>([])
  const [bookings,  setBookings]  = useState<Record<string, unknown>[]>([])
  const [activity,  setActivity]  = useState<Record<string, unknown>[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [tab,       setTab]       = useState<Tab>('home')
  const [unread,    setUnread]    = useState(0)


  const loadAll = async (t: string) => {
    setLoading(true); setError(null)
    try {
      const [meData, subsData, bookData, actData] = await Promise.all([
        clientPortalApi.getMe(t),
        clientPortalApi.getSubscriptions(t),
        clientPortalApi.getBookings(t),
        clientPortalApi.getActivity(t),
      ])
      setMe(meData)
      setSubs(subsData)
      setBookings(bookData)
      setActivity(actData)
    } catch {
      setError('Сессия истекла. Пожалуйста, войдите снова.')
      setToken(null)
      localStorage.removeItem(tok_key)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (urlToken) {
      localStorage.setItem(tok_key, urlToken)
      setToken(urlToken)
    }
  }, [urlToken])

  useEffect(() => {
    if (token) void loadAll(token)
    else setLoading(false)
  }, [token])

  if (!token || error) {
    return <LoginScreen portalToken={urlToken ?? ''} onLogin={t => { setToken(t); navigate(`/client/${t}`, { replace: true }) }} />
  }

  if (loading) {
    return (
      <div style={{ ...s.wrap, alignItems: 'center', justifyContent: 'center' }}>
        <Loader size={32} color="var(--accent)" />
      </div>
    )
  }

  if (!me) return null

  return (
    <div style={s.wrap}>
      <div style={{ flex: 1, overflowY: tab === 'chat' ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column' }}>
        {tab === 'home'     && <HomeTab me={me} subs={subs} bookings={bookings} />}
        {tab === 'bookings' && <BookingsTab token={token} bookings={bookings} subs={subs} onRefresh={() => void loadAll(token)} />}
        {tab === 'subs'     && <SubsTab subs={subs} />}
        {tab === 'activity' && <ActivityTab activity={activity} />}
        {tab === 'chat'     && <ChatTab token={token} onUnreadChange={setUnread} />}
      </div>
      <TabBar tab={tab} onChange={setTab} unread={unread} />
    </div>
  )
}
