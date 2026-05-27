import React, { useState, useEffect, useRef } from 'react'
import { CreditCard, Plus, Search, X, AlertCircle, ChevronDown } from 'lucide-react'
import { subscriptionsApi, type CreateSubscriptionPayload } from '../../api/subscriptions.api'
import { clientsApi } from '../../api/clients.api'
import type { Subscription, Client, DeviceType } from '../../types'

// ─── constants ─────────────────────────────────────────────────────────────

const DEVICE_TYPES: { value: DeviceType; label: string; color: string }[] = [
  { value: 'vacuactiv',  label: 'VacuActiv',  color: '#02BDB6' },
  { value: 'rollshape',  label: 'RollShape',  color: '#263CD9' },
  { value: 'infrastep',  label: 'InfraStep',  color: '#8b5cf6' },
  { value: 'infrashape', label: 'InfraShape', color: '#f59e0b' },
]

const STATUS_LABELS: Record<string, string>  = { active: 'Активен', frozen: 'Заморожен', expired: 'Истёк' }
const STATUS_COLORS: Record<string, string>  = { active: '#02BDB6', frozen: '#f59e0b',   expired: '#71717A' }

const DURATIONS = [15, 20, 25, 30, 45, 60]
const VALIDITY  = [{ value: 'week', label: 'Неделя (7 дней)' }, { value: 'month', label: 'Месяц (30 дней)' }, { value: 'custom', label: 'Произвольная дата' }]

// ─── helpers ───────────────────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function typeColor(t: DeviceType) {
  return DEVICE_TYPES.find(d => d.value === t)?.color ?? '#71717A'
}
function typeLabel(t: DeviceType) {
  return DEVICE_TYPES.find(d => d.value === t)?.label ?? t
}

const inputStyle: React.CSSProperties = {
  height: 36, padding: '0 13px', background: 'var(--bg-elevated)',
  border: '1px solid var(--glass-border)', borderRadius: 8,
  color: 'var(--text-primary)', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box',
}
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' }
const labelStyle: React.CSSProperties  = { fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }

// ─── ClientSearch ────────────────────────────────────────────────────────────

