import React, { useState, useEffect } from 'react'
import { Users, Search, Plus, X, AlertCircle, Phone, Mail, Calendar, Edit2, Trash2 } from 'lucide-react'
import { clientsApi } from '../../api/clients.api'
import type { Client } from '../../types'

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

// ─── ClientCard ────────────────────────────────────────────────────────────────

interface ClientCardProps {
  client: Client
  onEdit: (c: Client) => void
  onDelete: (id: string) => void
}

function ClientCard({ client, onEdit, onDelete }: ClientCardProps) {
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
  const [clients,    setClients]    = useState<Client[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [search,     setSearch]     = useState('')
  const [showModal,  setShowModal]  = useState(false)
  const [editTarget, setEditTarget] = useState<Client | null>(null)

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

  const handleEdit = (c: Client) => {
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
            <ClientCard key={c.id} client={c} onEdit={handleEdit} onDelete={id => void handleDelete(id)} />
          ))}
        </div>
      )}

      {showModal && (
        <ClientModal initial={editTarget} onClose={handleCloseModal} onSave={handleSave} />
      )}
    </div>
  )
}
