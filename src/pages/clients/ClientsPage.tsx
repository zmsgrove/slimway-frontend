import React, { useState, useEffect } from 'react'
import { Users, Search, Plus, X, AlertCircle, Phone, Mail, Calendar, Edit2, Trash2, Eye, CreditCard } from 'lucide-react'
import { clientsApi } from '../../api/clients.api'
import { subscriptionsApi } from '../../api/subscriptions.api'
import type { Client, Subscription } from '../../types'

const DEVICE_TYPE_LABELS: Record<string, string> = {
  vacuactiv: 'VacuActiv', rollshape: 'RollShape', infrastep: 'InfraStep', infrashape: 'InfraShape',
}
const DEVICE_TYPE_COLORS: Record<string, string> = {
  vacuactiv: '#02BDB6', rollshape: '#263CD9', infrastep: '#8b5cf6', infrashape: '#f59e0b',
}
const SUB_STATUS_COLOR: Record<string, string> = { active: '#10b981', frozen: '#f59e0b', expired: '#71717A' }
const SUB_STATUS_LABEL: Record<string, string> = { active: 'Активный', frozen: 'Заморожен', expired: 'Истёк' }

// ─── styles ─────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  height: 40, padding: '0 13px', background: 'var(--bg-elevated)',
  border: '1px solid var(--glass-border)', borderRadius: 8,
  color: 'var(--text-primary)', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }

// ─── ClientModal ──────────────────────────────────────────────────────────────

interface ClientModalProps {
  initial?: Client | null
  onClose: () => void
  onSave: (c: Client) => void
}