interface ClientSearchProps {
  value: Client | null
  onChange: (c: Client | null) => void
  placeholder?: string
}
function ClientSearch({ value, onChange, placeholder = 'Поиск клиента...' }: ClientSearchProps) {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState<Client[]>([])
  const [open, setOpen]         = useState(false)
  const timer                   = useRef<ReturnType<typeof setTimeout>>()
  const ref                     = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const search = (q: string) => {
    setQuery(q)
    clearTimeout(timer.current)
    if (!q.trim()) { setResults([]); setOpen(false); return }
    timer.current = setTimeout(async () => {
      try {
        const data = await clientsApi.getAll(q)
        setResults(data.slice(0, 8))
        setOpen(true)
      } catch { /* ignore */ }
    }, 300)
  }

  const select = (c: Client) => { onChange(c); setQuery(''); setOpen(false) }
  const clear  = () => { onChange(null); setQuery('') }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {value ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 36, padding: '0 13px', background: 'var(--bg-elevated)', border: '1px solid #02BDB6', borderRadius: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{value.fullName}</span>
          <button onClick={clear} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 0 }}><X size={13} /></button>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <Search size={13} strokeWidth={1.75} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input style={{ ...inputStyle, paddingLeft: 30 }} placeholder={placeholder} value={query} onChange={e => search(e.target.value)} onFocus={() => query && setOpen(true)} />
        </div>
      )}
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 8, overflow: 'hidden', marginTop: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
          {results.map(c => (
            <button key={c.id} onClick={() => select(c)} style={{ display: 'block', width: '100%', padding: '9px 13px', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontSize: 13 }}>
              {c.fullName}
              {c.phone && <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 8 }}>{c.phone}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── SlotForm ────────────────────────────────────────────────────────────────

interface SlotFormData { type: DeviceType; duration: number; sessions: number }
interface SlotFormProps {
  label: string; value: SlotFormData
  onChange: (v: SlotFormData) => void
}
function SlotForm({ label, value, onChange }: SlotFormProps) {
  return (
    <div style={{ padding: 13, background: 'var(--bg-elevated)', borderRadius: 13, border: '1px solid var(--glass-border)' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 13 }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <div>
          <label style={labelStyle}>Тип тренажёра</label>
          <select style={selectStyle} value={value.type} onChange={e => onChange({ ...value, type: e.target.value as DeviceType })}>
            {DEVICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Длительность (мин)</label>
          <select style={selectStyle} value={value.duration} onChange={e => onChange({ ...value, duration: Number(e.target.value) })}>
            {DURATIONS.map(d => <option key={d} value={d}>{d} мин</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Количество сеансов</label>
          <input type="number" min={1} max={100} style={inputStyle} value={value.sessions} onChange={e => onChange({ ...value, sessions: Math.max(1, Number(e.target.value)) })} />
        </div>
      </div>
    </div>
  )
}

// ─── CreateModal ─────────────────────────────────────────────────────────────

interface CreateModalProps { onClose: () => void; onCreate: (sub: Subscription) => void }
function CreateModal({ onClose, onCreate }: CreateModalProps) {
  const today = new Date().toISOString().slice(0, 10)

  const [client,      setClient]      = useState<Client | null>(null)
  const [name,        setName]        = useState('')
  const [validity,    setValidity]    = useState<'week' | 'month' | 'custom'>('month')
  const [dateStart,   setDateStart]   = useState(today)
  const [customEnd,   setCustomEnd]   = useState('')
  const [price,       setPrice]       = useState('')
  const [hasSlot2,    setHasSlot2]    = useState(false)
  const [slot1,       setSlot1]       = useState<{ type: DeviceType; duration: number; sessions: number }>({ type: 'vacuactiv', duration: 30, sessions: 8 })
  const [slot2,       setSlot2]       = useState<{ type: DeviceType; duration: number; sessions: number }>({ type: 'rollshape', duration: 20, sessions: 8 })
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const getDateEnd = (): string | null => {
    if (validity === 'week')   return addDays(dateStart, 7)
    if (validity === 'month')  return addDays(dateStart, 30)
    if (validity === 'custom') return customEnd || null
    return null
  }

  const handleSubmit = async () => {
    if (!client)      { setError('Выберите клиента'); return }
    if (!name.trim()) { setError('Введите название абонемента'); return }

    setSaving(true); setError(null)
    try {
      const payload: CreateSubscriptionPayload = {
        client_id:            client.id,
        name:                 name.trim(),
        slot_1_type:          slot1.type,
        slot_1_duration_min:  slot1.duration,
        slot_1_sessions_total:slot1.sessions,
        date_start:           dateStart,
        date_end:             getDateEnd(),
        price:                price ? Number(price) : null,
      }
      if (hasSlot2) {
        payload.slot_2_type           = slot2.type
        payload.slot_2_duration_min   = slot2.duration
        payload.slot_2_sessions_total = slot2.sessions
      }
      const sub = await subscriptionsApi.create(payload)
      onCreate(sub)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Ошибка при создании абонемента')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 21 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 21 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Новый абонемент</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}><X size={18} /></button>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 13, fontSize: 12, color: '#ef4444' }}>
            <AlertCircle size={13} />{error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div>
            <label style={labelStyle}>Клиент</label>
            <ClientSearch value={client} onChange={setClient} />
          </div>

          <div>
            <label style={labelStyle}>Название абонемента</label>
            <input style={inputStyle} placeholder="Например: Базовый 8 сеансов" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={labelStyle}>Дата начала</label>
              <input type="date" style={inputStyle} value={dateStart} onChange={e => setDateStart(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Срок действия</label>
              <select style={selectStyle} value={validity} onChange={e => setValidity(e.target.value as 'week' | 'month' | 'custom')}>
                {VALIDITY.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>
          </div>

          {validity === 'custom' && (
            <div>
              <label style={labelStyle}>Дата окончания</label>
              <input type="date" style={inputStyle} value={customEnd} onChange={e => setCustomEnd(e.target.value)} min={dateStart} />
            </div>
          )}

          <SlotForm label="Слот 1 — основной тренажёр" value={slot1} onChange={setSlot1} />

          <button
            onClick={() => setHasSlot2(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 13px', background: hasSlot2 ? 'rgba(2,189,182,0.08)' : 'transparent', border: `1px solid ${hasSlot2 ? 'rgba(2,189,182,0.3)' : 'var(--glass-border)'}`, borderRadius: 8, color: hasSlot2 ? '#02BDB6' : 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
          >
            <ChevronDown size={14} strokeWidth={2} style={{ transform: hasSlot2 ? 'rotate(180deg)' : 'none', transition: '0.15s' }} />
            {hasSlot2 ? 'Убрать Слот 2' : '+ Добавить Слот 2 (финишный тренажёр)'}
          </button>

          {hasSlot2 && <SlotForm label="Слот 2 — финишный тренажёр" value={slot2} onChange={setSlot2} />}

          <div>
            <label style={labelStyle}>Цена (₸)</label>
            <input type="number" min={0} style={inputStyle} placeholder="0" value={price} onChange={e => setPrice(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={() => void handleSubmit()} disabled={saving} style={{ flex: 1, height: 40, background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Создание...' : 'Создать абонемент'}
            </button>
            <button onClick={onClose} style={{ height: 40, padding: '0 21px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── SubscriptionCard ─────────────────────────────────────────────────────────

function SubscriptionCard({ sub }: { sub: Subscription }) {
  const pct1 = sub.slot_1_sessions_total > 0 ? (sub.slot_1_sessions_left / sub.slot_1_sessions_total) * 100 : 0
  const pct2 = sub.slot_2_sessions_total && sub.slot_2_sessions_total > 0 && sub.slot_2_sessions_left !== null
    ? (sub.slot_2_sessions_left / sub.slot_2_sessions_total) * 100 : 0

  return (
    <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', borderRadius: 13, padding: 21 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 13 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>{sub.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {sub.clients?.full_name ?? '—'}
            {sub.clients?.phone && <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{sub.clients.phone}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: `${STATUS_COLORS[sub.status]}12`, border: `1px solid ${STATUS_COLORS[sub.status]}33`, color: STATUS_COLORS[sub.status] }}>
            {STATUS_LABELS[sub.status]}
          </span>
          {sub.price !== null && (
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {new Intl.NumberFormat('ru-KZ').format(sub.price)} ₸
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {/* Slot 1 */}
        <div style={{ flex: '1 1 140px', padding: '8px 13px', background: 'var(--bg-elevated)', borderRadius: 8, border: `1px solid ${typeColor(sub.slot_1_type)}33` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: typeColor(sub.slot_1_type) }}>{typeLabel(sub.slot_1_type)}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub.slot_1_duration_min} мин</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            {sub.slot_1_sessions_left} / {sub.slot_1_sessions_total}
          </div>
          <div style={{ height: 3, background: 'var(--glass-border)', borderRadius: 2 }}>
            <div style={{ height: '100%', width: `${pct1}%`, background: typeColor(sub.slot_1_type), borderRadius: 2, transition: '0.3s' }} />
          </div>
        </div>

        {/* Slot 2 */}
        {sub.slot_2_type && sub.slot_2_sessions_total !== null && (
          <div style={{ flex: '1 1 140px', padding: '8px 13px', background: 'var(--bg-elevated)', borderRadius: 8, border: `1px solid ${typeColor(sub.slot_2_type)}33` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: typeColor(sub.slot_2_type) }}>{typeLabel(sub.slot_2_type)}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub.slot_2_duration_min} мин</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
              {sub.slot_2_sessions_left ?? 0} / {sub.slot_2_sessions_total}
            </div>
            <div style={{ height: 3, background: 'var(--glass-border)', borderRadius: 2 }}>
              <div style={{ height: '100%', width: `${pct2}%`, background: typeColor(sub.slot_2_type), borderRadius: 2, transition: '0.3s' }} />
            </div>
          </div>
        )}
      </div>

      {sub.date_end && (
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
          До {new Date(sub.date_end).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      )}
    </div>
  )
}

// ─── SubscriptionsPage ────────────────────────────────────────────────────────

export default function SubscriptionsPage() {
  const [subs,       setSubs]       = useState<Subscription[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [search,     setSearch]     = useState('')
  const [filterClient, setFilterClient] = useState<Client | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const load = async (clientId?: string) => {
    setLoading(true); setError(null)
    try {
      const data = await subscriptionsApi.getAll(clientId ? { client_id: clientId } : undefined)
      setSubs(data)
    } catch {
      setError('Не удалось загрузить абонементы')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load(filterClient?.id) }, [filterClient])

  const filtered = search.trim()
    ? subs.filter(s => s.clients?.full_name?.toLowerCase().includes(search.toLowerCase()) || s.name.toLowerCase().includes(search.toLowerCase()))
    : subs

  const handleCreate = (sub: Subscription) => {
    setSubs(prev => [sub, ...prev])
    setShowCreate(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 21, gap: 13 }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text-primary)', margin: 0, marginBottom: 4 }}>Абонементы</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{subs.length} абонементов в базе</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 21px', background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', flexShrink: 0 }}
        >
          <Plus size={15} strokeWidth={2} />Новый абонемент
        </button>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 13px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 8, marginBottom: 13, backdropFilter: 'blur(12px)' }}>
        <Search size={15} strokeWidth={1.75} color="var(--text-muted)" />
        <input
          style={{ flex: 1, background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
          placeholder="Поиск по клиенту или названию..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}><X size={13} /></button>}
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 13, fontSize: 12, color: '#ef4444' }}>
          <AlertCircle size={13} />{error}
        </div>
      )}

      {loading ? (
        <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 55, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Загрузка...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 55, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 21, background: 'rgba(2,189,182,0.08)', border: '1px solid rgba(2,189,182,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 13 }}>
            <CreditCard size={24} strokeWidth={1.5} color="#02BDB6" />
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>
            {search ? 'Ничего не найдено' : 'Абонементов пока нет'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 300, lineHeight: 1.6 }}>
            {search ? 'Попробуйте изменить запрос' : 'Нажмите «Новый абонемент» чтобы создать первый'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(s => <SubscriptionCard key={s.id} sub={s} />)}
        </div>
      )}

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
    </div>
  )
}
