import React, { useState, useEffect, useRef, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, Search, X, AlertCircle, Calendar, Trash2 } from 'lucide-react'
import { scheduleSlotsApi, bookingsV2Api, type BookingV2Error, type BookingInfo } from '../../api/schedule-slots.api'
import { devicesApi } from '../../api/devices.api'
import { clientsApi } from '../../api/clients.api'
import { subscriptionsApi } from '../../api/subscriptions.api'
import { useAuth } from '../../hooks/useAuth'
import type { Device, ScheduleSlot, Client, Subscription, Role } from '../../types'

// ─── constants & helpers ────────────────────────────────────────────────────

const TIME_SLOTS: string[] = []
for (let h = 8; h <= 21; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`)
  if (h < 21) TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`)
}

const DURATIONS = [15, 20, 25, 30, 45, 60]

const DEVICE_TYPE_LABELS: Record<string, string> = {
  vacuactiv: 'VacuActiv', rollshape: 'RollShape', infrastep: 'InfraStep', infrashape: 'InfraShape',
}
const DEVICE_TYPE_COLORS: Record<string, string> = {
  vacuactiv: '#02BDB6', rollshape: '#263CD9', infrastep: '#8b5cf6', infrashape: '#f59e0b',
}
const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  free:        { bg: 'rgba(16,185,129,0.15)',   border: 'rgba(16,185,129,0.4)',   text: '#10b981' },
  booked:      { bg: 'rgba(2,189,182,0.18)',    border: 'rgba(2,189,182,0.45)',   text: '#02BDB6' },
  blocked:     { bg: 'rgba(113,113,122,0.12)',  border: 'rgba(113,113,122,0.3)',  text: '#71717A' },
  maintenance: { bg: 'rgba(245,158,11,0.12)',   border: 'rgba(245,158,11,0.3)',   text: '#f59e0b' },
}
const STATUS_LABELS: Record<string, string> = {
  free: 'Свободно', booked: 'Занято', blocked: 'Заблокировано', maintenance: 'Обслуживание',
}

function ft(t: string) { return t.slice(0, 5) }

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + mins
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function toISO(d: Date) { return d.toISOString().slice(0, 10) }

function formatDate(d: Date) {
  return d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })
}

function diffMinutes(timeStart: string, timeEnd: string): number {
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  return toMin(timeEnd) - toMin(timeStart)
}

const inputStyle: React.CSSProperties = {
  height: 36, padding: '0 13px', background: 'var(--bg-elevated)',
  border: '1px solid var(--glass-border)', borderRadius: 8,
  color: 'var(--text-primary)', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box',
}
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' }

// ─── ClientSearch ─────────────────────────────────────────────────────────────

