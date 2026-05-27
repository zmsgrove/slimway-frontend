import React, { useState, useEffect, useRef } from 'react'
import { ShoppingCart, Search, X, AlertCircle, Check, Calendar, ChevronDown, Plus, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { subscriptionTemplatesApi } from '../../api/subscription-templates.api'
import { subscriptionsApi } from '../../api/subscriptions.api'
import { clientsApi } from '../../api/clients.api'
import type { SubscriptionTemplate, Client, DeviceType } from '../../types'

// ─── constants ────────────────────────────────────────────────────────────────

const DEVICE_LABELS: Record<DeviceType, string> = {
  vacuactiv: 'VacuActiv', rollshape: 'RollShape', infrastep: 'InfraStep', infrashape: 'InfraShape',
}

// ─── styles ───────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  height: 40, padding: '0 13px', background: 'var(--bg-elevated)',
  border: '1px solid var(--glass-border)', borderRadius: 8,
  color: 'var(--text-primary)', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }

// ─── ClientSearch ─────────────────────────────────────────────────────────────

interface ClientSearchProps {
  value: Client | null
  onChange: (c: Client | null) => void
  onCreateNew: (name: string) => void
}

function ClientSearch({ value, onChange, onCreateNew }: ClientSearchProps) {
  const [q, setQ]       = useState('')
  const [res, setRes]   = useState<Client[]>([])
  const [open, setOpen] = useState(false)
  const timer           = useRef<ReturnType<typeof setTimeout>>()
  const ref             = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 40, padding: '0 13px', background: 'var(--bg-elevated)', border: '1px solid #02BDB6', borderRadius: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <User size={14} strokeWidth={1.75} color="#02BDB6" />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{value.full_name}</span>
          {value.phone && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{value.phone}</span>}
        </div>
        <button onClick={() => onChange(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 0 }}><X size={13} /></button>
      </div>
    )
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
      <input
        style={{ ...inputStyle, paddingLeft: 32 }}
        placeholder="Поиск по имени или телефону..."
        value={q}
        onChange={e => search(e.target.value)}
        onFocus={() => q && setOpen(true)}
      />
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 8, overflow: 'hidden', marginTop: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
          {res.map(c => (
            <button key={c.id} onClick={() => { onChange(c); setQ(''); setOpen(false) }}
              style={{ display: 'block', width: '100%', padding: '9px 13px', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px solid var(--glass-border)', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 13 }}>
              {c.full_name}{c.phone && <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 8 }}>{c.phone}</span>}
            </button>
          ))}
          {q.trim() && (
            <button onClick={() => { onCreateNew(q.trim()); setOpen(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '9px 13px', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', color: '#02BDB6', fontSize: 13 }}>
              <Plus size={13} />Создать клиента «{q.trim()}»
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── CreateClientInline ───────────────────────────────────────────────────────

interface CreateClientInlineProps {
  defaultName: string
  onCreated: (c: Client) => void
  onCancel: () => void
}

function CreateClientInline({ defaultName, onCreated, onCancel }: CreateClientInlineProps) {
  const [fullName, setFullName] = useState(defaultName)
  const [phone,    setPhone]    = useState('')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const handleCreate = async () => {
    if (!fullName.trim()) { setError('Введите имя'); return }
    setSaving(true); setError(null)
    try {
      const c = await clientsApi.create({ full_name: fullName.trim(), phone: phone.trim() || null })
      onCreated(c)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Ошибка при создании клиента')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: 13, background: 'var(--bg-elevated)', border: '1px solid rgba(2,189,182,0.25)', borderRadius: 13, marginTop: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#02BDB6', marginBottom: 13 }}>Новый клиент</div>
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, marginBottom: 8, fontSize: 11, color: '#ef4444' }}>
          <AlertCircle size={11} />{error}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div>
          <label style={labelStyle}>Имя *</label>
          <input style={{ ...inputStyle, height: 36 }} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="ФИО" />
        </div>
        <div>
          <label style={labelStyle}>Телефон</label>
          <input style={{ ...inputStyle, height: 36 }} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+7 700 000 0000" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => void handleCreate()} disabled={saving}
          style={{ flex: 1, height: 32, background: '#02BDB6', border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Создание...' : 'Создать'}
        </button>
        <button onClick={onCancel}
          style={{ height: 32, padding: '0 13px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 6, color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}>
          Отмена
        </button>
      </div>
    </div>
  )
}

// ─── TemplateCard ─────────────────────────────────────────────────────────────

function TemplateCard({ tpl, selected, onClick }: { tpl: SubscriptionTemplate; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left', padding: 13,
        background: selected ? 'rgba(2,189,182,0.10)' : 'var(--bg-elevated)',
        border: `1px solid ${selected ? '#02BDB6' : 'var(--glass-border)'}`,
        borderRadius: 13, cursor: 'pointer', transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: selected ? '#02BDB6' : 'var(--text-primary)' }}>{tpl.name}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {tpl.price !== null && (
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {new Intl.NumberFormat('ru-KZ').format(tpl.price)} ₸
            </span>
          )}
          {selected && <Check size={14} strokeWidth={2.5} color="#02BDB6" />}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(2,189,182,0.10)', color: '#02BDB6', border: '1px solid rgba(2,189,182,0.2)' }}>
          {DEVICE_LABELS[tpl.slot_1_type]} · {tpl.slot_1_duration_min} мин · {tpl.slot_1_sessions_total} сеансов
        </span>
        {tpl.slot_2_type && tpl.slot_2_sessions_total && (
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(38,60,217,0.10)', color: '#263CD9', border: '1px solid rgba(38,60,217,0.2)' }}>
            {DEVICE_LABELS[tpl.slot_2_type]} · {tpl.slot_2_duration_min} мин · {tpl.slot_2_sessions_total} сеансов
          </span>
        )}
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'var(--glass-border)', color: 'var(--text-secondary)', border: '1px solid var(--glass-border)' }}>
          {tpl.validity_days} дней
        </span>
      </div>
    </button>
  )
}

// ─── SalePage ─────────────────────────────────────────────────────────────────

export default function SalePage() {
  const navigate = useNavigate()

  const [templates,     setTemplates]     = useState<SubscriptionTemplate[]>([])
  const [loadingTpls,   setLoadingTpls]   = useState(true)
  const [tplError,      setTplError]      = useState<string | null>(null)
  const [selectedTpl,   setSelectedTpl]   = useState<SubscriptionTemplate | null>(null)
  const [client,        setClient]        = useState<Client | null>(null)
  const [creatingName,  setCreatingName]  = useState<string | null>(null)
  const [dateStart,     setDateStart]     = useState(new Date().toISOString().slice(0, 10))
  const [saving,        setSaving]        = useState(false)
  const [saleError,     setSaleError]     = useState<string | null>(null)
  const [soldSub,       setSoldSub]       = useState<{ name: string; client: string } | null>(null)
  const [showAllTpls,   setShowAllTpls]   = useState(false)

  useEffect(() => {
    subscriptionTemplatesApi.getAll()
      .then(data => { setTemplates(data); if (data.length === 1) setSelectedTpl(data[0]) })
      .catch(() => setTplError('Не удалось загрузить шаблоны'))
      .finally(() => setLoadingTpls(false))
  }, [])

  const handleClientCreated = (c: Client) => {
    setClient(c)
    setCreatingName(null)
  }

  const handleSell = async () => {
    if (!selectedTpl) { setSaleError('Выберите шаблон абонемента'); return }
    if (!client)      { setSaleError('Выберите клиента'); return }

    setSaving(true); setSaleError(null)
    try {
      const dateEnd = new Date(dateStart)
      dateEnd.setDate(dateEnd.getDate() + selectedTpl.validity_days)

      await subscriptionsApi.create({
        client_id:             client.id,
        name:                  selectedTpl.name,
        slot_1_type:           selectedTpl.slot_1_type,
        slot_1_duration_min:   selectedTpl.slot_1_duration_min,
        slot_1_sessions_total: selectedTpl.slot_1_sessions_total,
        slot_2_type:           selectedTpl.slot_2_type,
        slot_2_duration_min:   selectedTpl.slot_2_duration_min,
        slot_2_sessions_total: selectedTpl.slot_2_sessions_total,
        date_start:            dateStart,
        date_end:              dateEnd.toISOString().slice(0, 10),
        price:                 selectedTpl.price,
      })
      setSoldSub({ name: selectedTpl.name, client: client.full_name })
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setSaleError(msg ?? 'Ошибка при создании абонемента')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setSoldSub(null)
    setSelectedTpl(null)
    setClient(null)
    setCreatingName(null)
    setSaleError(null)
    setDateStart(new Date().toISOString().slice(0, 10))
  }

  const visibleTpls = showAllTpls ? templates : templates.slice(0, 6)

  // ── Success state ────────────────────────────────────────────────────────────
  if (soldSub) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', paddingTop: 34 }}>
        <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 34, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(2,189,182,0.12)', border: '1px solid rgba(2,189,182,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 21px' }}>
            <Check size={28} strokeWidth={2.5} color="#02BDB6" />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Продажа оформлена!</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
            Клиент: <strong style={{ color: 'var(--text-primary)' }}>{soldSub.client}</strong>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 34 }}>
            Абонемент: <strong style={{ color: 'var(--text-primary)' }}>{soldSub.name}</strong>
          </div>
          <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
            <button
              onClick={() => navigate('/schedule')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              <Calendar size={16} strokeWidth={2} />Записать на тренировку
            </button>
            <button
              onClick={handleReset}
              style={{ height: 40, background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}
            >
              Новая продажа
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Main form ────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 21 }}>
        <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text-primary)', margin: 0, marginBottom: 4 }}>Продажа</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Оформление абонемента клиенту</p>
      </div>

      {saleError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 13, fontSize: 13, color: '#ef4444' }}>
          <AlertCircle size={14} />{saleError}
        </div>
      )}

      {/* Templates */}
      <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 21, marginBottom: 13 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 13 }}>Шаблон абонемента</div>

        {tplError ? (
          <div style={{ fontSize: 13, color: '#ef4444' }}>{tplError}</div>
        ) : loadingTpls ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Загрузка шаблонов...</div>
        ) : templates.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '21px 0' }}>
            Нет доступных шаблонов. Добавьте их в <button onClick={() => navigate('/settings')} style={{ background: 'none', border: 'none', color: '#02BDB6', cursor: 'pointer', fontSize: 13, padding: 0 }}>Настройках</button>.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {visibleTpls.map(tpl => (
                <TemplateCard key={tpl.id} tpl={tpl} selected={selectedTpl?.id === tpl.id} onClick={() => setSelectedTpl(tpl)} />
              ))}
            </div>
            {templates.length > 6 && (
              <button
                onClick={() => setShowAllTpls(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', padding: '4px 0' }}
              >
                <ChevronDown size={13} style={{ transform: showAllTpls ? 'rotate(180deg)' : 'none', transition: '0.15s' }} />
                {showAllTpls ? 'Скрыть' : `Ещё ${templates.length - 6}`}
              </button>
            )}
          </>
        )}
      </div>

      {/* Client */}
      <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 21, marginBottom: 13 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 13 }}>Клиент</div>
        <ClientSearch
          value={client}
          onChange={setClient}
          onCreateNew={name => setCreatingName(name)}
        />
        {creatingName !== null && (
          <CreateClientInline
            defaultName={creatingName}
            onCreated={handleClientCreated}
            onCancel={() => setCreatingName(null)}
          />
        )}
      </div>

      {/* Date */}
      <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 21, marginBottom: 21 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 13 }}>Дата начала</div>
        <div>
          <input type="date" style={inputStyle} value={dateStart} onChange={e => setDateStart(e.target.value)} />
          {selectedTpl && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
              Срок действия: {selectedTpl.validity_days} дней · до{' '}
              {(() => {
                const d = new Date(dateStart)
                d.setDate(d.getDate() + selectedTpl.validity_days)
                return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={() => void handleSell()}
        disabled={saving || !selectedTpl || !client}
        style={{
          width: '100%', height: 48, background: '#02BDB6', border: 'none', borderRadius: 13,
          color: '#fff', fontSize: 15, fontWeight: 700, cursor: (saving || !selectedTpl || !client) ? 'not-allowed' : 'pointer',
          opacity: (saving || !selectedTpl || !client) ? 0.5 : 1, transition: 'opacity 0.15s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        <ShoppingCart size={18} strokeWidth={2} />
        {saving ? 'Оформление...' : 'Продать абонемент'}
      </button>
    </div>
  )
}
