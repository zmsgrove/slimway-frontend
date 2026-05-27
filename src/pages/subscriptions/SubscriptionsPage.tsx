import React, { useState, useEffect } from 'react'
import { CreditCard, Plus, Search, X, AlertCircle, ChevronDown, Trash2 } from 'lucide-react'
import { subscriptionTemplatesApi } from '../../api/subscription-templates.api'
import type { SubscriptionTemplate, DeviceType } from '../../types'

// ─── constants ─────────────────────────────────────────────────────────────

const DEVICE_TYPES: { value: DeviceType; label: string; color: string }[] = [
  { value: 'vacuactiv',  label: 'VacuActiv',  color: '#02BDB6' },
  { value: 'rollshape',  label: 'RollShape',  color: '#263CD9' },
  { value: 'infrastep',  label: 'InfraStep',  color: '#8b5cf6' },
  { value: 'infrashape', label: 'InfraShape', color: '#f59e0b' },
]

const DURATIONS = [15, 20, 25, 30, 45, 60]

const VALIDITY_OPTIONS = [
  { label: 'Неделя (7 дней)',    days: 7  },
  { label: 'Месяц (30 дней)',    days: 30 },
  { label: 'Квартал (90 дней)',  days: 90 },
  { label: 'Произвольно',        days: 0  },
]

function typeColor(t: DeviceType) {
  return DEVICE_TYPES.find(d => d.value === t)?.color ?? '#71717A'
}
function typeLabel(t: DeviceType) {
  return DEVICE_TYPES.find(d => d.value === t)?.label ?? t
}

function getServerError(e: unknown): string | null {
  return (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? null
}

const inputStyle: React.CSSProperties = {
  height: 36, padding: '0 13px', background: 'var(--bg-elevated)',
  border: '1px solid var(--glass-border)', borderRadius: 8,
  color: 'var(--text-primary)', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box',
}
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' }
const labelStyle: React.CSSProperties  = { fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }

// ─── SlotForm ────────────────────────────────────────────────────────────────

interface SlotFormData { type: DeviceType; duration: number; sessions: number }
interface SlotFormProps { label: string; value: SlotFormData; onChange: (v: SlotFormData) => void }

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

interface CreateModalProps { onClose: () => void; onCreate: (tpl: SubscriptionTemplate) => void }

function CreateModal({ onClose, onCreate }: CreateModalProps) {
  const [name,         setName]         = useState('')
  const [validityDays, setValidityDays] = useState(30)
  const [customDays,   setCustomDays]   = useState(30)
  const [isCustom,     setIsCustom]     = useState(false)
  const [price,        setPrice]        = useState('')
  const [hasSlot2,     setHasSlot2]     = useState(false)
  const [slot1,        setSlot1]        = useState<SlotFormData>({ type: 'vacuactiv', duration: 30, sessions: 8 })
  const [slot2,        setSlot2]        = useState<SlotFormData>({ type: 'rollshape', duration: 20, sessions: 8 })
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  const handleValidityChange = (val: string) => {
    const days = Number(val)
    if (days === 0) {
      setIsCustom(true)
    } else {
      setIsCustom(false)
      setValidityDays(days)
    }
  }

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Введите название абонемента'); return }
    const days = isCustom ? customDays : validityDays
    if (!days || days < 1) { setError('Укажите срок действия'); return }

    setSaving(true); setError(null)
    try {
      const payload: Parameters<typeof subscriptionTemplatesApi.create>[0] = {
        name:                  name.trim(),
        slot_1_type:           slot1.type,
        slot_1_duration_min:   slot1.duration,
        slot_1_sessions_total: slot1.sessions,
        slot_2_type:           hasSlot2 ? slot2.type : null,
        slot_2_duration_min:   hasSlot2 ? slot2.duration : null,
        slot_2_sessions_total: hasSlot2 ? slot2.sessions : null,
        validity_days:         days,
        price:                 price ? Number(price) : null,
      }
      const tpl = await subscriptionTemplatesApi.create(payload)
      onCreate(tpl)
    } catch (e: unknown) {
      setError(getServerError(e) ?? 'Ошибка при создании шаблона')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 21 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 21 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Новый шаблон абонемента</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}><X size={18} /></button>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 13, fontSize: 12, color: '#ef4444' }}>
            <AlertCircle size={13} />{error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div>
            <label style={labelStyle}>Название абонемента</label>
            <input style={inputStyle} placeholder="Например: Базовый 8 сеансов" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isCustom ? '1fr 1fr' : '1fr', gap: 8 }}>
            <div>
              <label style={labelStyle}>Срок действия</label>
              <select style={selectStyle} defaultValue="30" onChange={e => handleValidityChange(e.target.value)}>
                {VALIDITY_OPTIONS.map(v => <option key={v.days} value={v.days}>{v.label}</option>)}
              </select>
            </div>
            {isCustom && (
              <div>
                <label style={labelStyle}>Дней</label>
                <input type="number" min={1} style={inputStyle} value={customDays} onChange={e => setCustomDays(Math.max(1, Number(e.target.value)))} />
              </div>
            )}
          </div>

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
              {saving ? 'Создание...' : 'Создать шаблон'}
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