interface ClientSearchProps { value: Client | null; onChange: (c: Client | null) => void }
function ClientSearch({ value, onChange }: ClientSearchProps) {
  const [q, setQ]       = useState('')
  const [res, setRes]   = useState<Client[]>([])
  const [open, setOpen] = useState(false)
  const timer           = useRef<ReturnType<typeof setTimeout>>()
  const wrapRef         = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const search = (val: string) => {
    setQ(val); clearTimeout(timer.current)
    if (!val.trim()) { setRes([]); setOpen(false); return }
    timer.current = setTimeout(async () => {
      try { const d = await clientsApi.getAll(val); setRes(d.slice(0, 8)); setOpen(true) } catch { /* */ }
    }, 300)
  }

  if (value) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 36, padding: '0 13px', background: 'var(--bg-elevated)', border: '1px solid #02BDB6', borderRadius: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{value.full_name}</span>
        <button onClick={() => onChange(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 0 }}><X size={13} /></button>
      </div>
    )
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <Search size={13} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
      <input style={{ ...inputStyle, paddingLeft: 30 }} placeholder="Поиск клиента..." value={q} onChange={e => search(e.target.value)} onFocus={() => q && setOpen(true)} />
      {open && res.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 8, overflow: 'hidden', marginTop: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
          {res.map(c => (
            <button key={c.id} onClick={() => { onChange(c); setQ(''); setOpen(false) }} style={{ display: 'block', width: '100%', padding: '8px 13px', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontSize: 13 }}>
              {c.full_name}{c.phone && <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 8 }}>{c.phone}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── CreateSlotModal ──────────────────────────────────────────────────────────

interface CreateSlotTarget { device: Device; timeStart: string; date: string }
interface CreateSlotModalProps { target: CreateSlotTarget; onClose: () => void; onCreate: (slot: ScheduleSlot) => void }

function CreateSlotModal({ target, onClose, onCreate }: CreateSlotModalProps) {
  const [duration, setDuration] = useState(30)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const timeEnd = addMinutes(target.timeStart, duration)

  const handleCreate = async () => {
    setSaving(true); setError(null)
    try {
      const slot = await scheduleSlotsApi.create({
        device_id:  target.device.id,
        date:       target.date,
        time_start: target.timeStart,
        time_end:   timeEnd,
      })
      onCreate(slot)
    } catch (e: unknown) {
      const code = (e as { response?: { data?: { code?: string } } })?.response?.data?.code
      setError(code === 'SLOT_EXISTS' ? 'Ячейка на это время уже существует' : 'Не удалось создать ячейку')
    } finally {
      setSaving(false)
    }
  }

  const devColor = DEVICE_TYPE_COLORS[target.device.type] ?? '#02BDB6'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 400, background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 21 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 21 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Создать ячейку</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}><X size={18} /></button>
        </div>
        <div style={{ padding: '13px', background: 'var(--bg-surface)', borderRadius: 13, marginBottom: 13, border: `1px solid ${devColor}33` }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: devColor }}>
            {DEVICE_TYPE_LABELS[target.device.type]} #{target.device.number}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>
            {new Date(target.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} · {target.timeStart}
          </div>
        </div>
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 13, fontSize: 12, color: '#ef4444' }}>
            <AlertCircle size={13} />{error}
          </div>
        )}
        <div style={{ marginBottom: 13 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Длительность</div>
          <select style={selectStyle} value={duration} onChange={e => setDuration(Number(e.target.value))}>
            {DURATIONS.map(d => <option key={d} value={d}>{d} мин → до {addMinutes(target.timeStart, d)}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => void handleCreate()} disabled={saving} style={{ flex: 1, height: 38, background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Создание...' : 'Создать'}
          </button>
          <button onClick={onClose} style={{ height: 38, padding: '0 13px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>Отмена</button>
        </div>
      </div>
    </div>
  )
}

// ─── BookingModal (для свободных ячеек) ──────────────────────────────────────

interface BookingModalProps { slot: ScheduleSlot; device: Device; onClose: () => void; onBooked: () => void }

function BookingModal({ slot, device, onClose, onBooked }: BookingModalProps) {
  const [client,  setClient]  = useState<Client | null>(null)
  const [subs,    setSubs]    = useState<Subscription[]>([])
  const [selSub,  setSelSub]  = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!client) { setSubs([]); setSelSub(null); return }
    setLoading(true)
    subscriptionsApi.getAll({ client_id: client.id, status: 'active' })
      .then(data => { setSubs(data); setSelSub(data[0] ?? null) })
      .catch(() => setError('Не удалось загрузить абонементы'))
      .finally(() => setLoading(false))
  }, [client])

  const handleBook = async () => {
    if (!client || !selSub) { setError('Выберите клиента и абонемент'); return }
    setSaving(true); setError(null)
    try {
      await bookingsV2Api.create({
        client_id:               client.id,
        subscription_id:         selSub.id,
        slot_1_schedule_slot_id: slot.id,
        date:                    slot.date,
      })
      onBooked()
    } catch (e: unknown) {
      const resp = (e as { response?: { data?: BookingV2Error } })?.response?.data
      if (resp?.code === 'NO_SLOT2') {
        const nxt = resp.next_available
        const hint = nxt ? ` Ближайшее доступное: ${nxt.date} в ${ft(nxt.time_start)}` : ''
        setError(`Нет свободного слота 2 (${resp.slot_2_type}) сразу после этого слота.${hint}`)
      } else {
        setError(resp?.error ?? 'Ошибка бронирования')
      }
    } finally {
      setSaving(false)
    }
  }

  const devColor = DEVICE_TYPE_COLORS[device.type] ?? '#02BDB6'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 460, background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 21 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 21 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Забронировать</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}><X size={18} /></button>
        </div>
        <div style={{ padding: 13, background: 'var(--bg-surface)', borderRadius: 13, marginBottom: 13, border: `1px solid ${devColor}33` }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: devColor }}>
            {DEVICE_TYPE_LABELS[device.type]} #{device.number}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>
            {new Date(slot.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} · {ft(slot.time_start)} — {ft(slot.time_end)}
          </div>
        </div>
        {error && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 13, fontSize: 12, color: '#ef4444', lineHeight: 1.5 }}>
            <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />{error}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Клиент</div>
            <ClientSearch value={client} onChange={c => { setClient(c); setError(null) }} />
          </div>
          {client && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Абонемент</div>
              {loading ? (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>Загрузка...</div>
              ) : subs.length === 0 ? (
                <div style={{ fontSize: 13, color: '#f59e0b', padding: '8px 0' }}>Нет активных абонементов у клиента</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {subs.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSelSub(s)}
                      style={{ padding: '10px 13px', background: selSub?.id === s.id ? 'rgba(2,189,182,0.10)' : 'var(--bg-surface)', border: `1px solid ${selSub?.id === s.id ? '#02BDB6' : 'var(--glass-border)'}`, borderRadius: 8, cursor: 'pointer', textAlign: 'left' }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 3 }}>{s.name}</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: DEVICE_TYPE_COLORS[s.slot_1_type] }}>
                          {DEVICE_TYPE_LABELS[s.slot_1_type]}: {s.slot_1_sessions_left}/{s.slot_1_sessions_total}
                        </span>
                        {s.slot_2_type && s.slot_2_sessions_left !== null && (
                          <span style={{ fontSize: 11, color: DEVICE_TYPE_COLORS[s.slot_2_type] }}>
                            + {DEVICE_TYPE_LABELS[s.slot_2_type]}: {s.slot_2_sessions_left}/{s.slot_2_sessions_total}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {selSub?.slot_2_type && (
            <div style={{ padding: '8px 13px', background: 'rgba(2,189,182,0.06)', border: '1px solid rgba(2,189,182,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
              Слот 2 ({DEVICE_TYPE_LABELS[selSub.slot_2_type]}) будет подобран автоматически — первый свободный тренажёр сразу после окончания этого слота.
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              onClick={() => void handleBook()}
              disabled={saving || !client || !selSub}
              style={{ flex: 1, height: 40, background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: (saving || !client || !selSub) ? 'not-allowed' : 'pointer', opacity: (saving || !client || !selSub) ? 0.5 : 1 }}
            >
              {saving ? 'Бронирование...' : 'Подтвердить бронь'}
            </button>
            <button onClick={onClose} style={{ height: 40, padding: '0 13px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>Отмена</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── BookingInfoModal (для занятых ячеек) ────────────────────────────────────

interface BookingInfoModalProps {
  slot: ScheduleSlot
  device: Device
  userRole: Role
  onClose: () => void
  onCancelled: () => void
}

function BookingInfoModal({ slot, device, userRole, onClose, onCancelled }: BookingInfoModalProps) {
  const [info,       setInfo]       = useState<BookingInfo | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  useEffect(() => {
    if (!slot.booking_id) { setLoading(false); return }
    bookingsV2Api.getById(slot.booking_id)
      .then(setInfo)
      .catch(() => setError('Не удалось загрузить данные брони'))
      .finally(() => setLoading(false))
  }, [slot.booking_id])

  const handleCancel = async () => {
    if (!info) return
    setCancelling(true); setError(null)
    try {
      await bookingsV2Api.cancel(info.booking.id)
      onCancelled()
    } catch {
      setError('Ошибка при снятии брони')
    } finally {
      setCancelling(false)
    }
  }

  const devColor = DEVICE_TYPE_COLORS[device.type] ?? '#02BDB6'

  let canCancel = false
  let cancelHint: string | null = null
  if (info) {
    const slotStart = new Date(`${info.slot_1.date}T${info.slot_1.time_start}`)
    const hoursLeft = (slotStart.getTime() - Date.now()) / (1000 * 60 * 60)
    if (hoursLeft < 24) {
      canCancel = ['owner', 'franchisee'].includes(userRole)
      if (!canCancel) cancelHint = 'До сеанса менее 24 ч — снять бронь может только управляющий'
    } else {
      canCancel = ['owner', 'franchisee', 'admin'].includes(userRole)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 460, background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 21 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 21 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Информация о брони</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}><X size={18} /></button>
        </div>

        {/* Ячейка */}
        <div style={{ padding: 13, background: 'var(--bg-surface)', borderRadius: 13, marginBottom: 13, border: `1px solid ${devColor}33` }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: devColor }}>
            {DEVICE_TYPE_LABELS[device.type]} #{device.number}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>
            {new Date(slot.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} · {ft(slot.time_start)} — {ft(slot.time_end)}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '34px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>Загрузка...</div>
        ) : !info ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: 12, color: '#ef4444' }}>
            <AlertCircle size={13} />{error ?? 'Данные о брони не найдены'}
          </div>
        ) : (
          <>
            {/* Клиент */}
            <div style={{ padding: 13, background: 'var(--bg-surface)', borderRadius: 13, marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>Клиент</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{info.client.full_name}</div>
              {info.client.phone && (
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{info.client.phone}</div>
              )}
            </div>

            {/* Абонемент */}
            <div style={{ padding: 13, background: 'var(--bg-surface)', borderRadius: 13, marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>Абонемент</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{info.subscription.name}</div>
            </div>

            {/* Слоты */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 13 }}>
              {([info.slot_1, info.slot_2] as Array<typeof info.slot_1 | null>).map((s, i) => {
                if (!s) return null
                const dev = s.devices
                const dColor = dev ? (DEVICE_TYPE_COLORS[dev.type] ?? '#71717A') : '#71717A'
                const dur = diffMinutes(ft(s.time_start), ft(s.time_end))
                return (
                  <div key={i} style={{ padding: 13, background: 'var(--bg-surface)', borderRadius: 13, border: `1px solid ${dColor}22` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Слот {i + 1}</div>
                      {dur > 0 && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{dur} мин</div>}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: dColor }}>
                      {dev ? `${DEVICE_TYPE_LABELS[dev.type]} #${dev.number}` : '—'}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {ft(s.time_start)} — {ft(s.time_end)}
                    </div>
                  </div>
                )
              })}
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 13, fontSize: 12, color: '#ef4444' }}>
                <AlertCircle size={13} />{error}
              </div>
            )}

            {cancelHint && (
              <div style={{ padding: '8px 13px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, marginBottom: 13, fontSize: 12, color: '#f59e0b' }}>
                {cancelHint}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => void handleCancel()}
                disabled={!canCancel || cancelling}
                style={{ flex: 1, height: 40, background: canCancel ? 'rgba(239,68,68,0.12)' : 'var(--bg-surface)', border: `1px solid ${canCancel ? 'rgba(239,68,68,0.35)' : 'var(--glass-border)'}`, borderRadius: 8, color: canCancel ? '#ef4444' : 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: (!canCancel || cancelling) ? 'not-allowed' : 'pointer', opacity: cancelling ? 0.6 : 1 }}
              >
                {cancelling ? 'Снятие...' : 'Снять бронь'}
              </button>
              <button onClick={onClose} style={{ height: 40, padding: '0 13px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>Закрыть</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── DeleteConfirmModal ───────────────────────────────────────────────────────

interface DeleteConfirmModalProps {
  slot: ScheduleSlot
  device: Device
  loading: boolean
  onClose: () => void
  onConfirm: () => void
}

function DeleteConfirmModal({ slot, device, loading, onClose, onConfirm }: DeleteConfirmModalProps) {
  const devColor = DEVICE_TYPE_COLORS[device.type] ?? '#02BDB6'
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 380, background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 21 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 13 }}>Удалить ячейку?</div>
        <div style={{ padding: 13, background: 'var(--bg-surface)', borderRadius: 13, marginBottom: 21, border: `1px solid ${devColor}33` }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: devColor }}>
            {DEVICE_TYPE_LABELS[device.type]} #{device.number}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>
            {ft(slot.time_start)} — {ft(slot.time_end)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{ flex: 1, height: 38, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 8, color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Удаление...' : 'Удалить'}
          </button>
          <button onClick={onClose} style={{ height: 38, padding: '0 13px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>Отмена</button>
        </div>
      </div>
    </div>
  )
}

// ─── SchedulePage ─────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const { user } = useAuth()
  const [date,              setDate]             = useState(() => toISO(new Date()))
  const [devices,           setDevices]          = useState<Device[]>([])
  const [slots,             setSlots]            = useState<ScheduleSlot[]>([])
  const [loading,           setLoading]          = useState(true)
  const [error,             setError]            = useState<string | null>(null)
  const [createTarget,      setCreateTarget]     = useState<CreateSlotTarget | null>(null)
  const [bookTarget,        setBookTarget]       = useState<{ slot: ScheduleSlot; device: Device } | null>(null)
  const [bookingInfoTarget, setBookingInfoTarget] = useState<{ slot: ScheduleSlot; device: Device } | null>(null)
  const [deleteConfirm,     setDeleteConfirm]    = useState<{ slot: ScheduleSlot; device: Device } | null>(null)
  const [deletingSlot,      setDeletingSlot]     = useState(false)
  const [hoveredCell,       setHoveredCell]      = useState<string | null>(null)
  const [notification,      setNotification]     = useState<string | null>(null)
  const notifTimer = useRef<ReturnType<typeof setTimeout> | undefined>()

  const canManageSlots = user?.role === 'owner' || user?.role === 'franchisee'

  useEffect(() => () => clearTimeout(notifTimer.current), [])

  const slotMap = useMemo(() => {
    const m = new Map<string, ScheduleSlot>()
    for (const s of slots) m.set(`${s.device_id}:${ft(s.time_start)}`, s)
    return m
  }, [slots])

  const loadData = async (d: string) => {
    setLoading(true); setError(null)
    try {
      const [devs, slotList] = await Promise.all([devicesApi.getAll(), scheduleSlotsApi.getByDate(d)])
      setDevices(devs.filter(dev => dev.status !== 'disabled'))
      setSlots(slotList)
    } catch {
      setError('Не удалось загрузить расписание')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadData(date) }, [date])

  const showNotification = (msg: string) => {
    setNotification(msg)
    clearTimeout(notifTimer.current)
    notifTimer.current = setTimeout(() => setNotification(null), 3000)
  }

  const prevDay = () => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(toISO(d)) }
  const nextDay = () => { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(toISO(d)) }

  const handleCellClick = (device: Device, time: string) => {
    const existing = slotMap.get(`${device.id}:${time}`)
    if (existing) {
      if (existing.status === 'free') setBookTarget({ slot: existing, device })
      else if (existing.status === 'booked') setBookingInfoTarget({ slot: existing, device })
    } else {
      setCreateTarget({ device, timeStart: time, date })
    }
  }

  const handleTrashClick = (slot: ScheduleSlot, device: Device) => {
    if (slot.status === 'booked') {
      showNotification('Сначала снимите бронь, чтобы удалить ячейку')
      return
    }
    setDeleteConfirm({ slot, device })
  }

  const handleDeleteSlot = async () => {
    if (!deleteConfirm) return
    setDeletingSlot(true)
    try {
      await scheduleSlotsApi.delete(deleteConfirm.slot.id)
      setSlots(prev => prev.filter(s => s.id !== deleteConfirm.slot.id))
      setDeleteConfirm(null)
    } catch {
      setDeletingSlot(false)
    }
  }

  const handleCreated = (slot: ScheduleSlot) => { setSlots(prev => [...prev, slot]); setCreateTarget(null) }
  const handleBooked  = () => { setBookTarget(null); void loadData(date) }
  const handleCancelled = () => { setBookingInfoTarget(null); void loadData(date) }

  const dateLabel = new Date(date).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 21, gap: 13 }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text-primary)', margin: 0, marginBottom: 4 }}>Расписание</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, textTransform: 'capitalize' }}>{dateLabel}</p>
        </div>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          style={{ height: 36, padding: '0 13px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer', outline: 'none' }}
        />
      </div>

      {/* Date navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 13, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 13, padding: '8px 13px', backdropFilter: 'blur(12px)' }}>
        <button onClick={prevDay} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <ChevronLeft size={14} strokeWidth={2} />
        </button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{formatDate(new Date(date))}</span>
        <button onClick={nextDay} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <ChevronRight size={14} strokeWidth={2} />
        </button>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 13, marginBottom: 13, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_LABELS).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: STATUS_COLORS[k].bg, border: `1px solid ${STATUS_COLORS[k].border}` }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: 'transparent', border: '1px dashed var(--text-muted)', opacity: 0.4 }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Нет ячейки (клик — создать)</span>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, marginBottom: 13, fontSize: 12, color: '#f59e0b' }}>
          <AlertCircle size={13} />{notification}
        </div>
      )}

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 13, fontSize: 12, color: '#ef4444' }}>
          <AlertCircle size={13} />{error}
        </div>
      )}

      {loading ? (
        <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 55, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Загрузка...</div>
        </div>
      ) : devices.length === 0 ? (
        <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 55, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <Calendar size={28} strokeWidth={1.5} color="var(--text-muted)" style={{ marginBottom: 13 }} />
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>Нет активных тренажёров</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>Добавьте оборудование в Настройках</div>
        </div>
      ) : (
        <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', borderRadius: 21, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: devices.length * 100 + 160 }}>

              {/* Header row */}
              <div style={{ display: 'grid', gridTemplateColumns: `160px repeat(${TIME_SLOTS.length}, 60px)`, borderBottom: '1px solid var(--glass-border)' }}>
                <div style={{ padding: '10px 13px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Тренажёр</div>
                {TIME_SLOTS.map(t => (
                  <div key={t} style={{ padding: '10px 0', textAlign: 'center', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', borderLeft: '1px solid var(--glass-border)' }}>{t}</div>
                ))}
              </div>

              {/* Device rows */}
              {devices.map(device => {
                const devColor = DEVICE_TYPE_COLORS[device.type] ?? '#71717A'
                return (
                  <div key={device.id} style={{ display: 'grid', gridTemplateColumns: `160px repeat(${TIME_SLOTS.length}, 60px)`, borderBottom: '1px solid var(--glass-border)' }}>
                    <div style={{ padding: '10px 13px', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRight: '1px solid var(--glass-border)' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: devColor }}>{DEVICE_TYPE_LABELS[device.type]}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>#{device.number} · Гр. {device.device_group}</div>
                    </div>

                    {TIME_SLOTS.map(time => {
                      const cellKey = `${device.id}:${time}`
                      const slot    = slotMap.get(cellKey)
                      const sc      = slot ? STATUS_COLORS[slot.status] : null
                      const isHovered = hoveredCell === cellKey

                      return (
                        <div
                          key={time}
                          onClick={() => handleCellClick(device, time)}
                          onMouseEnter={e => {
                            setHoveredCell(cellKey)
                            if (!slot) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'
                          }}
                          onMouseLeave={e => {
                            setHoveredCell(null)
                            if (!slot) (e.currentTarget as HTMLDivElement).style.background = 'transparent'
                          }}
                          title={
                            slot
                              ? slot.status === 'booked'
                                ? `Занято: ${ft(slot.time_start)}–${ft(slot.time_end)} — нажмите для деталей`
                                : `${STATUS_LABELS[slot.status]}: ${ft(slot.time_start)}–${ft(slot.time_end)}`
                              : `Создать ячейку ${time}`
                          }
                          style={{
                            height: 48,
                            borderLeft: '1px solid var(--glass-border)',
                            cursor: slot ? (['free', 'booked'].includes(slot.status) ? 'pointer' : 'default') : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.15s',
                            background: sc ? sc.bg : 'transparent',
                            position: 'relative',
                          }}
                        >
                          {slot ? (
                            <>
                              <div style={{ width: 36, height: 28, borderRadius: 6, background: sc!.bg, border: `1px solid ${sc!.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {slot.status === 'free'        && <Plus size={11} strokeWidth={2.5} color={sc!.text} />}
                                {slot.status === 'booked'      && <div style={{ width: 6, height: 6, borderRadius: '50%', background: sc!.text }} />}
                                {slot.status === 'maintenance' && <span style={{ fontSize: 9, color: sc!.text }}>~</span>}
                                {slot.status === 'blocked'     && <span style={{ fontSize: 9, color: sc!.text }}>✕</span>}
                              </div>
                              {isHovered && canManageSlots && (
                                <button
                                  onClick={e => { e.stopPropagation(); handleTrashClick(slot, device) }}
                                  title="Удалить ячейку"
                                  style={{ position: 'absolute', top: 3, right: 3, width: 16, height: 16, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, zIndex: 2 }}
                                >
                                  <Trash2 size={9} color="#ef4444" />
                                </button>
                              )}
                            </>
                          ) : (
                            <div style={{ width: 36, height: 28, borderRadius: 6, border: '1px dashed rgba(255,255,255,0.1)', opacity: 0.4 }} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {createTarget && (
        <CreateSlotModal target={createTarget} onClose={() => setCreateTarget(null)} onCreate={handleCreated} />
      )}
      {bookTarget && (
        <BookingModal slot={bookTarget.slot} device={bookTarget.device} onClose={() => setBookTarget(null)} onBooked={handleBooked} />
      )}
      {bookingInfoTarget && (
        <BookingInfoModal
          slot={bookingInfoTarget.slot}
          device={bookingInfoTarget.device}
          userRole={user?.role ?? 'admin'}
          onClose={() => setBookingInfoTarget(null)}
          onCancelled={handleCancelled}
        />
      )}
      {deleteConfirm && (
        <DeleteConfirmModal
          slot={deleteConfirm.slot}
          device={deleteConfirm.device}
          loading={deletingSlot}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => void handleDeleteSlot()}
        />
      )}
    </div>
  )
}