function ClientModal({ initial, onClose, onSave }: ClientModalProps) {
  const [fullName,  setFullName]  = useState(initial?.full_name  ?? '')
  const [phone,     setPhone]     = useState(initial?.phone      ?? '')
  const [email,     setEmail]     = useState(initial?.email      ?? '')
  const [birthDate, setBirthDate] = useState(initial?.birth_date ?? '')
  const [notes,     setNotes]     = useState(initial?.notes      ?? '')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!fullName.trim()) { setError('Введите имя клиента'); return }
    setSaving(true); setError(null)
    try {
      const payload = {
        full_name:  fullName.trim(),
        phone:      phone.trim()     || null,
        email:      email.trim()     || null,
        birth_date: birthDate        || null,
        notes:      notes.trim()     || null,
      }
      const result = initial
        ? await clientsApi.update(initial.id, payload)
        : await clientsApi.create(payload)
      onSave(result)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Ошибка при сохранении')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 480, background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 21 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 21 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
            {initial ? 'Редактировать клиента' : 'Новый клиент'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}><X size={18} /></button>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 13, fontSize: 12, color: '#ef4444' }}>
            <AlertCircle size={13} />{error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div>
            <label style={labelStyle}>Имя *</label>
            <input style={inputStyle} placeholder="Фамилия Имя Отчество" value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={labelStyle}>Телефон</label>
              <input style={inputStyle} placeholder="+7 700 000 0000" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" style={inputStyle} placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Дата рождения</label>
            <input type="date" style={inputStyle} value={birthDate} onChange={e => setBirthDate(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Заметки</label>
            <textarea
              style={{ ...inputStyle, height: 72, paddingTop: 8, paddingBottom: 8, resize: 'vertical' }}
              placeholder="Дополнительная информация..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              onClick={() => void handleSubmit()}
              disabled={saving}
              style={{ flex: 1, height: 40, background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Сохранение...' : initial ? 'Сохранить' : 'Добавить клиента'}
            </button>
            <button
              onClick={onClose}
              style={{ height: 40, padding: '0 21px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ClientDetailModal ────────────────────────────────────────────────────────

interface ClientDetailModalProps { client: Client; onClose: () => void; onEdit: () => void }

function ClientDetailModal({ client, onClose, onEdit }: ClientDetailModalProps) {
  const [tab, setTab]             = useState<'profile' | 'history'>('profile')
  const [subs, setSubs]           = useState<Subscription[] | null>(null)
  const [loadingSubs, setLoading] = useState(false)

  useEffect(() => {
    if (tab !== 'history' || subs !== null) return
    setLoading(true)
    subscriptionsApi.getAll({ client_id: client.id })
      .then(data => setSubs(data.sort((a, b) => b.created_at.localeCompare(a.created_at))))
      .catch(() => setSubs([]))
      .finally(() => setLoading(false))
  }, [tab, subs, client.id])

  const initials = client.full_name.charAt(0).toUpperCase()

  const tabBtn = (t: 'profile' | 'history', label: string) => (
    <button onClick={() => setTab(t)} style={{ flex: 1, height: 34, background: tab === t ? 'rgba(2,189,182,0.10)' : 'transparent', border: 'none', borderRadius: 8, color: tab === t ? '#02BDB6' : 'var(--text-muted)', fontSize: 13, fontWeight: tab === t ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>{label}</button>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div className="modal-animate" style={{ position: 'relative', width: '100%', maxWidth: 500, background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 21, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        {/* Header */}
        <div style={{ padding: 34, paddingBottom: 21, borderBottom: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(2,189,182,0.12)', border: '2px solid rgba(2,189,182,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#02BDB6', flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{client.full_name}</div>
              {client.phone && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>{client.phone}</div>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onEdit} title="Редактировать" style={{ display: 'flex', alignItems: 'center', gap: 5, height: 32, padding: '0 12px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}>
                <Edit2 size={12} />Изменить
              </button>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
            </div>
          </div>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginTop: 21, background: 'var(--bg-surface)', borderRadius: 10, padding: 4 }}>
            {tabBtn('profile', 'Профиль')}
            {tabBtn('history', 'История')}
          </div>
        </div>

        {/* Profile tab */}
        {tab === 'profile' && (
          <div style={{ padding: 34, display: 'flex', flexDirection: 'column', gap: 21 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
              {client.phone && (
                <div style={{ padding: 13, background: 'var(--bg-surface)', borderRadius: 13 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Телефон</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={12} color="var(--text-muted)" />{client.phone}</div>
                </div>
              )}
              {client.email && (
                <div style={{ padding: 13, background: 'var(--bg-surface)', borderRadius: 13 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Email</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={12} color="var(--text-muted)" />{client.email}</div>
                </div>
              )}
              {client.birth_date && (
                <div style={{ padding: 13, background: 'var(--bg-surface)', borderRadius: 13 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Дата рождения</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={12} color="var(--text-muted)" />
                    {new Date(client.birth_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
              )}
              <div style={{ padding: 13, background: 'var(--bg-surface)', borderRadius: 13 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>В базе с</div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                  {new Date(client.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
            </div>
            {client.notes && (
              <div style={{ padding: 13, background: 'var(--bg-surface)', borderRadius: 13, borderTop: '1px solid var(--glass-border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Заметки</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{client.notes}</div>
              </div>
            )}
          </div>
        )}

        {/* History tab */}
        {tab === 'history' && (
          <div style={{ padding: 34, maxHeight: 400, overflowY: 'auto' }}>
            {loadingSubs ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '21px 0' }}>Загрузка...</div>
            ) : !subs || subs.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '21px 0', textAlign: 'center' }}>
                <CreditCard size={24} strokeWidth={1.5} color="var(--text-muted)" />
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Абонементов нет</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {subs.map(sub => {
                  const sc = SUB_STATUS_COLOR[sub.status]
                  return (
                    <div key={sub.id} style={{ padding: 13, background: 'var(--bg-surface)', borderRadius: 13, border: `1px solid ${sc}22` }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{sub.name}</div>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: sc + '18', color: sc, border: `1px solid ${sc}33` }}>{SUB_STATUS_LABEL[sub.status]}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Слот 1</div>
                          <div style={{ fontSize: 12, color: DEVICE_TYPE_COLORS[sub.slot_1_type] }}>{DEVICE_TYPE_LABELS[sub.slot_1_type]}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{sub.slot_1_sessions_left}/{sub.slot_1_sessions_total} сеансов</div>
                        </div>
                        {sub.slot_2_type && sub.slot_2_sessions_left !== null && (
                          <div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Слот 2</div>
                            <div style={{ fontSize: 12, color: DEVICE_TYPE_COLORS[sub.slot_2_type] }}>{DEVICE_TYPE_LABELS[sub.slot_2_type]}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{sub.slot_2_sessions_left}/{sub.slot_2_sessions_total} сеансов</div>
                          </div>
                        )}
                      </div>
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--glass-border)', display: 'flex', gap: 13, fontSize: 11, color: 'var(--text-muted)' }}>
                        <span>С {new Date(sub.date_start).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
                        {sub.date_end && <span>По {new Date(sub.date_end).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                        {sub.price && <span>· {sub.price.toLocaleString('ru-RU')} ₸</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── ClientCard ────────────────────────────────────────────────────────────────

interface ClientCardProps {
  client: Client
  onEdit: (c: Client) => void
  onDelete: (id: string) => void
  onView: (c: Client) => void
}

function ClientCard({ client, onEdit, onDelete, onView }: ClientCardProps) {
  const activeSub = client.memberships?.find(m => m.status === 'active')

  return (
    <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', borderRadius: 13, padding: '13px 21px', display: 'flex', alignItems: 'center', gap: 13 }}>
      {/* Avatar */}
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(2,189,182,0.12)', border: '1px solid rgba(2,189,182,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#02BDB6' }}>
          {client.full_name.charAt(0).toUpperCase()}
        </span>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {client.full_name}
          </span>
          {activeSub && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: 'rgba(2,189,182,0.12)', border: '1px solid rgba(2,189,182,0.25)', color: '#02BDB6', flexShrink: 0 }}>
              Активный
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap' }}>
          {client.phone && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-secondary)' }}>
              <Phone size={11} strokeWidth={1.75} />{client.phone}
            </span>
          )}
          {client.email && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-secondary)' }}>
              <Mail size={11} strokeWidth={1.75} />{client.email}
            </span>
          )}
          {client.birth_date && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
              <Calendar size={11} strokeWidth={1.75} />
              {new Date(client.birth_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
            </span>
          )}
        </div>
        {activeSub && (
          <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
            {activeSub.used_sessions} / {activeSub.total_sessions ?? '∞'} сеансов
            {activeSub.end_date && ` · до ${new Date(activeSub.end_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button
          onClick={() => onView(client)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 6, border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
          title="Просмотр"
        >
          <Eye size={13} strokeWidth={1.75} />
        </button>
        <button
          onClick={() => onEdit(client)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 6, border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
          title="Редактировать"
        >
          <Edit2 size={13} strokeWidth={1.75} />
        </button>
        <button
          onClick={() => onDelete(client.id)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 6, border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
          title="Удалить"
        >
          <Trash2 size={13} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  )
}

// ─── ClientsPage ──────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const [clients,     setClients]    = useState<Client[]>([])
  const [loading,     setLoading]    = useState(true)
  const [error,       setError]      = useState<string | null>(null)
  const [search,      setSearch]     = useState('')
  const [showModal,   setShowModal]  = useState(false)
  const [editTarget,  setEditTarget] = useState<Client | null>(null)
  const [viewTarget,  setViewTarget] = useState<Client | null>(null)

  const load = async (q?: string) => {
    setLoading(true); setError(null)
    try {
      const data = await clientsApi.getAll(q)
      setClients(data)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Не удалось загрузить клиентов')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const handleSearch = (q: string) => {
    setSearch(q)
    void load(q || undefined)
  }

  const handleSave = (c: Client) => {
    if (editTarget) {
      setClients(prev => prev.map(x => x.id === c.id ? c : x))
    } else {
      setClients(prev => [c, ...prev])
    }
    setShowModal(false)
    setEditTarget(null)
  }

  const handleView = (c: Client) => setViewTarget(c)

  const handleEdit = (c: Client) => {
    setViewTarget(null)
    setEditTarget(c)
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить клиента?')) return
    try {
      await clientsApi.delete(id)
      setClients(prev => prev.filter(c => c.id !== id))
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Не удалось удалить клиента')
    }
  }

  const handleOpenCreate = () => {
    setEditTarget(null)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditTarget(null)
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 21, gap: 13 }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text-primary)', margin: 0, marginBottom: 4 }}>Клиенты</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{clients.length} клиентов в базе</p>
        </div>
        <button
          onClick={handleOpenCreate}
          style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 21px', background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', flexShrink: 0 }}
        >
          <Plus size={15} strokeWidth={2} />Добавить клиента
        </button>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 13px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 8, marginBottom: 13, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <Search size={15} strokeWidth={1.75} color="var(--text-muted)" />
        <input
          style={{ flex: 1, background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
          placeholder="Поиск по имени, телефону или email..."
          value={search}
          onChange={e => handleSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => handleSearch('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
            <X size={13} />
          </button>
        )}
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
      ) : clients.length === 0 ? (
        <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 55, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: 300 }}>
          <div style={{ width: 56, height: 56, borderRadius: 21, background: 'rgba(2,189,182,0.08)', border: '1px solid rgba(2,189,182,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 13 }}>
            <Users size={24} strokeWidth={1.5} color="#02BDB6" />
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>
            {search ? 'Ничего не найдено' : 'Клиентов пока нет'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 300, lineHeight: 1.6 }}>
            {search ? 'Попробуйте изменить запрос' : 'Нажмите «Добавить клиента» чтобы создать первого'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {clients.map(c => (
            <ClientCard key={c.id} client={c} onEdit={handleEdit} onDelete={id => void handleDelete(id)} onView={handleView} />
          ))}
        </div>
      )}

      {showModal && (
        <ClientModal initial={editTarget} onClose={handleCloseModal} onSave={handleSave} />
      )}
      {viewTarget && (
        <ClientDetailModal
          client={viewTarget}
          onClose={() => setViewTarget(null)}
          onEdit={() => handleEdit(viewTarget)}
        />
      )}
    </div>
  )
}
