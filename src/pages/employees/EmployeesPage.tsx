import React, { useState, useEffect } from 'react'
import {
  Plus, X, Phone, Calendar, Briefcase, Pencil, Trash2, AlertCircle,
  Clock, MapPin, CheckCircle, Eye, EyeOff, Copy, Check, RefreshCw,
  User, Lock, Building2,
} from 'lucide-react'
import { employeesApi } from '../../api/employees.api'
import { PageHeader } from '../../components/layout/PageHeader'
import { shiftsApi } from '../../api/shifts.api'
import { useAuth } from '../../hooks/useAuth'
import { usePermissions } from '../../hooks/usePermissions'
import { ContextMenu, type ContextMenuEntry } from '../../components/ContextMenu'
import type { Employee, Shift } from '../../types'
import { Skeleton } from '@/components/ui/skeleton'

// ─── constants ────────────────────────────────────────────────────────────────

const POSITIONS = [
  { value: 'manager',   label: 'Управляющий', role: 'franchisee', color: 'var(--accent)' },
  { value: 'staff',     label: 'Менеджер',    role: 'admin',       color: '#263CD9' },
  { value: 'technical', label: 'Тех.персонал', role: 'technical',  color: 'var(--color-warning)' },
]
const DEPARTMENTS = ['Управление', 'Менеджмент', 'Технический отдел', 'IT']

const STATUS_COLOR: Record<string, string> = {
  scheduled: '#71717A', active: 'var(--color-success)', completed: 'var(--accent)',
}
const STATUS_LABEL: Record<string, string> = {
  scheduled: 'По графику', active: 'На смене', completed: 'Завершена',
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function avatarColor(name: string): string {
  const colors = ['var(--accent)', '#263CD9', '#8b5cf6', 'var(--color-warning)', 'var(--color-success)', '#f97316', '#ec4899']
  return colors[name.charCodeAt(0) % colors.length]
}

function colorBg(c: string, opacity = 12): string {
  return `color-mix(in srgb, ${c} ${opacity}%, transparent)`
}
function colorBorder(c: string, opacity = 25): string {
  return `color-mix(in srgb, ${c} ${opacity}%, transparent)`
}

function formatDate(d: string | null): string {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return d }
}

function formatShiftDate(d: string): string {
  return new Date(d).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })
}

function fmtTime(ts: string | null): string {
  if (!ts) return '—'
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function genPassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 36, padding: '0 13px',
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 8, color: 'var(--text)', fontSize: 13,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  transition: 'border-color 150ms ease-out, box-shadow 150ms ease-out',
}
const labelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, display: 'block' }

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 13, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
      <div style={{ color: 'var(--accent)' }}>{icon}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.8 }}>{title}</div>
    </div>
  )
}

// ─── SuccessModal ─────────────────────────────────────────────────────────────

interface SuccessModalProps { email: string; password: string; name: string; onClose: () => void }

function SuccessModal({ email, password, name, onClose }: SuccessModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    const text = `Логин: ${email}\nПароль: ${password}`
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div className="modal-animate" style={{ position: 'relative', width: '100%', maxWidth: 400, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, boxShadow: '0 24px 64px rgba(0,0,0,0.5)', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--color-success-muted)', border: '2px solid color-mix(in srgb, var(--color-success) 30%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 13px' }}>
          <CheckCircle size={24} color="var(--color-success)" />
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 5 }}>Сотрудник создан!</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 21 }}>{name}</div>

        <div style={{ background: 'var(--bg-surface)', borderRadius: 12, padding: 13, marginBottom: 21, textAlign: 'left' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Данные для входа</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Логин</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', fontFamily: 'monospace' }}>{email}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Пароль</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent)', fontFamily: 'monospace' }}>{password}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 13 }}>
          <button onClick={handleCopy} style={{ flex: 1, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: copied ? 'var(--color-success-muted)' : 'color-mix(in srgb, var(--accent) 12%, transparent)', border: `1px solid ${copied ? 'color-mix(in srgb, var(--color-success) 30%, transparent)' : 'color-mix(in srgb, var(--accent) 30%, transparent)'}`, borderRadius: 8, color: copied ? 'var(--color-success)' : 'var(--accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 150ms ease-out, border-color 150ms ease-out, color 150ms ease-out' }}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Скопировано' : 'Скопировать'}
          </button>
          <button onClick={onClose} style={{ flex: 1, height: 40, background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>Закрыть</button>
        </div>
      </div>
    </div>
  )
}

// ─── AddEmployeeModal ─────────────────────────────────────────────────────────

