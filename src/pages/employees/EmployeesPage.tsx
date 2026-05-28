import React, { useState, useEffect } from 'react'
import { Plus, X, Phone, Calendar, Briefcase, Building2, Pencil, Trash2, AlertCircle } from 'lucide-react'
import { employeesApi } from '../../api/employees.api'
import { useAuth } from '../../hooks/useAuth'
import type { Employee } from '../../types'

const POSITIONS   = ['Управляющий', 'Менеджер', 'Технический специалист', 'Разработчик']
const DEPARTMENTS = ['Управление', 'Менеджмент', 'Технический отдел', 'IT']

function avatarColor(name: string): string {
  const colors = ['#02BDB6', '#263CD9', '#8b5cf6', '#f59e0b', '#10b981', '#f97316', '#ec4899']
  return colors[name.charCodeAt(0) % colors.length]
}

function formatDate(d: string | null): string {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return d }
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 36, padding: '0 13px',
  background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)',
  borderRadius: 8, color: 'var(--text-primary)', fontSize: 13,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}

// ─── AddEmployeeModal ─────────────────────────────────────────

interface AddModalProps { onClose: () => void; onSaved: (emp: Employee) => void }

function AddEmployeeModal({ onClose, onSaved }: AddModalProps) {
  const [form, setForm] = useState({ full_name: '', phone: '', birth_date: '', position: '', department: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.full_name.trim()) { setError('Введите имя сотрудника'); return }
    setSaving(true); setError(null)
    try {
      const emp = await employeesApi.create({
        full_name:  form.full_name.trim(),
        phone:      form.phone || undefined,
        birth_date: form.birth_date || undefined,
        position:   form.position || undefined,
        department: form.department || undefined,
      })
      onSaved(emp)
    } catch {
      setError('Не удалось добавить сотрудника')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 440, background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 21 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 21 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Добавить сотрудника</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}><X size={18} /></button>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 13, fontSize: 12, color: '#ef4444' }}>
            <AlertCircle size={13} />{error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Имя *</div>
            <input style={inputStyle} placeholder="Полное имя" value={form.full_name} onChange={e => set('full_name', e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Телефон</div>
            <input style={inputStyle} placeholder="+7 777 000 00 00" value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Дата рождения</div>
            <input type="date" style={inputStyle} value={form.birth_date} onChange={e => set('birth_date', e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Должность</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
              {POSITIONS.map(p => (
                <button key={p} onClick={() => set('position', form.position === p ? '' : p)}
                  style={{ background: form.position === p ? 'rgba(2,189,182,0.12)' : 'transparent', border: `1px solid ${form.position === p ? '#02BDB6' : 'var(--glass-border)'}`, borderRadius: 20, color: form.position === p ? '#02BDB6' : 'var(--text-muted)', fontSize: 11, padding: '3px 10px', cursor: 'pointer' }}>
                  {p}
                </button>
              ))}
            </div>
            <input style={inputStyle} placeholder="или введите свою..." value={form.position} onChange={e => set('position', e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Отдел</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
              {DEPARTMENTS.map(d => (
                <button key={d} onClick={() => set('department', form.department === d ? '' : d)}
                  style={{ background: form.department === d ? 'rgba(38,60,217,0.12)' : 'transparent', border: `1px solid ${form.department === d ? '#263CD9' : 'var(--glass-border)'}`, borderRadius: 20, color: form.department === d ? '#263CD9' : 'var(--text-muted)', fontSize: 11, padding: '3px 10px', cursor: 'pointer' }}>
                  {d}
                </button>
              ))}
            </div>
            <input style={inputStyle} placeholder="или введите свой..." value={form.department} onChange={e => set('department', e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 21 }}>
          <button onClick={() => void handleSave()} disabled={saving}
            style={{ flex: 1, height: 40, background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Сохранение...' : 'Добавить'}
          </button>
          <button onClick={onClose} style={{ height: 40, padding: '0 13px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>Отмена</button>
        </div>
      </div>
    </div>
  )
}

// ─── EmployeeCard ─────────────────────────────────────────────

interface CardProps {
  emp: Employee
  canEdit: boolean
  onUpdated: (emp: Employee) => void
  onDeleted: (id: string) => void
}

function EmployeeCard({ emp, canEdit, onUpdated, onDeleted }: CardProps) {
  const [editing, setEditing]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [form, setForm]         = useState({ full_name: emp.full_name, phone: emp.phone ?? '', birth_date: emp.birth_date ?? '', position: emp.position ?? '', department: emp.department ?? '' })
  const [error, setError]       = useState<string | null>(null)

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }))
  const color = avatarColor(emp.full_name)
  const initials = emp.full_name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  const handleSave = async () => {
    if (!form.full_name.trim()) { setError('Введите имя'); return }
    setSaving(true); setError(null)
    try {
      const updated = await employeesApi.update(emp.id, {
        full_name:  form.full_name.trim(),
        phone:      form.phone || null,
        birth_date: form.birth_date || null,
        position:   form.position || null,
        department: form.department || null,
      })
      onUpdated(updated)
      setEditing(false)
    } catch {
      setError('Не удалось сохранить')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await employeesApi.delete(emp.id)
      onDeleted(emp.id)
    } catch {
      setDeleting(false)
    }
  }

  return (
    <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', borderRadius: 21, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '18px 18px 14px', display: 'flex', gap: 14, alignItems: 'flex-start', borderBottom: '1px solid var(--glass-border)' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: color + '20', border: `2px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color, flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.full_name}</div>
          {emp.position && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{emp.position}</div>}
          {emp.department && (
            <span style={{ display: 'inline-block', marginTop: 5, background: color + '18', color, border: `1px solid ${color}33`, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
              {emp.department}
            </span>
          )}
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button onClick={() => { setEditing(e => !e); setError(null) }} title="Редактировать"
              style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer' }}>
              <Pencil size={12} />
            </button>
            <button onClick={() => void handleDelete()} disabled={deleting} title="Удалить"
              style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#ef4444', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.5 : 1 }}>
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      {!editing && (
        <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {emp.phone ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--text-secondary)' }}>
              <Phone size={12} color="var(--text-muted)" style={{ flexShrink: 0 }} />{emp.phone}
            </div>
          ) : null}
          {emp.birth_date ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--text-secondary)' }}>
              <Calendar size={12} color="var(--text-muted)" style={{ flexShrink: 0 }} />{formatDate(emp.birth_date)}
            </div>
          ) : null}
          {!emp.phone && !emp.birth_date && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Контакты не заполнены</div>
          )}
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <div style={{ padding: '14px 18px', borderTop: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {error && (
            <div style={{ fontSize: 11, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 5 }}>
              <AlertCircle size={11} />{error}
            </div>
          )}
          <input style={{ ...inputStyle, height: 32, fontSize: 12 }} placeholder="Имя *" value={form.full_name} onChange={e => set('full_name', e.target.value)} />
          <input style={{ ...inputStyle, height: 32, fontSize: 12 }} placeholder="Телефон" value={form.phone} onChange={e => set('phone', e.target.value)} />
          <input type="date" style={{ ...inputStyle, height: 32, fontSize: 12 }} value={form.birth_date} onChange={e => set('birth_date', e.target.value)} />
          <input style={{ ...inputStyle, height: 32, fontSize: 12 }} placeholder="Должность" value={form.position} onChange={e => set('position', e.target.value)} />
          <input style={{ ...inputStyle, height: 32, fontSize: 12 }} placeholder="Отдел" value={form.department} onChange={e => set('department', e.target.value)} />
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={() => { setEditing(false); setError(null) }} style={{ flex: 1, height: 32, background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}>Отмена</button>
            <button onClick={() => void handleSave()} disabled={saving} style={{ flex: 2, height: 32, background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── EmployeesPage ────────────────────────────────────────────

export default function EmployeesPage() {
  const { user }                          = useAuth()
  const [employees, setEmployees]         = useState<Employee[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)
  const [showAdd, setShowAdd]             = useState(false)

  const canEdit = user?.role === 'owner' || user?.role === 'franchisee' || user?.role === 'admin'

  useEffect(() => {
    employeesApi.getAll()
      .then(setEmployees)
      .catch(() => setError('Не удалось загрузить сотрудников'))
      .finally(() => setLoading(false))
  }, [])

  const handleAdded = (emp: Employee) => {
    setEmployees(prev => [...prev, emp].sort((a, b) => a.full_name.localeCompare(b.full_name)))
    setShowAdd(false)
  }
  const handleUpdated = (emp: Employee) => setEmployees(prev => prev.map(e => e.id === emp.id ? emp : e))
  const handleDeleted = (id: string)   => setEmployees(prev => prev.filter(e => e.id !== id))

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 21, gap: 13 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Сотрудники</h1>
            {!loading && (
              <span style={{ background: 'rgba(2,189,182,0.12)', color: '#02BDB6', border: '1px solid rgba(2,189,182,0.25)', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                {employees.length}
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>Управление персоналом филиала</p>
        </div>
        {canEdit && (
          <button onClick={() => setShowAdd(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 16px', background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
            <Plus size={15} />Добавить
          </button>
        )}
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 21, fontSize: 12, color: '#ef4444' }}>
          <AlertCircle size={13} />{error}
        </div>
      )}

      {loading ? (
        <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 55, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          Загрузка...
        </div>
      ) : employees.length === 0 ? (
        <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 55, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 13, textAlign: 'center' }}>
          <Briefcase size={28} strokeWidth={1.5} color="var(--text-muted)" />
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>Сотрудников нет</div>
            {canEdit && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 5 }}>Нажмите «Добавить» чтобы внести первого</div>}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {employees.map(emp => (
            <EmployeeCard key={emp.id} emp={emp} canEdit={canEdit} onUpdated={handleUpdated} onDeleted={handleDeleted} />
          ))}
        </div>
      )}

      {showAdd && <AddEmployeeModal onClose={() => setShowAdd(false)} onSaved={handleAdded} />}
    </div>
  )
}
