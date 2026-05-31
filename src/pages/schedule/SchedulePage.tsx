import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, Search, X, AlertCircle, Calendar, Trash2, Layers, Lock, Unlock, Eye, Zap, CalendarDays, RefreshCw } from 'lucide-react'
import { scheduleSlotsApi, bookingsV2Api, type BookingV2Error, type BookingInfo } from '../../api/schedule-slots.api'
import { ContextMenu, type ContextMenuEntry } from '../../components/ContextMenu'
import { devicesApi } from '../../api/devices.api'
import { clientsApi } from '../../api/clients.api'
import { subscriptionsApi } from '../../api/subscriptions.api'
import { useAuth } from '../../hooks/useAuth'
import type { Device, ScheduleSlot, Client, Subscription, Role } from '../../types'

// ─── constants & helpers ────────────────────────────────────────────────────

const TIME_SLOTS: string[] = []
for (let h = 7; h <= 21; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`)
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`)
}
// 30 columns: 07:00 … 21:30

const SLOT_WIDTH   = 64   // px per time column
const DEVICE_WIDTH = 160  // px for device name column
const CELL_HEIGHT  = 60   // px

const DURATIONS = [15, 20, 25, 30, 45, 60]

const DEVICE_TYPE_LABELS: Record<string, string> = {
  vacuactiv: 'VacuActiv', rollshape: 'RollShape', infrastep: 'InfraStep', infrashape: 'InfraShape',
}
const DEVICE_TYPE_COLORS: Record<string, string> = {
  vacuactiv: '#02BDB6', rollshape: '#263CD9', infrastep: '#8b5cf6', infrashape: '#f59e0b',
}
const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  free:              { bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.4)',  text: '#10b981' },
  booked:            { bg: 'rgba(2,189,182,0.18)',   border: 'rgba(2,189,182,0.45)',  text: '#02BDB6' },
  booked_attended:   { bg: 'rgba(16,185,129,0.18)',  border: 'rgba(16,185,129,0.5)',  text: '#10b981' },
  booked_missed:     { bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.4)',   text: '#ef4444' },
  blocked:           { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)',  text: '#f59e0b' },
  maintenance:       { bg: 'rgba(113,113,122,0.12)', border: 'rgba(113,113,122,0.3)', text: '#71717A' },
}