// ─── TemplateCard ─────────────────────────────────────────────────────────────

function TemplateCard({ tpl, onDelete }: { tpl: SubscriptionTemplate; onDelete: (id: string) => void }) {
  return (
    <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', borderRadius: 13, padding: 21 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 13 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>{tpl.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Срок: {tpl.validity_days} дней</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {tpl.price !== null && tpl.price !== undefined && (
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {new Intl.NumberFormat('ru-KZ').format(tpl.price)} ₸
            </span>
          )}
          <button
            onClick={() => onDelete(tpl.id)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
            title="Удалить шаблон"
          >
            <Trash2 size={13} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 140px', padding: '8px 13px', background: 'var(--bg-elevated)', borderRadius: 8, border: `1px solid ${typeColor(tpl.slot_1_type)}33` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: typeColor(tpl.slot_1_type) }}>{typeLabel(tpl.slot_1_type)}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tpl.slot_1_duration_min} мин</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            {tpl.slot_1_sessions_total} сеансов
          </div>
        </div>

        {tpl.slot_2_type !== null && tpl.slot_2_sessions_total !== null && (
          <div style={{ flex: '1 1 140px', padding: '8px 13px', background: 'var(--bg-elevated)', borderRadius: 8, border: `1px solid ${typeColor(tpl.slot_2_type!)}33` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: typeColor(tpl.slot_2_type!) }}>{typeLabel(tpl.slot_2_type!)}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tpl.slot_2_duration_min} мин</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {tpl.slot_2_sessions_total} сеансов
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── SubscriptionsPage ────────────────────────────────────────────────────────

export default function SubscriptionsPage() {
  const [templates,  setTemplates]  = useState<SubscriptionTemplate[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [search,     setSearch]     = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const data = await subscriptionTemplatesApi.getAll()
      setTemplates(data)
    } catch (e: unknown) {
      setError(getServerError(e) ?? 'Не удалось загрузить шаблоны абонементов')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const filtered = search.trim()
    ? templates.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
    : templates

  const handleCreate = (tpl: SubscriptionTemplate) => {
    setTemplates(prev => [tpl, ...prev])
    setShowCreate(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить шаблон абонемента?')) return
    try {
      await subscriptionTemplatesApi.delete(id)
      setTemplates(prev => prev.filter(t => t.id !== id))
    } catch (e: unknown) {
      setError(getServerError(e) ?? 'Не удалось удалить шаблон')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 21, gap: 13 }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text-primary)', margin: 0, marginBottom: 4 }}>Абонементы</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{templates.length} шаблонов</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 21px', background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', flexShrink: 0 }}
        >
          <Plus size={15} strokeWidth={2} />Новый абонемент
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 13px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 8, marginBottom: 13, backdropFilter: 'blur(12px)' }}>
        <Search size={15} strokeWidth={1.75} color="var(--text-muted)" />
        <input
          style={{ flex: 1, background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
          placeholder="Поиск по названию..."
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
        <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 55, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 21, background: 'rgba(2,189,182,0.08)', border: '1px solid rgba(2,189,182,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 13 }}>
            <CreditCard size={24} strokeWidth={1.5} color="#02BDB6" />
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>
            {search ? 'Ничего не найдено' : 'Шаблонов абонементов пока нет'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 300, lineHeight: 1.6 }}>
            {search ? 'Попробуйте изменить запрос' : 'Нажмите «Новый абонемент» чтобы создать первый шаблон'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(t => <TemplateCard key={t.id} tpl={t} onDelete={id => void handleDelete(id)} />)}
        </div>
      )}

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
    </div>
  )
}