interface AddModalProps { onClose: () => void; onSaved: (emp: Employee, email: string, password: string) => void }

function AddEmployeeModal({ onClose, onSaved }: AddModalProps) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', middle_name: '',
    phone: '', birth_date: '', address: '',
    position: '', department: '',
    email: '', password: '',
  })
  const [showPass, setShowPass] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) { setError('Имя и фамилия обязательны'); return }
    if (!form.position) { setError('Выберите должность'); return }
    if (!form.email.trim()) { setError('Email обязателен'); return }
    if (form.password.length < 6) { setError('Пароль минимум 6 символов'); return }
    setSaving(true); setError(null)
    try {
      const emp = await employeesApi.create({
        first_name:  form.first_name.trim(),
        last_name:   form.last_name.trim(),
        middle_name: form.middle_name.trim() || undefined,
        phone:       form.phone.trim() || undefined,
        birth_date:  form.birth_date || undefined,
        address:     form.address.trim() || undefined,
        position:    form.position,
        department:  form.department || undefined,
        email:       form.email.trim(),
        password:    form.password,
      })
      onSaved(emp, form.email.trim(), form.password)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Не удалось создать сотрудника')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div className="modal-animate" style={{ position: 'relative', width: '100%', maxWidth: 540, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.5)', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Modal header */}
        <div style={{ padding: '28px 28px 21px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Добавить сотрудника</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>Создаётся аккаунт и профиль в системе</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
          </div>
        </div>

        <div style={{ padding: '21px 28px 28px', display: 'flex', flexDirection: 'column', gap: 21 }}>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 13px', background: 'color-mix(in srgb, var(--color-danger) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--color-danger) 20%, transparent)', borderRadius: 8, fontSize: 12, color: 'var(--color-danger)' }}>
              <AlertCircle size={13} />{error}
            </div>
          )}

          {/* Личные данные */}
          <div>
            <SectionHeader icon={<User size={14} />} title="Личные данные" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
                <div>
                  <label style={labelStyle}>Имя *</label>
                  <input style={inputStyle} placeholder="Имя" value={form.first_name} onChange={e => set('first_name', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Фамилия *</label>
                  <input style={inputStyle} placeholder="Фамилия" value={form.last_name} onChange={e => set('last_name', e.target.value)} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Отчество</label>
                <input style={inputStyle} placeholder="Отчество" value={form.middle_name} onChange={e => set('middle_name', e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
                <div>
                  <label style={labelStyle}>Дата рождения</label>
                  <input type="date" style={inputStyle} value={form.birth_date} onChange={e => set('birth_date', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Телефон</label>
                  <input style={inputStyle} placeholder="+7 777 000 00 00" value={form.phone} onChange={e => set('phone', e.target.value)} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Адрес</label>
                <input style={inputStyle} placeholder="Адрес проживания" value={form.address} onChange={e => set('address', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Должность */}
          <div>
            <SectionHeader icon={<Briefcase size={14} />} title="Должность" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <div>
                <label style={labelStyle}>Должность *</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {POSITIONS.map(p => (
                    <button key={p.value} onClick={() => set('position', p.value)}
                      style={{ flex: 1, height: 38, background: form.position === p.value ? colorBg(p.color, 15) : 'transparent', border: `1px solid ${form.position === p.value ? p.color : 'var(--border)'}`, borderRadius: 8, color: form.position === p.value ? p.color : 'var(--text-muted)', fontSize: 12, fontWeight: form.position === p.value ? 600 : 400, cursor: 'pointer', transition: 'background 150ms ease-out, border-color 150ms ease-out, color 150ms ease-out' }}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Отдел</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                  {DEPARTMENTS.map(d => (
                    <button key={d} onClick={() => set('department', form.department === d ? '' : d)}
                      style={{ background: form.department === d ? 'rgba(38,60,217,0.12)' : 'transparent', border: `1px solid ${form.department === d ? '#263CD9' : 'var(--border)'}`, borderRadius: 20, color: form.department === d ? '#263CD9' : 'var(--text-muted)', fontSize: 11, padding: '3px 10px', cursor: 'pointer', transition: 'background 150ms ease-out, border-color 150ms ease-out, color 150ms ease-out' }}>
                      {d}
                    </button>
                  ))}
                </div>
                <input style={inputStyle} placeholder="или введите свой..." value={form.department} onChange={e => set('department', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Доступ */}
          <div>
            <SectionHeader icon={<Lock size={14} />} title="Доступ в систему" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <div>
                <label style={labelStyle}>Email (логин) *</label>
                <input type="email" style={inputStyle} placeholder="email@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Пароль *</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      type={showPass ? 'text' : 'password'}
                      style={{ ...inputStyle, paddingRight: 36 }}
                      placeholder="Минимум 6 символов"
                      value={form.password}
                      onChange={e => set('password', e.target.value)}
                    />
                    <button onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex' }}>
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <button onClick={() => set('password', genPassword())} title="Сгенерировать пароль"
                    style={{ width: 36, height: 36, background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 13, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
            <button onClick={() => void handleSave()} disabled={saving}
              style={{ flex: 1, height: 40, background: 'var(--accent)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Создание...' : 'Создать сотрудника'}
            </button>
            <button onClick={onClose} style={{ height: 40, padding: '0 21px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>Отмена</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ShiftHistoryTab ───────────────────────────────────────────────────────────

function ShiftHistoryTab({ empId }: { empId: string }) {
  const [shifts, setShifts]   = useState<Shift[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    shiftsApi.getByEmployee(empId)
      .then(data => setShifts(data.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30)))
      .catch(() => setShifts([]))
      .finally(() => setLoading(false))
  }, [empId])

  if (loading) return <div style={{ padding: '21px 18px', fontSize: 13, color: 'var(--text-muted)' }}>Загрузка...</div>
  if (!shifts || shifts.length === 0) return <div style={{ padding: '21px 18px', fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>История смен пуста</div>

  return (
    <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {shifts.map(shift => {
        const checkin = shift.shift_checkins?.find(c => c.checkin_at)
        const sc      = STATUS_COLOR[shift.status]
        const isDone  = shift.status === 'completed'
        return (
          <div key={shift.id} style={{ padding: '8px 10px', background: 'var(--bg-card)', borderRadius: 8, border: `1px solid ${colorBorder(sc, 13)}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{formatShiftDate(shift.date)}</div>
              <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 20, background: colorBg(sc, 10), color: sc, border: `1px solid ${colorBorder(sc, 20)}` }}>{STATUS_LABEL[shift.status]}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={10} />
              {shift.time_start.slice(0, 5)} — {shift.time_end.slice(0, 5)}
              {isDone && checkin && (
                <span style={{ marginLeft: 6, color: 'var(--accent)' }}>
                  <CheckCircle size={10} style={{ verticalAlign: 'middle' }} /> {fmtTime(checkin.checkin_at)} → {fmtTime(checkin.checkout_at)}
                </span>
              )}
            </div>
            {checkin?.location && (
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                <MapPin size={9} />{checkin.location.slice(0, 55)}{checkin.location.length > 55 ? '…' : ''}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── EmployeeCard ─────────────────────────────────────────────────────────────

interface CardProps {
  emp: Employee
  canEdit: boolean
  isOnDuty: boolean
  onUpdated: (emp: Employee) => void
  onDeleted: (id: string) => void
  onContextMenu: (e: React.MouseEvent) => void
}

function EmployeeCard({ emp, canEdit, isOnDuty, onUpdated, onDeleted, onContextMenu }: CardProps) {
  const [tab, setTab]           = useState<'profile' | 'shifts'>('profile')
  const [editing, setEditing]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [form, setForm]         = useState({
    first_name: emp.first_name ?? '', last_name: emp.last_name ?? '', middle_name: emp.middle_name ?? '',
    phone: emp.phone ?? '', birth_date: emp.birth_date ?? '',
    position: emp.position ?? '', department: emp.department ?? '', address: emp.address ?? '',
  })
  const [error, setError] = useState<string | null>(null)

  const setF = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }))
  const color    = avatarColor(emp.full_name)
  const initials = emp.full_name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const posInfo  = POSITIONS.find(p => p.value === emp.position)

  const handleSave = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) { setError('Имя и фамилия обязательны'); return }
    setSaving(true); setError(null)
    try {
      const updated = await employeesApi.update(emp.id, {
        first_name:  form.first_name.trim(),
        last_name:   form.last_name.trim(),
        middle_name: form.middle_name.trim() || null,
        phone:       form.phone || null,
        birth_date:  form.birth_date || null,
        position:    form.position || null,
        department:  form.department || null,
        address:     form.address || null,
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
    if (!confirm('Удалить сотрудника и его аккаунт?')) return
    setDeleting(true)
    try {
      await employeesApi.delete(emp.id)
      onDeleted(emp.id)
    } catch {
      setDeleting(false)
    }
  }

  const tabBtn = (t: 'profile' | 'shifts', label: string) => (
    <button onClick={() => setTab(t)} style={{ flex: 1, height: 28, background: tab === t ? 'var(--bg-card)' : 'transparent', border: 'none', borderRadius: 6, color: tab === t ? 'var(--text)' : 'var(--text-muted)', fontSize: 11, fontWeight: tab === t ? 600 : 400, cursor: 'pointer', transition: 'background 150ms ease-out, color 150ms ease-out' }}>
      {label}
    </button>
  )

  return (
    <div onContextMenu={onContextMenu} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 12px', display: 'flex', gap: 12, alignItems: 'flex-start', borderBottom: '1px solid var(--border)', cursor: 'default' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: colorBg(color, 12), border: `2px solid ${colorBorder(color, 27)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color }}>
            {initials}
          </div>
          {isOnDuty && (
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: '50%', background: 'var(--color-success)', border: '2px solid var(--bg-card)' }} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.full_name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
            {posInfo && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20, background: colorBg(posInfo.color, 10), color: posInfo.color, border: `1px solid ${colorBorder(posInfo.color, 20)}` }}>
                {posInfo.label}
              </span>
            )}
            {isOnDuty && (
              <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 20, background: 'var(--color-success-muted)', color: 'var(--color-success)', border: '1px solid color-mix(in srgb, var(--color-success) 30%, transparent)' }}>
                На смене
              </span>
            )}
          </div>
          {emp.phone && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Phone size={10} />{emp.phone}
            </div>
          )}
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button onClick={() => { setEditing(e => !e); setTab('profile'); setError(null) }}
              style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text-muted)', cursor: 'pointer' }}>
              <Pencil size={11} />
            </button>
            <button onClick={() => void handleDelete()} disabled={deleting}
              style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid color-mix(in srgb, var(--color-danger) 25%, transparent)', borderRadius: 7, color: 'var(--color-danger)', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.5 : 1 }}>
              <Trash2 size={11} />
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ padding: '6px 12px', display: 'flex', gap: 4, background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
        {tabBtn('profile', 'Профиль')}
        {tabBtn('shifts', 'Смены')}
      </div>

      {/* Profile tab — view */}
      {tab === 'profile' && !editing && (
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {emp.birth_date && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--text-secondary)' }}>
              <Calendar size={11} color="var(--text-muted)" style={{ flexShrink: 0 }} />{formatDate(emp.birth_date)}
            </div>
          )}
          {emp.address && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--text-secondary)' }}>
              <MapPin size={11} color="var(--text-muted)" style={{ flexShrink: 0 }} />{emp.address}
            </div>
          )}
          {emp.department && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--text-secondary)' }}>
              <Building2 size={11} color="var(--text-muted)" style={{ flexShrink: 0 }} />{emp.department}
            </div>
          )}
          {!emp.birth_date && !emp.address && !emp.department && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Доп. данные не заполнены</div>
          )}
        </div>
      )}

      {/* Profile tab — edit */}
      {tab === 'profile' && editing && (
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {error && <div style={{ fontSize: 11, color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: 5 }}><AlertCircle size={11} />{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <input style={{ ...inputStyle, height: 30, fontSize: 12 }} placeholder="Имя *" value={form.first_name} onChange={e => setF('first_name', e.target.value)} />
            <input style={{ ...inputStyle, height: 30, fontSize: 12 }} placeholder="Фамилия *" value={form.last_name} onChange={e => setF('last_name', e.target.value)} />
          </div>
          <input style={{ ...inputStyle, height: 30, fontSize: 12 }} placeholder="Отчество" value={form.middle_name} onChange={e => setF('middle_name', e.target.value)} />
          <input style={{ ...inputStyle, height: 30, fontSize: 12 }} placeholder="Телефон" value={form.phone} onChange={e => setF('phone', e.target.value)} />
          <input type="date" style={{ ...inputStyle, height: 30, fontSize: 12 }} value={form.birth_date} onChange={e => setF('birth_date', e.target.value)} />
          <input style={{ ...inputStyle, height: 30, fontSize: 12 }} placeholder="Адрес" value={form.address} onChange={e => setF('address', e.target.value)} />
          <input style={{ ...inputStyle, height: 30, fontSize: 12 }} placeholder="Должность" value={form.position} onChange={e => setF('position', e.target.value)} />
          <input style={{ ...inputStyle, height: 30, fontSize: 12 }} placeholder="Отдел" value={form.department} onChange={e => setF('department', e.target.value)} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setEditing(false); setError(null) }} style={{ flex: 1, height: 30, background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer' }}>Отмена</button>
            <button onClick={() => void handleSave()} disabled={saving} style={{ flex: 2, height: 30, background: 'var(--accent)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 11, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
      )}

      {tab === 'shifts' && <ShiftHistoryTab empId={emp.id} />}
    </div>
  )
}

// ─── EmployeesPage ─────────────────────────────────────────────────────────────

interface EmpCtxMenu { x: number; y: number; emp: Employee }

export default function EmployeesPage() {
  const { user }                  = useAuth()
  const { canCreateEmployee }     = usePermissions()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [todayShifts, setTodayShifts] = useState<Shift[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [showAdd, setShowAdd]     = useState(false)
  const [successInfo, setSuccessInfo] = useState<{ emp: Employee; email: string; password: string } | null>(null)
  const [ctxMenu, setCtxMenu]     = useState<EmpCtxMenu | null>(null)

  const canEdit = user?.role === 'developer' || user?.role === 'owner' || user?.role === 'franchisee'
  const today   = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    const load = async () => {
      try {
        const [emps, shifts] = await Promise.all([
          employeesApi.getAll(),
          shiftsApi.getWeek(today, today),
        ])
        setEmployees(emps)
        setTodayShifts(shifts)
      } catch {
        setError('Не удалось загрузить сотрудников')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [today])

  const onDutyIds = new Set(todayShifts.filter(s => s.status === 'active').map(s => s.employee_id))

  const handleDeleteEmp = async (id: string) => {
    if (!confirm('Удалить сотрудника и его аккаунт?')) return
    try {
      await employeesApi.delete(id)
      setEmployees(prev => prev.filter(e => e.id !== id))
    } catch {
      setError('Не удалось удалить сотрудника')
    }
  }

  const buildCtxItems = (emp: Employee): ContextMenuEntry[] => {
    const items: ContextMenuEntry[] = [
      { label: 'Открыть карточку', icon: <Eye size={13} />, onClick: () => { /* card already visible as grid item */ } },
      { label: 'Редактировать', icon: <Pencil size={13} />, onClick: () => { /* handled inline */ } },
    ]
    if (canEdit) {
      items.push({ separator: true })
      items.push({ label: 'Удалить', icon: <Trash2 size={13} />, onClick: () => void handleDeleteEmp(emp.id), danger: true })
    }
    return items
  }

  const handleAdded = (emp: Employee, email: string, password: string) => {
    setEmployees(prev => [...prev, emp].sort((a, b) => a.full_name.localeCompare(b.full_name)))
    setShowAdd(false)
    setSuccessInfo({ emp, email, password })
  }
  const handleUpdated = (emp: Employee) => setEmployees(prev => prev.map(e => e.id === emp.id ? emp : e))
  const handleDeleted = (id: string)    => setEmployees(prev => prev.filter(e => e.id !== id))

  return (
    <div>
      <PageHeader
        title="Сотрудники"
        subtitle={`${loading ? '' : `${employees.length} чел. · `}Управление персоналом${onDutyIds.size > 0 ? ` · ${onDutyIds.size} на смене` : ''}`}
        actions={canCreateEmployee('staff') ? (
          <button onClick={() => setShowAdd(true)} className="btn btn-primary" style={{ gap: 6 }}>
            <Plus size={15} />Добавить сотрудника
          </button>
        ) : undefined}
      />

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', background: 'color-mix(in srgb, var(--color-danger) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--color-danger) 20%, transparent)', borderRadius: 8, marginBottom: 21, fontSize: 12, color: 'var(--color-danger)' }}>
          <AlertCircle size={13} />{error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 13 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : employees.length === 0 ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 55, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 13, textAlign: 'center' }}>
          <Briefcase size={28} strokeWidth={1.5} color="var(--text-muted)" />
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>Сотрудников нет</div>
            {canEdit && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 5 }}>Нажмите «Добавить» чтобы создать первого</div>}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 13 }}>
          {employees.map(emp => (
            <EmployeeCard
              key={emp.id} emp={emp} canEdit={canEdit}
              isOnDuty={onDutyIds.has(emp.id)}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
              onContextMenu={e => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, emp }) }}
            />
          ))}
        </div>
      )}

      {showAdd && <AddEmployeeModal onClose={() => setShowAdd(false)} onSaved={handleAdded} />}
      {successInfo && (
        <SuccessModal
          email={successInfo.email}
          password={successInfo.password}
          name={successInfo.emp.full_name}
          onClose={() => setSuccessInfo(null)}
        />
      )}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={buildCtxItems(ctxMenu.emp)}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  )
}