function slotColorKey(slot: { status: string; bookings_v2?: { attended: boolean | null } | null }): string {
  if (slot.status === 'booked') {
    const att = slot.bookings_v2?.attended
    if (att === true)  return 'booked_attended'
    if (att === false) return 'booked_missed'
  }
  return slot.status
}
const STATUS_LABELS: Record<string, string> = {
  free: 'Свободно', booked: 'Занято', booked_attended: 'Был', booked_missed: 'Не был',
  blocked: 'Заблокировано', maintenance: 'Обслуживание',
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

function cellKey(deviceId: string, time: string): string { return `${deviceId}|${time}` }
function parseCellKey(key: string): { deviceId: string; time: string } {
  const i = key.indexOf('|')
  return { deviceId: key.slice(0, i), time: key.slice(i + 1) }
}

function currentTimeLeft(): number | null {
  const now = new Date()
  const mins = now.getHours() * 60 + now.getMinutes()
  const startMins = 7 * 60
  const endMins   = 22 * 60
  if (mins < startMins || mins > endMins) return null
  return DEVICE_WIDTH + (mins - startMins) * (SLOT_WIDTH / 30)
}

const inputStyle: React.CSSProperties = {
  height: 36, padding: '0 13px', background: 'var(--bg-elevated)',
  border: '1px solid var(--glass-border)', borderRadius: 8,
  color: 'var(--text-primary)', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box',
}
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' }

// ─── Modal backdrop ───────────────────────────────────────────────────────────

function ModalWrap({ onClose, children, maxWidth = 460 }: { onClose: () => void; children: React.ReactNode; maxWidth?: number }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div
        className="modal-animate"
        style={{ position: 'relative', width: '100%', maxWidth, background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 34, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
      >
        {children}
      </div>
    </div>
  )
}

function ModalHeader({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 21, paddingBottom: 21, borderBottom: '1px solid var(--glass-border)' }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>{subtitle}</div>}
      </div>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 4 }}><X size={18} /></button>
    </div>
  )
}

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
      try { const d = await clientsApi.getAll({ search: val }); setRes(d.slice(0, 8)); setOpen(true) } catch { /* */ }
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
  const devColor = DEVICE_TYPE_COLORS[target.device.type] ?? '#02BDB6'

  const handleCreate = async () => {
    setSaving(true); setError(null)
    try {
      const slot = await scheduleSlotsApi.create({ device_id: target.device.id, date: target.date, time_start: target.timeStart, time_end: timeEnd })
      onCreate(slot)
    } catch (e: unknown) {
      const code = (e as { response?: { data?: { code?: string } } })?.response?.data?.code
      setError(code === 'SLOT_EXISTS' ? 'Ячейка на это время уже существует' : 'Не удалось создать ячейку')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalWrap onClose={onClose} maxWidth={400}>
      <ModalHeader title="Создать ячейку" onClose={onClose} />
      <div style={{ padding: 13, background: 'var(--bg-surface)', borderRadius: 13, marginBottom: 21, border: `1px solid ${devColor}33` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: devColor }}>{DEVICE_TYPE_LABELS[target.device.type]} #{target.device.number}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
          {new Date(target.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} · {target.timeStart}
        </div>
      </div>
      {error && <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 21, fontSize: 12, color: '#ef4444' }}><AlertCircle size={13} />{error}</div>}
      <div style={{ marginBottom: 21 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Длительность</div>
        <select style={selectStyle} value={duration} onChange={e => setDuration(Number(e.target.value))}>
          {DURATIONS.map(d => <option key={d} value={d}>{d} мин → до {addMinutes(target.timeStart, d)}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 13 }}>
        <button onClick={() => void handleCreate()} disabled={saving} style={{ flex: 1, height: 40, background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Создание...' : 'Создать'}
        </button>
        <button onClick={onClose} style={{ height: 40, padding: '0 21px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>Отмена</button>
      </div>
    </ModalWrap>
  )
}

// ─── BulkCreateModal ──────────────────────────────────────────────────────────

interface BulkCreateModalProps {
  selection: Set<string>
  devices: Device[]
  date: string
  onClose: () => void
  onCreated: (count: number) => void
}

function BulkCreateModal({ selection, devices, date, onClose, onCreated }: BulkCreateModalProps) {
  const [duration, setDuration] = useState(30)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const deviceMap = useMemo(() => {
    const m = new Map<string, Device>()
    for (const d of devices) m.set(d.id, d)
    return m
  }, [devices])

  const handleCreate = async () => {
    setSaving(true); setError(null)
    try {
      const slots = Array.from(selection).map(key => {
        const { deviceId, time } = parseCellKey(key)
        return { device_id: deviceId, date, time_start: time, time_end: addMinutes(time, duration) }
      })
      const result = await scheduleSlotsApi.bulkCreate(slots)
      onCreated(result.created ?? 0)
    } catch {
      setError('Не удалось создать ячейки')
    } finally {
      setSaving(false)
    }
  }

  const groupedByDevice = useMemo(() => {
    const groups = new Map<string, string[]>()
    for (const key of selection) {
      const { deviceId, time } = parseCellKey(key)
      if (!groups.has(deviceId)) groups.set(deviceId, [])
      groups.get(deviceId)!.push(time)
    }
    return groups
  }, [selection])

  return (
    <ModalWrap onClose={onClose} maxWidth={440}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 21, paddingBottom: 21, borderBottom: '1px solid var(--glass-border)' }}>
        <div style={{ width: 44, height: 44, borderRadius: 13, background: 'rgba(38,60,217,0.12)', border: '1px solid rgba(38,60,217,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Layers size={20} color="#263CD9" />
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Создать {selection.size} ячеек</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Массовое создание расписания</div>
        </div>
        <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
      </div>

      <div style={{ marginBottom: 21, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {Array.from(groupedByDevice.entries()).map(([deviceId, times]) => {
          const dev = deviceMap.get(deviceId)
          const devColor = dev ? (DEVICE_TYPE_COLORS[dev.type] ?? '#71717A') : '#71717A'
          const sorted = [...times].sort()
          return (
            <div key={deviceId} style={{ padding: '10px 13px', background: 'var(--bg-surface)', borderRadius: 8, border: `1px solid ${devColor}22` }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: devColor }}>
                {dev ? `${DEVICE_TYPE_LABELS[dev.type]} #${dev.number}` : deviceId}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                {sorted.join(' · ')}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ marginBottom: 21, paddingTop: 21, borderTop: '1px solid var(--glass-border)' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Длительность каждой ячейки</div>
        <select style={selectStyle} value={duration} onChange={e => setDuration(Number(e.target.value))}>
          {DURATIONS.map(d => <option key={d} value={d}>{d} мин</option>)}
        </select>
      </div>

      {error && <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 13, fontSize: 12, color: '#ef4444' }}><AlertCircle size={13} />{error}</div>}

      <div style={{ display: 'flex', gap: 13 }}>
        <button onClick={() => void handleCreate()} disabled={saving} style={{ flex: 1, height: 40, background: '#263CD9', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Создание...' : `Создать ${selection.size} ячеек`}
        </button>
        <button onClick={onClose} style={{ height: 40, padding: '0 21px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>Отмена</button>
      </div>
    </ModalWrap>
  )
}

// ─── BookingModal ─────────────────────────────────────────────────────────────

interface BookingModalProps { slot: ScheduleSlot; device: Device; onClose: () => void; onBooked: () => void }

function BookingModal({ slot, device, onClose, onBooked }: BookingModalProps) {
  const [client,  setClient]  = useState<Client | null>(null)
  const [subs,    setSubs]    = useState<Subscription[]>([])
  const [selSub,  setSelSub]  = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const devColor = DEVICE_TYPE_COLORS[device.type] ?? '#02BDB6'

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
      await bookingsV2Api.create({ client_id: client.id, subscription_id: selSub.id, slot_1_schedule_slot_id: slot.id, date: slot.date })
      onBooked()
    } catch (e: unknown) {
      const resp = (e as { response?: { data?: BookingV2Error } })?.response?.data
      if (resp?.code === 'NO_SLOT2') {
        const nxt = resp.next_available
        const hint = nxt ? ` Ближайшее доступное: ${nxt.date} в ${ft(nxt.time_start)}` : ''
        setError(`Нет свободного слота 2 (${resp.slot_2_type}) сразу после.${hint}`)
      } else {
        setError(resp?.error ?? 'Ошибка бронирования')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalWrap onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 21, paddingBottom: 21, borderBottom: '1px solid var(--glass-border)' }}>
        <div style={{ width: 44, height: 44, borderRadius: 13, background: devColor + '18', border: `1px solid ${devColor}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Calendar size={20} color={devColor} />
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Забронировать</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            {DEVICE_TYPE_LABELS[device.type]} #{device.number} · {ft(slot.time_start)} — {ft(slot.time_end)}
          </div>
        </div>
        <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
      </div>

      {error && <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 21, fontSize: 12, color: '#ef4444', lineHeight: 1.5 }}><AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 21 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Клиент</div>
          <ClientSearch value={client} onChange={c => { setClient(c); setError(null) }} />
        </div>
        {client && (
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Абонемент</div>
            {loading ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Загрузка...</div>
            ) : subs.length === 0 ? (
              <div style={{ fontSize: 13, color: '#f59e0b' }}>Нет активных абонементов</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {subs.map(s => (
                  <button key={s.id} onClick={() => setSelSub(s)} style={{ padding: '10px 13px', background: selSub?.id === s.id ? 'rgba(2,189,182,0.10)' : 'var(--bg-surface)', border: `1px solid ${selSub?.id === s.id ? '#02BDB6' : 'var(--glass-border)'}`, borderRadius: 8, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>{s.name}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: DEVICE_TYPE_COLORS[s.slot_1_type] }}>{DEVICE_TYPE_LABELS[s.slot_1_type]}: {s.slot_1_sessions_left}/{s.slot_1_sessions_total}</span>
                      {s.slot_2_type && s.slot_2_sessions_left !== null && (
                        <span style={{ fontSize: 11, color: DEVICE_TYPE_COLORS[s.slot_2_type] }}>+ {DEVICE_TYPE_LABELS[s.slot_2_type]}: {s.slot_2_sessions_left}/{s.slot_2_sessions_total}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {selSub?.slot_2_type && (
          <div style={{ padding: '10px 13px', background: 'rgba(2,189,182,0.06)', border: '1px solid rgba(2,189,182,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
            Слот 2 ({DEVICE_TYPE_LABELS[selSub.slot_2_type]}) подберётся автоматически.
          </div>
        )}
        <div style={{ display: 'flex', gap: 13, paddingTop: 21, borderTop: '1px solid var(--glass-border)' }}>
          <button onClick={() => void handleBook()} disabled={saving || !client || !selSub} style={{ flex: 1, height: 40, background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: (saving || !client || !selSub) ? 'not-allowed' : 'pointer', opacity: (saving || !client || !selSub) ? 0.5 : 1 }}>
            {saving ? 'Бронирование...' : 'Подтвердить бронь'}
          </button>
          <button onClick={onClose} style={{ height: 40, padding: '0 21px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>Отмена</button>
        </div>
      </div>
    </ModalWrap>
  )
}

// ─── BookingInfoModal ─────────────────────────────────────────────────────────

interface BookingInfoModalProps { slot: ScheduleSlot; device: Device; userRole: Role; onClose: () => void; onCancelled: () => void; onReschedule?: (info: BookingInfo) => void }

function BookingInfoModal({ slot, device, userRole, onClose, onCancelled, onReschedule }: BookingInfoModalProps) {
  const [info,       setInfo]       = useState<BookingInfo | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [marking,    setMarking]    = useState(false)
  const [attended,   setAttended]   = useState<boolean | null>(null)
  const [error,      setError]      = useState<string | null>(null)
  const devColor = DEVICE_TYPE_COLORS[device.type] ?? '#02BDB6'

  useEffect(() => {
    if (!slot.booking_id) { setLoading(false); return }
    bookingsV2Api.getById(slot.booking_id)
      .then(d => { setInfo(d); setAttended(d.booking.attended) })
      .catch(() => setError('Не удалось загрузить данные брони'))
      .finally(() => setLoading(false))
  }, [slot.booking_id])

  const handleMarkAttended = async (val: boolean | null) => {
    if (!info) return
    setMarking(true)
    try {
      const updated = await bookingsV2Api.markAttended(info.booking.id, val)
      setAttended(updated.attended)
    } catch { /* ignore */ } finally { setMarking(false) }
  }

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
    <ModalWrap onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 21, paddingBottom: 21, borderBottom: '1px solid var(--glass-border)' }}>
        <div style={{ width: 44, height: 44, borderRadius: 13, background: devColor + '18', border: `1px solid ${devColor}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Calendar size={20} color={devColor} />
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Информация о брони</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            {DEVICE_TYPE_LABELS[device.type]} #{device.number} · {ft(slot.time_start)} — {ft(slot.time_end)}
          </div>
        </div>
        <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
      </div>

      {loading ? (
        <div style={{ padding: '34px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>Загрузка...</div>
      ) : !info ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: 12, color: '#ef4444' }}>
          <AlertCircle size={13} />{error ?? 'Данные о брони не найдены'}
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 21 }}>
            <div style={{ padding: 13, background: 'var(--bg-surface)', borderRadius: 13, gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>Клиент</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{info.client.full_name}</div>
              {info.client.phone && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>{info.client.phone}</div>}
            </div>
            <div style={{ padding: 13, background: 'var(--bg-surface)', borderRadius: 13 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>Абонемент</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{info.subscription.name}</div>
            </div>
            {([info.slot_1, info.slot_2] as Array<typeof info.slot_1 | null>).map((s, i) => {
              if (!s) return null
              const dev = s.devices
              const dColor = dev ? (DEVICE_TYPE_COLORS[dev.type] ?? '#71717A') : '#71717A'
              return (
                <div key={i} style={{ padding: 13, background: 'var(--bg-surface)', borderRadius: 13, border: `1px solid ${dColor}22` }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Слот {i + 1}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: dColor }}>{dev ? `${DEVICE_TYPE_LABELS[dev.type]} #${dev.number}` : '—'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{ft(s.time_start)} — {ft(s.time_end)}</div>
                </div>
              )
            })}
          </div>

          {/* Attendance */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 13, padding: '10px 13px', background: 'var(--bg-surface)', borderRadius: 10, border: '1px solid var(--glass-border)' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1 }}>Посещение:</span>
            <button onClick={() => void handleMarkAttended(true)} disabled={marking}
              style={{ display: 'flex', alignItems: 'center', gap: 4, height: 30, padding: '0 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: attended === true ? 'rgba(16,185,129,0.15)' : 'transparent', border: `1px solid ${attended === true ? '#10b981' : 'var(--glass-border)'}`, color: attended === true ? '#10b981' : 'var(--text-muted)' }}>
              ✓ Был
            </button>
            <button onClick={() => void handleMarkAttended(false)} disabled={marking}
              style={{ display: 'flex', alignItems: 'center', gap: 4, height: 30, padding: '0 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: attended === false ? 'rgba(239,68,68,0.12)' : 'transparent', border: `1px solid ${attended === false ? '#ef4444' : 'var(--glass-border)'}`, color: attended === false ? '#ef4444' : 'var(--text-muted)' }}>
              ✗ Не был
            </button>
            {attended !== null && (
              <button onClick={() => void handleMarkAttended(null)} disabled={marking}
                style={{ height: 30, padding: '0 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer', background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>
                Сброс
              </button>
            )}
          </div>

          {error && <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 13, fontSize: 12, color: '#ef4444' }}><AlertCircle size={13} />{error}</div>}
          {cancelHint && <div style={{ padding: '8px 13px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, marginBottom: 13, fontSize: 12, color: '#f59e0b' }}>{cancelHint}</div>}

          <div style={{ display: 'flex', gap: 8, paddingTop: 21, borderTop: '1px solid var(--glass-border)', flexWrap: 'wrap' }}>
            {onReschedule && info && (
              <button onClick={() => { onReschedule(info); onClose() }}
                style={{ flex: 1, minWidth: 120, height: 40, background: 'rgba(38,60,217,0.10)', border: '1px solid rgba(38,60,217,0.3)', borderRadius: 8, color: '#263CD9', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <RefreshCw size={13} />Перенести
              </button>
            )}
            <button onClick={() => void handleCancel()} disabled={!canCancel || cancelling} style={{ flex: 1, minWidth: 120, height: 40, background: canCancel ? 'rgba(239,68,68,0.12)' : 'var(--bg-surface)', border: `1px solid ${canCancel ? 'rgba(239,68,68,0.35)' : 'var(--glass-border)'}`, borderRadius: 8, color: canCancel ? '#ef4444' : 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: (!canCancel || cancelling) ? 'not-allowed' : 'pointer', opacity: cancelling ? 0.6 : 1 }}>
              {cancelling ? 'Снятие...' : 'Снять бронь'}
            </button>
            <button onClick={onClose} style={{ height: 40, padding: '0 21px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>Закрыть</button>
          </div>
        </>
      )}
    </ModalWrap>
  )
}

// ─── DeleteConfirmModal ───────────────────────────────────────────────────────

interface DeleteConfirmModalProps { slot: ScheduleSlot; device: Device; loading: boolean; onClose: () => void; onConfirm: () => void }

function DeleteConfirmModal({ slot, device, loading, onClose, onConfirm }: DeleteConfirmModalProps) {
  const devColor = DEVICE_TYPE_COLORS[device.type] ?? '#02BDB6'
  return (
    <ModalWrap onClose={onClose} maxWidth={380}>
      <ModalHeader title="Удалить ячейку?" onClose={onClose} />
      <div style={{ padding: 13, background: 'var(--bg-surface)', borderRadius: 13, marginBottom: 21, border: `1px solid ${devColor}33` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: devColor }}>{DEVICE_TYPE_LABELS[device.type]} #{device.number}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{ft(slot.time_start)} — {ft(slot.time_end)}</div>
      </div>
      <div style={{ display: 'flex', gap: 13 }}>
        <button onClick={onConfirm} disabled={loading} style={{ flex: 1, height: 40, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 8, color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Удаление...' : 'Удалить'}
        </button>
        <button onClick={onClose} style={{ height: 40, padding: '0 21px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>Отмена</button>
      </div>
    </ModalWrap>
  )
}

// ─── QuickCreateModal ─────────────────────────────────────────────────────────

type RepeatMode = 'every_day' | 'weekdays' | 'every_n'

interface QuickCreateModalProps {
  devices: Device[]
  onClose: () => void
  onCreated: (count: number) => void
}

function QuickCreateModal({ devices, onClose, onCreated }: QuickCreateModalProps) {
  const [deviceId,    setDeviceId]    = useState(devices[0]?.id ?? '')
  const [dateStart,   setDateStart]   = useState(() => toISO(new Date()))
  const [dateEnd,     setDateEnd]     = useState(() => toISO(new Date()))
  const [timeStart,   setTimeStart]   = useState('09:00')
  const [timeEnd,     setTimeEnd]     = useState('09:30')
  const [repeat,      setRepeat]      = useState<RepeatMode>('every_day')
  const [everyN,      setEveryN]      = useState(2)
  const [slotStatus,  setSlotStatus]  = useState<'free' | 'blocked'>('free')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const generateDates = (): string[] => {
    const dates: string[] = []
    const start = new Date(dateStart + 'T00:00:00')
    const end   = new Date(dateEnd   + 'T00:00:00')
    let cur = new Date(start)
    let nIdx = 0
    while (cur <= end) {
      const dow = cur.getDay()
      if (repeat === 'every_day') {
        dates.push(toISO(cur))
      } else if (repeat === 'weekdays') {
        if (dow >= 1 && dow <= 5) dates.push(toISO(cur))
      } else if (repeat === 'every_n') {
        if (nIdx % everyN === 0) dates.push(toISO(cur))
        nIdx++
      }
      cur = new Date(cur.getTime() + 86400000)
    }
    return dates
  }

  const handleCreate = async () => {
    if (!deviceId) { setError('Выберите тренажёр'); return }
    if (timeStart >= timeEnd) { setError('Время начала должно быть меньше времени конца'); return }
    if (dateStart > dateEnd) { setError('Дата начала должна быть меньше или равна дате конца'); return }

    setSaving(true); setError(null)
    try {
      const dates = generateDates()
      if (dates.length === 0) { setError('Нет дат для создания'); setSaving(false); return }
      const slots = dates.map(date => ({ device_id: deviceId, date, time_start: timeStart, time_end: timeEnd, status: slotStatus }))
      const result = await scheduleSlotsApi.bulkCreate(slots)
      onCreated((result as unknown as { created: number }).created ?? slots.length)
    } catch {
      setError('Не удалось создать ячейки')
    } finally {
      setSaving(false)
    }
  }

  const selectedDevice = devices.find(d => d.id === deviceId)
  const devColor = selectedDevice ? (DEVICE_TYPE_COLORS[selectedDevice.type] ?? '#02BDB6') : '#02BDB6'
  const previewCount = generateDates().length

  return (
    <ModalWrap onClose={onClose} maxWidth={500}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 21, paddingBottom: 21, borderBottom: '1px solid var(--glass-border)' }}>
        <div style={{ width: 44, height: 44, borderRadius: 13, background: 'rgba(2,189,182,0.12)', border: '1px solid rgba(2,189,182,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={20} color="#02BDB6" />
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Быстрое создание</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Массовое расписание по диапазону дат</div>
        </div>
        <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
      </div>

      {error && <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 21, fontSize: 12, color: '#ef4444' }}><AlertCircle size={13} />{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Тренажёр</div>
          <select style={selectStyle} value={deviceId} onChange={e => setDeviceId(e.target.value)}>
            {devices.map(d => (
              <option key={d.id} value={d.id}>{DEVICE_TYPE_LABELS[d.type]} #{d.number} (Гр. {d.device_group})</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Дата начала</div>
            <input type="date" style={inputStyle} value={dateStart} onChange={e => setDateStart(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Дата конца</div>
            <input type="date" style={inputStyle} value={dateEnd} onChange={e => setDateEnd(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Время начала</div>
            <input type="time" style={inputStyle} value={timeStart} onChange={e => setTimeStart(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Время конца</div>
            <input type="time" style={inputStyle} value={timeEnd} onChange={e => setTimeEnd(e.target.value)} />
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Повторение</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {([
              { value: 'every_day', label: 'Каждый день' },
              { value: 'weekdays',  label: 'Будние' },
              { value: 'every_n',   label: `Каждые N` },
            ] as { value: RepeatMode; label: string }[]).map(opt => (
              <button key={opt.value} onClick={() => setRepeat(opt.value)}
                style={{ flex: 1, height: 34, background: repeat === opt.value ? 'rgba(2,189,182,0.12)' : 'transparent', border: `1px solid ${repeat === opt.value ? '#02BDB6' : 'var(--glass-border)'}`, borderRadius: 8, color: repeat === opt.value ? '#02BDB6' : 'var(--text-secondary)', fontSize: 12, fontWeight: repeat === opt.value ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>
                {opt.label}
              </button>
            ))}
          </div>
          {repeat === 'every_n' && (
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Каждые</span>
              <input type="number" min={2} max={30} style={{ ...inputStyle, width: 60 }} value={everyN} onChange={e => setEveryN(Math.max(2, Number(e.target.value)))} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>дней</span>
            </div>
          )}
        </div>

        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Тип ячеек</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setSlotStatus('free')}
              style={{ flex: 1, height: 34, background: slotStatus === 'free' ? 'rgba(16,185,129,0.12)' : 'transparent', border: `1px solid ${slotStatus === 'free' ? '#10b981' : 'var(--glass-border)'}`, borderRadius: 8, color: slotStatus === 'free' ? '#10b981' : 'var(--text-secondary)', fontSize: 12, fontWeight: slotStatus === 'free' ? 600 : 400, cursor: 'pointer' }}>
              Свободные
            </button>
            <button onClick={() => setSlotStatus('blocked')}
              style={{ flex: 1, height: 34, background: slotStatus === 'blocked' ? 'rgba(245,158,11,0.12)' : 'transparent', border: `1px solid ${slotStatus === 'blocked' ? '#f59e0b' : 'var(--glass-border)'}`, borderRadius: 8, color: slotStatus === 'blocked' ? '#f59e0b' : 'var(--text-secondary)', fontSize: 12, fontWeight: slotStatus === 'blocked' ? 600 : 400, cursor: 'pointer' }}>
              Заблокированные
            </button>
          </div>
        </div>

        {previewCount > 0 && (
          <div style={{ padding: '10px 13px', background: `${devColor}08`, border: `1px solid ${devColor}22`, borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
            Будет создано <strong style={{ color: devColor }}>{previewCount}</strong> {slotStatus === 'blocked' ? 'заблокированных' : ''} ячеек
            {selectedDevice && ` для ${DEVICE_TYPE_LABELS[selectedDevice.type]} #${selectedDevice.number}`}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 13, marginTop: 21, paddingTop: 21, borderTop: '1px solid var(--glass-border)' }}>
        <button onClick={() => void handleCreate()} disabled={saving || previewCount === 0}
          style={{ flex: 1, height: 40, background: slotStatus === 'blocked' ? '#f59e0b' : '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: (saving || previewCount === 0) ? 'not-allowed' : 'pointer', opacity: (saving || previewCount === 0) ? 0.5 : 1 }}>
          {saving ? 'Создание...' : `Создать ${previewCount} ячеек`}
        </button>
        <button onClick={onClose} style={{ height: 40, padding: '0 21px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>Отмена</button>
      </div>
    </ModalWrap>
  )
}

// ─── RescheduleModal ──────────────────────────────────────────────────────────

interface RescheduleModalProps {
  bookingInfo: BookingInfo
  userRole: string
  onClose: () => void
  onRescheduled: () => void
}

function RescheduleModal({ bookingInfo, userRole, onClose, onRescheduled }: RescheduleModalProps) {
  const [date,        setDate]        = useState(() => toISO(new Date()))
  const [freeSlots,   setFreeSlots]   = useState<ScheduleSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedId,  setSelectedId]  = useState<string | null>(null)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const slot1DeviceType = bookingInfo.slot_1.devices?.type ?? null
  const origDate = bookingInfo.slot_1.date
  const hoursLeft = (new Date(`${origDate}T${bookingInfo.slot_1.time_start}`).getTime() - Date.now()) / (1000 * 60 * 60)
  const isWithin24h = hoursLeft < 24
  const canReschedule = !isWithin24h || ['developer', 'owner', 'franchisee'].includes(userRole)

  useEffect(() => {
    setSelectedId(null)
    setLoadingSlots(true)
    scheduleSlotsApi.getByDate(date)
      .then(slots => {
        const free = slots.filter(s =>
          s.status === 'free' &&
          (!slot1DeviceType || s.devices?.type === slot1DeviceType)
        )
        setFreeSlots(free)
      })
      .catch(() => { /* ignore */ })
      .finally(() => setLoadingSlots(false))
  }, [date, slot1DeviceType])

  const handleReschedule = async () => {
    if (!selectedId) return
    setSaving(true); setError(null)
    try {
      await bookingsV2Api.reschedule(bookingInfo.booking.id, { new_slot_1_id: selectedId })
      onRescheduled()
    } catch (e: unknown) {
      const resp = (e as { response?: { data?: { error?: string; code?: string } } })?.response?.data
      if (resp?.code === 'NO_SLOT2') setError('Нет свободного слота 2 сразу после выбранного')
      else if (resp?.code === 'TOO_LATE') setError('Менее 24 ч до сеанса — перенос запрещён для вашей роли')
      else setError(resp?.error ?? 'Ошибка переноса брони')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalWrap onClose={onClose} maxWidth={460}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 21, paddingBottom: 21, borderBottom: '1px solid var(--glass-border)' }}>
        <div style={{ width: 44, height: 44, borderRadius: 13, background: 'rgba(38,60,217,0.12)', border: '1px solid rgba(38,60,217,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RefreshCw size={20} color="#263CD9" />
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Перенести бронь</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{bookingInfo.client.full_name}</div>
        </div>
        <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
      </div>

      {isWithin24h && (
        <div style={{ padding: '8px 13px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, marginBottom: 13, fontSize: 12, color: '#f59e0b' }}>
          ⚠ До сеанса менее 24 ч. {canReschedule ? 'Перенос разрешён для вашей роли.' : 'Перенос запрещён для вашей роли.'}
        </div>
      )}

      {error && <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 13, fontSize: 12, color: '#ef4444' }}><AlertCircle size={13} />{error}</div>}

      <div style={{ marginBottom: 13 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Новая дата</div>
        <input type="date" style={inputStyle} value={date} onChange={e => setDate(e.target.value)} />
      </div>

      <div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
          Свободные ячейки{slot1DeviceType ? ` (${DEVICE_TYPE_LABELS[slot1DeviceType]})` : ''}
        </div>
        {loadingSlots ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '13px 0' }}>Загрузка...</div>
        ) : freeSlots.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '13px 0' }}>Нет свободных ячеек на выбранную дату</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
            {freeSlots.map(s => {
              const dev = s.devices
              const dColor = dev ? (DEVICE_TYPE_COLORS[dev.type] ?? '#02BDB6') : '#02BDB6'
              return (
                <button key={s.id} onClick={() => setSelectedId(s.id)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 13px', background: selectedId === s.id ? `${dColor}12` : 'var(--bg-surface)', border: `1px solid ${selectedId === s.id ? dColor : 'var(--glass-border)'}`, borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: selectedId === s.id ? dColor : 'var(--text-primary)' }}>
                      {ft(s.time_start)} — {ft(s.time_end)}
                    </div>
                    {dev && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{DEVICE_TYPE_LABELS[dev.type]} #{dev.number}</div>}
                  </div>
                  {selectedId === s.id && <div style={{ width: 8, height: 8, borderRadius: '50%', background: dColor }} />}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 13, marginTop: 21, paddingTop: 21, borderTop: '1px solid var(--glass-border)' }}>
        <button
          onClick={() => void handleReschedule()}
          disabled={!canReschedule || !selectedId || saving}
          style={{ flex: 1, height: 40, background: canReschedule && selectedId ? '#263CD9' : 'var(--bg-surface)', border: `1px solid ${canReschedule && selectedId ? '#263CD9' : 'var(--glass-border)'}`, borderRadius: 8, color: canReschedule && selectedId ? '#fff' : 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: (!canReschedule || !selectedId || saving) ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Перенос...' : 'Перенести'}
        </button>
        <button onClick={onClose} style={{ height: 40, padding: '0 21px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>Отмена</button>
      </div>
    </ModalWrap>
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
  const [ctxMenu,           setCtxMenu]          = useState<{ x: number; y: number; device: Device; time: string; slot: ScheduleSlot | null } | null>(null)
  const [notification,      setNotification]     = useState<string | null>(null)
  const [dragSelection,     setDragSelection]    = useState<Set<string>>(new Set())
  const [showBulkModal,     setShowBulkModal]    = useState(false)
  const [showQuickCreate,   setShowQuickCreate]  = useState(false)
  const [rescheduleTarget,  setRescheduleTarget] = useState<BookingInfo | null>(null)
  const [timeLeft,          setTimeLeft]         = useState<number | null>(currentTimeLeft)
  const notifTimer  = useRef<ReturnType<typeof setTimeout> | undefined>()
  const isDragging  = useRef(false)
  const dragMoved   = useRef(false)
  const isToday     = date === toISO(new Date())

  const canManageSlots = user?.role === 'developer' || user?.role === 'owner' || user?.role === 'franchisee'

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(currentTimeLeft()), 60_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => () => clearTimeout(notifTimer.current), [])

  useEffect(() => {
    const handleMouseUp = () => {
      if (!isDragging.current) return
      isDragging.current = false
      setDragSelection(prev => {
        if (dragMoved.current && prev.size > 1) {
          setShowBulkModal(true)
        }
        dragMoved.current = false
        return prev
      })
    }
    document.addEventListener('mouseup', handleMouseUp)
    return () => document.removeEventListener('mouseup', handleMouseUp)
  }, [])

  const slotMap = useMemo(() => {
    const m = new Map<string, ScheduleSlot>()
    for (const s of slots) m.set(cellKey(s.device_id, ft(s.time_start)), s)
    return m
  }, [slots])

  const loadData = useCallback(async (d: string) => {
    setLoading(true); setError(null)
    try {
      const [devs, slotList] = await Promise.all([devicesApi.getAll(), scheduleSlotsApi.getByDate(d)])
      console.log('[SchedulePage] devices:', devs)
      console.log('[SchedulePage] slots:', slotList)
      setDevices(devs.filter(dev => dev.status !== 'disabled'))
      setSlots(slotList)
    } catch (err) {
      console.error('[SchedulePage] load error:', err)
      setError('Не удалось загрузить расписание')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadData(date) }, [date, loadData])

  const showNotification = (msg: string) => {
    setNotification(msg); clearTimeout(notifTimer.current)
    notifTimer.current = setTimeout(() => setNotification(null), 3000)
  }

  const prevDay = () => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(toISO(d)) }
  const nextDay = () => { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(toISO(d)) }

  const handleCellClick = (device: Device, time: string) => {
    if (dragMoved.current) return  // was a drag, not a click
    const existing = slotMap.get(cellKey(device.id, time))
    if (existing) {
      if (existing.status === 'free') setBookTarget({ slot: existing, device })
      else if (existing.status === 'booked') setBookingInfoTarget({ slot: existing, device })
    } else if (canManageSlots) {
      setCreateTarget({ device, timeStart: time, date })
    }
  }

  const handleCellMouseDown = (device: Device, time: string) => {
    const existing = slotMap.get(cellKey(device.id, time))
    if (existing || !canManageSlots) return  // only drag on empty cells
    isDragging.current = true
    dragMoved.current = false
    const key = cellKey(device.id, time)
    setDragSelection(new Set([key]))
  }

  const handleCellMouseEnter = (device: Device, time: string) => {
    if (!isDragging.current || !canManageSlots) return
    const existing = slotMap.get(cellKey(device.id, time))
    if (existing) return
    dragMoved.current = true
    const key = cellKey(device.id, time)
    setDragSelection(prev => new Set([...prev, key]))
  }

  const handleTrashClick = (slot: ScheduleSlot, device: Device) => {
    if (slot.status === 'booked') { showNotification('Сначала снимите бронь, чтобы удалить ячейку'); return }
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

  const handleBlockSlot = async (slot: ScheduleSlot) => {
    const newStatus = slot.status === 'blocked' ? 'free' : 'blocked'
    try {
      const updated = await scheduleSlotsApi.patch(slot.id, { status: newStatus })
      setSlots(prev => prev.map(s => s.id === slot.id ? { ...s, status: updated.status } : s))
    } catch {
      showNotification('Не удалось изменить статус ячейки')
    }
  }

  const handleCreated = (slot: ScheduleSlot) => { setSlots(prev => [...prev, slot]); setCreateTarget(null) }
  const handleBooked  = () => { setBookTarget(null); void loadData(date) }
  const handleCancelled = () => { setBookingInfoTarget(null); void loadData(date) }
  const handleBulkCreated = (count: number) => {
    setShowBulkModal(false)
    setDragSelection(new Set())
    showNotification(`Создано ${count} ячеек`)
    void loadData(date)
  }

  const dateLabel = new Date(date).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })
  const gridMinWidth = DEVICE_WIDTH + TIME_SLOTS.length * SLOT_WIDTH

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 21, gap: 13 }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text-primary)', margin: 0, marginBottom: 4 }}>Расписание</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, textTransform: 'capitalize' }}>{dateLabel}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {canManageSlots && (
            <button
              onClick={() => setShowQuickCreate(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 13px', background: 'rgba(2,189,182,0.12)', border: '1px solid rgba(2,189,182,0.3)', borderRadius: 8, color: '#02BDB6', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              <Zap size={14} strokeWidth={2} />Быстрое создание
            </button>
          )}
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ height: 36, padding: '0 13px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer', outline: 'none' }} />
        </div>
      </div>

      {/* Date navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 13, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 13, padding: '8px 13px', backdropFilter: 'blur(12px)' }}>
        <button onClick={prevDay} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}><ChevronLeft size={14} /></button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{formatDate(new Date(date))}</span>
        <button onClick={nextDay} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}><ChevronRight size={14} /></button>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 13, marginBottom: 13, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_LABELS).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: STATUS_COLORS[k].bg, border: `1px solid ${STATUS_COLORS[k].border}` }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v}</span>
          </div>
        ))}
        {canManageSlots && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(38,60,217,0.15)', border: '1px solid rgba(38,60,217,0.4)' }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Зажмите и тяните — массовое создание</span>
          </div>
        )}
      </div>

      {/* Notifications */}
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
        <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 55, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>Загрузка...</div>
      ) : !error && devices.length === 0 ? (
        <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 55, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <Calendar size={28} strokeWidth={1.5} color="var(--text-muted)" style={{ marginBottom: 13 }} />
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>Нет активных тренажёров</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>Добавьте оборудование в Настройках</div>
        </div>
      ) : !error ? (
        <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', borderRadius: 21, overflow: 'hidden', userSelect: 'none' }}>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: gridMinWidth, position: 'relative' }}>

              {/* Current time line */}
              {isToday && timeLeft !== null && (
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: timeLeft, width: 2, background: '#02BDB6', zIndex: 10, pointerEvents: 'none', opacity: 0.8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#02BDB6', position: 'absolute', top: 8, left: -3 }} />
                </div>
              )}

              {/* Header row */}
              <div style={{ display: 'grid', gridTemplateColumns: `${DEVICE_WIDTH}px repeat(${TIME_SLOTS.length}, ${SLOT_WIDTH}px)`, borderBottom: '1px solid var(--glass-border)', position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 5 }}>
                <div style={{ padding: '10px 13px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Тренажёр</div>
                {TIME_SLOTS.map((t, idx) => {
                  const isHour = t.endsWith(':00')
                  return (
                    <div key={t} style={{ padding: '10px 0', textAlign: 'center', fontSize: 10, fontWeight: isHour ? 700 : 400, color: isHour ? 'var(--text-secondary)' : 'var(--text-muted)', borderLeft: '1px solid var(--glass-border)', opacity: idx === 0 ? 1 : 1 }}>
                      {isHour ? t : <span style={{ opacity: 0.5 }}>{t}</span>}
                    </div>
                  )
                })}
              </div>

              {/* Device rows */}
              {devices.map(device => {
                const devColor = DEVICE_TYPE_COLORS[device.type] ?? '#71717A'
                return (
                  <div key={device.id} style={{ display: 'grid', gridTemplateColumns: `${DEVICE_WIDTH}px repeat(${TIME_SLOTS.length}, ${SLOT_WIDTH}px)`, borderBottom: '1px solid var(--glass-border)' }}>
                    <div style={{ padding: '10px 13px', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRight: '1px solid var(--glass-border)', background: 'var(--bg-surface)' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: devColor }}>{DEVICE_TYPE_LABELS[device.type]}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>#{device.number} · Гр. {device.device_group}</div>
                    </div>

                    {TIME_SLOTS.map(time => {
                      const ck      = cellKey(device.id, time)
                      const slot    = slotMap.get(ck)
                      const sc      = slot ? STATUS_COLORS[slotColorKey(slot)] : null
                      const isHov   = hoveredCell === ck
                      const isSelec = dragSelection.has(ck)

                      return (
                        <div
                          key={time}
                          className={isSelec ? 'cell-selected' : undefined}
                          onClick={() => handleCellClick(device, time)}
                          onContextMenu={e => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, device, time, slot: slot ?? null }) }}
                          onMouseDown={() => handleCellMouseDown(device, time)}
                          onMouseEnter={e => {
                            handleCellMouseEnter(device, time)
                            setHoveredCell(ck)
                            if (!slot && !isSelec) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'
                          }}
                          onMouseLeave={e => {
                            setHoveredCell(null)
                            if (!slot && !isSelec) (e.currentTarget as HTMLDivElement).style.background = 'transparent'
                          }}
                          title={slot
                            ? slot.status === 'booked'
                              ? `Занято: ${ft(slot.time_start)}–${ft(slot.time_end)}`
                              : `${STATUS_LABELS[slot.status]}: ${ft(slot.time_start)}–${ft(slot.time_end)}`
                            : canManageSlots ? `Создать ячейку ${time}` : time}
                          style={{
                            height: CELL_HEIGHT,
                            borderLeft: '1px solid var(--glass-border)',
                            cursor: slot ? (['free', 'booked'].includes(slot.status) ? 'pointer' : 'default') : canManageSlots ? 'crosshair' : 'default',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.12s',
                            background: sc ? sc.bg : 'transparent',
                            position: 'relative',
                          }}
                        >
                          {slot ? (
                            <>
                              <div style={{ width: 40, height: 32, borderRadius: 8, background: sc!.bg, border: `1px solid ${sc!.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                                {slot.status === 'free'        && <Plus size={12} strokeWidth={2.5} color={sc!.text} />}
                                {slot.status === 'booked'      && <div style={{ width: 7, height: 7, borderRadius: '50%', background: sc!.text }} />}
                                {slot.status === 'maintenance' && <span style={{ fontSize: 10, color: sc!.text }}>~</span>}
                                {slot.status === 'blocked'     && <span style={{ fontSize: 10, color: sc!.text }}>✕</span>}
                                <span style={{ fontSize: 9, color: sc!.text, opacity: 0.8 }}>{ft(slot.time_start)}</span>
                              </div>
                              {isHov && canManageSlots && (
                                <button
                                  onClick={e => { e.stopPropagation(); handleTrashClick(slot, device) }}
                                  style={{ position: 'absolute', top: 4, right: 4, width: 18, height: 18, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, zIndex: 2 }}
                                >
                                  <Trash2 size={9} color="#ef4444" />
                                </button>
                              )}
                            </>
                          ) : (
                            <div style={{ width: 40, height: 32, borderRadius: 8, border: '1px dashed rgba(255,255,255,0.08)', opacity: 0.5, transition: 'opacity 0.12s' }} />
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
      ) : null}

      {/* Bulk selection hint */}
      {dragSelection.size > 0 && !showBulkModal && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '10px 13px', background: 'rgba(38,60,217,0.08)', border: '1px solid rgba(38,60,217,0.25)', borderRadius: 8, marginTop: 8, fontSize: 12, color: '#263CD9' }}>
          <Layers size={13} />
          Выбрано {dragSelection.size} ячеек — отпустите мышь для создания
          <button onClick={() => setDragSelection(new Set())} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#263CD9', cursor: 'pointer', display: 'flex', opacity: 0.7 }}><X size={13} /></button>
        </div>
      )}

      {/* Modals */}
      {createTarget && <CreateSlotModal target={createTarget} onClose={() => setCreateTarget(null)} onCreate={handleCreated} />}
      {showBulkModal && <BulkCreateModal selection={dragSelection} devices={devices} date={date} onClose={() => { setShowBulkModal(false); setDragSelection(new Set()) }} onCreated={handleBulkCreated} />}
      {bookTarget && <BookingModal slot={bookTarget.slot} device={bookTarget.device} onClose={() => setBookTarget(null)} onBooked={handleBooked} />}
      {bookingInfoTarget && <BookingInfoModal slot={bookingInfoTarget.slot} device={bookingInfoTarget.device} userRole={user?.role ?? 'admin'} onClose={() => setBookingInfoTarget(null)} onCancelled={handleCancelled} onReschedule={info => setRescheduleTarget(info)} />}
      {deleteConfirm && <DeleteConfirmModal slot={deleteConfirm.slot} device={deleteConfirm.device} loading={deletingSlot} onClose={() => setDeleteConfirm(null)} onConfirm={() => void handleDeleteSlot()} />}
      {showQuickCreate && <QuickCreateModal devices={devices} onClose={() => setShowQuickCreate(false)} onCreated={count => { setShowQuickCreate(false); showNotification(`Создано ${count} ячеек`); void loadData(date) }} />}
      {rescheduleTarget && <RescheduleModal bookingInfo={rescheduleTarget} userRole={user?.role ?? 'admin'} onClose={() => setRescheduleTarget(null)} onRescheduled={() => { setRescheduleTarget(null); void loadData(date) }} />}

      {ctxMenu && (() => {
        const { x, y, device, time, slot } = ctxMenu
        const items: ContextMenuEntry[] = []
        if (!slot) {
          if (canManageSlots) {
            items.push({ label: 'Создать ячейку', icon: <Plus size={13} />, onClick: () => setCreateTarget({ device, timeStart: time, date }) })
          }
        } else if (slot.status === 'free') {
          items.push({ label: 'Забронировать', icon: <Calendar size={13} />, onClick: () => setBookTarget({ slot, device }) })
          if (canManageSlots) {
            items.push({ separator: true } as ContextMenuEntry)
            items.push({ label: 'Заблокировать', icon: <Lock size={13} />, onClick: () => void handleBlockSlot(slot) })
            items.push({ separator: true } as ContextMenuEntry)
            items.push({ label: 'Удалить ячейку', icon: <Trash2 size={13} />, onClick: () => handleTrashClick(slot, device), danger: true })
          }
        } else if (slot.status === 'booked') {
          items.push({ label: 'Открыть бронь', icon: <Eye size={13} />, onClick: () => setBookingInfoTarget({ slot, device }) })
        } else if (slot.status === 'blocked' || slot.status === 'maintenance') {
          if (canManageSlots) {
            items.push({ label: 'Разблокировать', icon: <Unlock size={13} />, onClick: () => void handleBlockSlot(slot) })
            items.push({ separator: true } as ContextMenuEntry)
            items.push({ label: 'Удалить ячейку', icon: <Trash2 size={13} />, onClick: () => handleTrashClick(slot, device), danger: true })
          }
        }
        if (items.length === 0) return null
        return <ContextMenu x={x} y={y} items={items} onClose={() => setCtxMenu(null)} />
      })()}
    </div>
  )
}
