import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Users, Search, Plus, X, AlertCircle, Phone, Mail, Calendar,
  Edit2, Trash2, CreditCard, Eye, FileText, MoreVertical, History,
  Download, Tag, Cake, Snowflake, CheckCircle2, Clock, TrendingUp,
} from 'lucide-react'
import { clientsApi } from '../../api/clients.api'
import { subscriptionsApi } from '../../api/subscriptions.api'
import { api } from '../../lib/api'
import { ContextMenu, type ContextMenuEntry } from '../../components/ContextMenu'
import { useAuth } from '../../hooks/useAuth'
import type { Client, ClientDetail, ClientBooking, Subscription, AuditLogEntry, SubscriptionRenewal } from '../../types'

const DEVICE_TYPE_LABELS: Record<string, string> = {
  vacuactiv: 'VacuActiv', rollshape: 'RollShape', infrastep: 'InfraStep', infrashape: 'InfraShape',
}
const DEVICE_TYPE_COLORS: Record<string, string> = {
  vacuactiv: '#02BDB6', rollshape: '#263CD9', infrastep: '#8b5cf6', infrashape: '#f59e0b',
}
const SUB_STATUS_COLOR: Record<string, string> = { active: '#10b981', frozen: '#f59e0b', expired: '#71717A', cancelled: '#ef4444' }
const SUB_STATUS_LABEL: Record<string, string> = { active: 'Активный', frozen: 'Заморожен', expired: 'Истёк', cancelled: 'Отменён' }

const CLIENT_SOURCES = [
  { value: '', label: 'Не указан' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'site', label: 'Сайт' },
  { value: 'recommendation', label: 'Рекомендация' },
  { value: 'lead', label: 'Лид' },
  { value: 'call', label: 'Обзвон' },
  { value: 'other', label: 'Другое' },
]

const SOURCE_LABELS: Record<string, string> = {
  instagram: 'Instagram', site: 'Сайт', recommendation: 'Рекомендация',
  lead: 'Лид', call: 'Обзвон', other: 'Другое', manual: 'Вручную', whatsapp: 'WhatsApp',
}

const PRESET_TAGS = ['VIP', 'Пробный', 'Реферал', 'Корпоративный', 'Онлайн']

const TAG_COLORS: Record<string, string> = {
  'VIP': '#f59e0b', 'Пробный': '#3b82f6', 'Реферал': '#10b981',
  'Корпоративный': '#8b5cf6', 'Онлайн': '#06b6d4',
}

function isTodayBirthday(birthDate: string | null): boolean {
  if (!birthDate) return false
  const bd = new Date(birthDate + 'T00:00:00')
  const now = new Date()
  return bd.getDate() === now.getDate() && bd.getMonth() === now.getMonth()
}

function calcAge(birthDate: string): number {
  const bd = new Date(birthDate + 'T00:00:00')
  const now = new Date()
  let age = now.getFullYear() - bd.getFullYear()
  if (now.getMonth() < bd.getMonth() || (now.getMonth() === bd.getMonth() && now.getDate() < bd.getDate())) age--
  return age
}

const inputStyle: React.CSSProperties = {
  height: 40, padding: '0 13px', background: 'var(--bg-elevated)',
  border: '1px solid var(--glass-border)', borderRadius: 8,
  color: 'var(--text-primary)', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }

// ─── ClientModal (create/edit) ────────────────────────────────────────────────

interface ClientModalProps { initial?: Client | null; onClose: () => void; onSave: (c: Client) => void }

function ClientModal({ initial, onClose, onSave }: ClientModalProps) {
  const [fullName,  setFullName]  = useState(initial?.full_name  ?? '')
  const [phone,     setPhone]     = useState(initial?.phone      ?? '')
  const [email,     setEmail]     = useState(initial?.email      ?? '')
  const [birthDate, setBirthDate] = useState(initial?.birth_date ?? '')
  const [notes,     setNotes]     = useState(initial?.notes      ?? '')
  const [source,    setSource]    = useState(initial?.source     ?? '')
  const [tags,      setTags]      = useState<string[]>(initial?.tags ?? [])
  const [tagInput,  setTagInput]  = useState('')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const addTag = (t: string) => {
    const trimmed = t.trim()
    if (trimmed && !tags.includes(trimmed)) setTags(prev => [...prev, trimmed])
    setTagInput('')
  }
  const removeTag = (t: string) => setTags(prev => prev.filter(x => x !== t))

  const handleSubmit = async () => {
    if (!fullName.trim()) { setError('Введите имя клиента'); return }
    setSaving(true); setError(null)
    try {
      const payload = {
        full_name:  fullName.trim(),
        phone:      phone.trim()  || null,
        email:      email.trim()  || null,
        birth_date: birthDate     || null,
        notes:      notes.trim()  || null,
        source:     source        || null,
        tags:       tags.length   ? tags : null,
      }
      const result = initial ? await clientsApi.update(initial.id, payload) : await clientsApi.create(payload)
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
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div className="modal-animate" style={{ position: 'relative', width: '100%', maxWidth: 480, background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 34, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 21, paddingBottom: 21, borderBottom: '1px solid var(--glass-border)' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{initial ? 'Редактировать клиента' : 'Новый клиент'}</div>
            {initial && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{initial.full_name}</div>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}><X size={18} /></button>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 21, fontSize: 12, color: '#ef4444' }}>
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
            <label style={labelStyle}>Источник</label>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={source} onChange={e => setSource(e.target.value)}>
              {CLIENT_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Теги</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
              {PRESET_TAGS.map(t => (
                <button key={t} type="button" onClick={() => tags.includes(t) ? removeTag(t) : addTag(t)}
                  style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, cursor: 'pointer', border: `1px solid ${tags.includes(t) ? (TAG_COLORS[t] ?? '#02BDB6') : 'var(--glass-border)'}`, background: tags.includes(t) ? `${TAG_COLORS[t] ?? '#02BDB6'}18` : 'transparent', color: tags.includes(t) ? (TAG_COLORS[t] ?? '#02BDB6') : 'var(--text-secondary)' }}>
                  {t}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input style={{ ...inputStyle, height: 34 }} placeholder="Свой тег..." value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput) } }} />
              <button type="button" onClick={() => addTag(tagInput)} style={{ height: 34, padding: '0 10px', background: 'rgba(2,189,182,0.12)', border: '1px solid rgba(2,189,182,0.3)', borderRadius: 8, color: '#02BDB6', fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>+</button>
            </div>
            {tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                {tags.map(t => (
                  <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, fontSize: 11, background: `${TAG_COLORS[t] ?? '#02BDB6'}18`, border: `1px solid ${TAG_COLORS[t] ?? '#02BDB6'}33`, color: TAG_COLORS[t] ?? '#02BDB6' }}>
                    {t}<button type="button" onClick={() => removeTag(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'inherit', opacity: 0.7 }}><X size={9} /></button>
                  </span>
                ))}
              </div>
            )}
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
            <button onClick={() => void handleSubmit()} disabled={saving}
              style={{ flex: 1, height: 40, background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Сохранение...' : initial ? 'Сохранить' : 'Добавить клиента'}
            </button>
            <button onClick={onClose}
              style={{ height: 40, padding: '0 21px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── SubProgressBar ───────────────────────────────────────────────────────────

function SubProgressBar({ used, total, color }: { used: number; total: number | null; color: string }) {
  if (!total) return null
  const pct = Math.min(100, Math.round((used / total) * 100))
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Использовано</span>
        <span style={{ fontSize: 10, fontWeight: 600, color }}>{used}/{total}</span>
      </div>
      <div style={{ height: 4, borderRadius: 4, background: 'var(--glass-border)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

// ─── ClientDetailModal ────────────────────────────────────────────────────────

type DetailTab = 'profile' | 'visits' | 'subs' | 'history'

const CANCELLATION_REASONS = [
  { value: 'changed_mind', label: 'Клиент передумал' },
  { value: 'moving',       label: 'Переезд' },
  { value: 'finances',     label: 'Финансы' },
  { value: 'health',       label: 'Здоровье' },
  { value: 'other',        label: 'Другое' },
]

interface ClientDetailModalProps {
  client: Client
  onClose: () => void
  onEdit: () => void
  onSellSub: () => void
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  create_from_lead:   'Создан из лида',
  cancel_subscription: 'Абонемент отменён',
  cancel_booking:     'Бронь снята',
  create_booking:     'Бронь создана',
  reschedule_booking: 'Бронь перенесена',
}

function ClientDetailModal({ client, onClose, onEdit, onSellSub }: ClientDetailModalProps) {
  const { user } = useAuth()
  const [tab,             setTab]          = useState<DetailTab>('profile')
  const [detail,          setDetail]       = useState<ClientDetail | null>(null)
  const [loadingDetail,   setLoadingDetail] = useState(true)
  const [auditLog,        setAuditLog]     = useState<AuditLogEntry[] | null>(null)
  const [loadingAudit,    setLoadAudit]    = useState(false)

  const canManage = user?.role === 'developer' || user?.role === 'owner' || user?.role === 'franchisee'

  const [freezeSubTarget, setFreezeSubTarget] = useState<Subscription | null>(null)
  const [cancelSubId,     setCancelSubId]     = useState<string | null>(null)
  const [renewalsTarget,  setRenewalsTarget]  = useState<Subscription | null>(null)
  const [showFreezeClient, setShowFreezeClient] = useState(false)

  const loadDetail = useCallback(async () => {
    setLoadingDetail(true)
    try {
      const d = await clientsApi.getById(client.id)
      setDetail(d)
    } catch {
      setDetail(null)
    } finally {
      setLoadingDetail(false)
    }
  }, [client.id])

  useEffect(() => { void loadDetail() }, [loadDetail])

  const loadAuditLog = useCallback(() => {
    if (auditLog !== null || loadingAudit) return
    setLoadAudit(true)
    api.get('/audit-log', { params: { entity_id: client.id } })
      .then(res => setAuditLog((res.data as AuditLogEntry[]) ?? []))
      .catch(() => setAuditLog([]))
      .finally(() => setLoadAudit(false))
  }, [client.id, auditLog, loadingAudit])

  useEffect(() => {
    if (tab === 'history') loadAuditLog()
  }, [tab, loadAuditLog])

  const handleUnfreezeSub = async (subId: string) => {
    try {
      await subscriptionsApi.unfreeze(subId)
      await loadDetail()
    } catch { /* ignore */ }
  }

  const currentClient = detail ?? client
  const subs        = detail?.subscriptions ?? []
  const bookings    = detail?.bookings      ?? []
  const leadCmts    = detail?.lead_comments ?? []
  const activeSubs  = subs.filter(s => s.status === 'active')
  const pastSubs    = subs.filter(s => s.status !== 'active')

  // Stats
  const totalVisits    = bookings.length
  const attendedVisits = bookings.filter(b => b.attended).length
  const lastVisit      = bookings[0]?.date ?? null
  const totalSpent     = subs.reduce((acc, s) => acc + (s.price ?? 0), 0)
  const activeSubEnd   = activeSubs[0]?.date_end ?? null

  const initials = client.full_name.charAt(0).toUpperCase()
  const isFrozen = currentClient.status === 'frozen'

  const tabBtn = (t: DetailTab, label: string, icon: React.ReactNode) => (
    <button onClick={() => setTab(t)} style={{
      flex: 1, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
      background: tab === t ? 'rgba(2,189,182,0.10)' : 'transparent',
      border: 'none', borderRadius: 8,
      color: tab === t ? '#02BDB6' : 'var(--text-muted)',
      fontSize: 12, fontWeight: tab === t ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s',
    }}>
      {icon}{label}
    </button>
  )

  return (
    <>
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div className="modal-animate" style={{ position: 'relative', width: '100%', maxWidth: 540, background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 21, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>

        {/* Header */}
        <div style={{ padding: 34, paddingBottom: 21, borderBottom: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13, marginBottom: 21 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: isFrozen ? 'rgba(99,102,241,0.12)' : 'rgba(2,189,182,0.12)', border: `2px solid ${isFrozen ? 'rgba(99,102,241,0.3)' : 'rgba(2,189,182,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: isFrozen ? '#6366f1' : '#02BDB6', flexShrink: 0 }}>
              {isFrozen ? <Snowflake size={22} /> : initials}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                {client.full_name}
                {isFrozen && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#6366f1' }}>Заморожен</span>}
              </div>
              {client.phone && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>{client.phone}</div>}
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                В базе с {new Date(client.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                {isFrozen && currentClient.freeze_until && ` · заморожен до ${new Date(currentClient.freeze_until + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={onEdit}
                style={{ display: 'flex', alignItems: 'center', gap: 5, height: 30, padding: '0 11px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}>
                <Edit2 size={12} />Изменить
              </button>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-surface)', borderRadius: 10, padding: 4 }}>
            {tabBtn('profile', 'Профиль', <Eye size={12} />)}
            {tabBtn('visits',  'Визиты',  <CheckCircle2 size={12} />)}
            {tabBtn('subs',    'Абонементы', <CreditCard size={12} />)}
            {tabBtn('history', 'История', <FileText size={12} />)}
          </div>
        </div>

        {loadingDetail && (
          <div style={{ padding: 34, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>Загрузка...</div>
        )}

        {/* Profile tab */}
        {!loadingDetail && tab === 'profile' && (
          <div style={{ padding: 34, display: 'flex', flexDirection: 'column', gap: 13, maxHeight: 460, overflowY: 'auto' }}>
            {/* Stats block */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              <div style={{ padding: '10px 13px', background: 'var(--bg-surface)', borderRadius: 13, textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#02BDB6' }}>{totalVisits}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Визитов</div>
              </div>
              <div style={{ padding: '10px 13px', background: 'var(--bg-surface)', borderRadius: 13, textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#10b981' }}>{activeSubs.length}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Активных</div>
              </div>
              <div style={{ padding: '10px 13px', background: 'var(--bg-surface)', borderRadius: 13, textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {lastVisit ? new Date(lastVisit + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '—'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Посл. визит</div>
              </div>
              <div style={{ padding: '10px 13px', background: 'var(--bg-surface)', borderRadius: 13, textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {totalSpent > 0 ? `${totalSpent.toLocaleString('ru-RU')}` : '—'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Потрачено ₸</div>
              </div>
            </div>
            {activeSubEnd && (
              <div style={{ padding: '8px 13px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, fontSize: 12, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={12} />
                Активный абонемент до {new Date(activeSubEnd + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
              {client.phone && (
                <div style={{ padding: 13, background: 'var(--bg-surface)', borderRadius: 13 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>Телефон</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Phone size={12} color="var(--text-muted)" />{client.phone}
                  </div>
                </div>
              )}
              {client.email && (
                <div style={{ padding: 13, background: 'var(--bg-surface)', borderRadius: 13 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>Email</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Mail size={12} color="var(--text-muted)" />{client.email}
                  </div>
                </div>
              )}
              {client.birth_date && (
                <div style={{ padding: 13, background: 'var(--bg-surface)', borderRadius: 13 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>Дата рождения</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={12} color="var(--text-muted)" />
                    {new Date(client.birth_date + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({calcAge(client.birth_date)} лет)</span>
                  </div>
                </div>
              )}
              {client.source && (
                <div style={{ padding: 13, background: 'var(--bg-surface)', borderRadius: 13 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>Источник</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{SOURCE_LABELS[client.source] ?? client.source}</div>
                </div>
              )}
            </div>
            {client.notes && (
              <div style={{ padding: 13, background: 'var(--bg-surface)', borderRadius: 13 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Заметки</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{client.notes}</div>
              </div>
            )}
            {client.tags && client.tags.length > 0 && (
              <div style={{ padding: 13, background: 'var(--bg-surface)', borderRadius: 13 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Теги</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {client.tags.map(t => (
                    <span key={t} style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, background: `${TAG_COLORS[t] ?? '#02BDB6'}18`, border: `1px solid ${TAG_COLORS[t] ?? '#02BDB6'}33`, color: TAG_COLORS[t] ?? '#02BDB6' }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div style={{ display: 'flex', gap: 8, paddingTop: 8, borderTop: '1px solid var(--glass-border)', flexWrap: 'wrap' }}>
              <button onClick={onSellSub}
                style={{ flex: 1, minWidth: 140, height: 36, background: 'rgba(2,189,182,0.10)', border: '1px solid rgba(2,189,182,0.25)', borderRadius: 8, color: '#02BDB6', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <CreditCard size={13} />Продать абонемент
              </button>
              {canManage && !isFrozen && (
                <button onClick={() => setShowFreezeClient(true)}
                  style={{ height: 36, padding: '0 13px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 8, color: '#6366f1', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Snowflake size={13} />Заморозить
                </button>
              )}
              {canManage && isFrozen && (
                <button onClick={async () => { await clientsApi.unfreeze(client.id); await loadDetail() }}
                  style={{ height: 36, padding: '0 13px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, color: '#10b981', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TrendingUp size={13} />Разморозить
                </button>
              )}
            </div>
          </div>
        )}

        {/* Visits tab */}
        {!loadingDetail && tab === 'visits' && (
          <div style={{ padding: 34, maxHeight: 460, overflowY: 'auto' }}>
            {bookings.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '21px 0', textAlign: 'center' }}>
                <CheckCircle2 size={24} strokeWidth={1.5} color="var(--text-muted)" />
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Визитов пока нет</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                  {attendedVisits} из {totalVisits} посещено
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {bookings.map((b: ClientBooking) => {
                    const deviceLabel = b.slot?.device ? DEVICE_TYPE_LABELS[b.slot.device.type] ?? b.slot.device.type : null
                    const timeLabel   = b.slot ? `${b.slot.time_start.slice(0, 5)}–${b.slot.time_end.slice(0, 5)}` : null
                    return (
                      <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', background: 'var(--bg-surface)', borderRadius: 10, border: '1px solid var(--glass-border)' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: b.attended ? 'rgba(16,185,129,0.12)' : b.attended === false ? 'rgba(239,68,68,0.10)' : 'rgba(113,113,122,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <CheckCircle2 size={14} color={b.attended ? '#10b981' : b.attended === false ? '#ef4444' : '#71717A'} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                            {new Date(b.date + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 8 }}>
                            {timeLabel && <span>{timeLabel}</span>}
                            {deviceLabel && <span>· {deviceLabel} {b.slot?.device?.number && `#${b.slot.device.number}`}</span>}
                          </div>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: b.attended ? 'rgba(16,185,129,0.10)' : b.attended === false ? 'rgba(239,68,68,0.08)' : 'rgba(113,113,122,0.08)', color: b.attended ? '#10b981' : b.attended === false ? '#ef4444' : '#71717A', border: `1px solid ${b.attended ? 'rgba(16,185,129,0.2)' : b.attended === false ? 'rgba(239,68,68,0.2)' : 'rgba(113,113,122,0.2)'}` }}>
                          {b.attended ? 'Посетил' : b.attended === false ? 'Не пришёл' : 'Запись'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Subscriptions tab */}
        {!loadingDetail && tab === 'subs' && (
          <div style={{ padding: 34, maxHeight: 460, overflowY: 'auto' }}>
            {subs.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '21px 0', textAlign: 'center' }}>
                <CreditCard size={24} strokeWidth={1.5} color="var(--text-muted)" />
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Абонементов нет</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {activeSubs.length > 0 && (
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Активные</div>
                )}
                {activeSubs.map(sub => (
                  <SubCard key={sub.id} sub={sub}
                    onDelete={canManage ? () => setCancelSubId(sub.id) : undefined}
                    onFreeze={canManage ? setFreezeSubTarget : undefined}
                    onUnfreeze={canManage ? (id) => void handleUnfreezeSub(id) : undefined}
                    onShowRenewals={setRenewalsTarget}
                  />
                ))}
                {pastSubs.length > 0 && (
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 8, marginBottom: 4 }}>Прошлые</div>
                )}
                {pastSubs.map(sub => (
                  <SubCard key={sub.id} sub={sub}
                    onDelete={canManage ? () => setCancelSubId(sub.id) : undefined}
                    onShowRenewals={setRenewalsTarget}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* History tab */}
        {!loadingDetail && tab === 'history' && (
          <div style={{ padding: 34, maxHeight: 460, overflowY: 'auto' }}>
            {(loadingAudit && leadCmts.length === 0) ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '21px 0' }}>Загрузка...</div>
            ) : (auditLog?.length === 0 && leadCmts.length === 0) ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '21px 0', textAlign: 'center' }}>
                <History size={24} strokeWidth={1.5} color="var(--text-muted)" />
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>История пуста</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {leadCmts.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Комментарии менеджеров</div>
                    {leadCmts.map(c => (
                      <div key={c.id} style={{ padding: '10px 13px', background: 'rgba(2,189,182,0.04)', borderRadius: 10, border: '1px solid rgba(2,189,182,0.15)' }}>
                        <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5 }}>{c.text}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                          {new Date(c.created_at).toLocaleDateString('ru-RU')}
                          {c.profiles?.full_name && ` · ${c.profiles.full_name}`}
                        </div>
                      </div>
                    ))}
                    {(auditLog ?? []).length > 0 && <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 8, marginBottom: 4 }}>Действия</div>}
                  </>
                )}
                {(auditLog ?? []).map(entry => {
                  const d = new Date(entry.created_at)
                  const dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
                  const timeStr = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
                  const actionLabel = AUDIT_ACTION_LABELS[entry.action] ?? entry.action
                  return (
                    <div key={entry.id} style={{ padding: '10px 13px', background: 'var(--bg-surface)', borderRadius: 10, border: '1px solid var(--glass-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{actionLabel}</div>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{timeStr}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>
                        {dateStr}{entry.actor_name ? ` · ${entry.actor_name}` : ''}
                      </div>
                      {entry.details && Object.keys(entry.details).length > 0 && (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'monospace' }}>
                          {JSON.stringify(entry.details)}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {/* Sub modals */}
    {freezeSubTarget && (
      <FreezeModal
        sub={freezeSubTarget}
        onClose={() => setFreezeSubTarget(null)}
        onFrozen={async () => { setFreezeSubTarget(null); await loadDetail() }}
      />
    )}
    {cancelSubId && (
      <CancelSubModal
        subId={cancelSubId}
        onClose={() => setCancelSubId(null)}
        onCancelled={async () => { setCancelSubId(null); setAuditLog(null); await loadDetail() }}
      />
    )}
    {renewalsTarget && (
      <RenewalsModal sub={renewalsTarget} onClose={() => setRenewalsTarget(null)} />
    )}
    {showFreezeClient && (
      <FreezeClientModal
        client={client}
        onClose={() => setShowFreezeClient(false)}
        onFrozen={async () => { setShowFreezeClient(false); await loadDetail() }}
      />
    )}
    </>
  )
}

interface SubCardProps {
  sub: Subscription
  onDelete?: () => void
  onFreeze?: (sub: Subscription) => void
  onUnfreeze?: (id: string) => void
  onShowRenewals?: (sub: Subscription) => void
}

function SubCard({ sub, onDelete, onFreeze, onUnfreeze, onShowRenewals }: SubCardProps) {
  const sc = SUB_STATUS_COLOR[sub.status]
  const frozenLabel = sub.status === 'frozen' && sub.frozen_until
    ? `До ${new Date(sub.frozen_until + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`
    : null

  return (
    <div style={{ padding: 13, background: 'var(--bg-surface)', borderRadius: 13, border: `1px solid ${sc}22` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{sub.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: sc + '18', color: sc, border: `1px solid ${sc}33` }}>
            {frozenLabel ?? SUB_STATUS_LABEL[sub.status]}
          </span>
          {onFreeze && sub.status === 'active' && (
            <button onClick={() => onFreeze(sub)} title="Заморозить" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.25)', cursor: 'pointer', padding: 0, fontSize: 10 }}>
              ❄
            </button>
          )}
          {onUnfreeze && sub.status === 'frozen' && (
            <button onClick={() => onUnfreeze(sub.id)} title="Разморозить" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6, background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.25)', cursor: 'pointer', padding: 0, fontSize: 10 }}>
              ☀
            </button>
          )}
          {onShowRenewals && (
            <button onClick={() => onShowRenewals(sub)} title="История продлений" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6, background: 'rgba(2,189,182,0.10)', border: '1px solid rgba(2,189,182,0.25)', cursor: 'pointer', padding: 0 }}>
              <History size={11} color="#02BDB6" />
            </button>
          )}
          {onDelete && sub.status !== 'cancelled' && (
            <button onClick={onDelete} title="Отменить абонемент" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer', padding: 0 }}>
              <Trash2 size={11} color="#ef4444" />
            </button>
          )}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Слот 1 — {DEVICE_TYPE_LABELS[sub.slot_1_type]}</div>
          <SubProgressBar used={sub.slot_1_sessions_total - sub.slot_1_sessions_left} total={sub.slot_1_sessions_total} color={DEVICE_TYPE_COLORS[sub.slot_1_type]} />
          <div style={{ fontSize: 11, color: DEVICE_TYPE_COLORS[sub.slot_1_type], marginTop: 3 }}>
            {sub.slot_1_sessions_left} из {sub.slot_1_sessions_total} осталось
          </div>
        </div>
        {sub.slot_2_type && sub.slot_2_sessions_left !== null && sub.slot_2_sessions_total !== null && (
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Слот 2 — {DEVICE_TYPE_LABELS[sub.slot_2_type]}</div>
            <SubProgressBar used={sub.slot_2_sessions_total - sub.slot_2_sessions_left} total={sub.slot_2_sessions_total} color={DEVICE_TYPE_COLORS[sub.slot_2_type]} />
            <div style={{ fontSize: 11, color: DEVICE_TYPE_COLORS[sub.slot_2_type], marginTop: 3 }}>
              {sub.slot_2_sessions_left} из {sub.slot_2_sessions_total} осталось
            </div>
          </div>
        )}
      </div>
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--glass-border)', display: 'flex', gap: 13, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
        <span>С {new Date(sub.date_start).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
        {sub.date_end && <span>По {new Date(sub.date_end).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
        {sub.price != null && <span>· {sub.price.toLocaleString('ru-RU')} ₸</span>}
        {sub.cancellation_reason && <span>· Причина: {CANCELLATION_REASONS.find(r => r.value === sub.cancellation_reason)?.label ?? sub.cancellation_reason}</span>}
      </div>
    </div>
  )
}

// ─── FreezeModal ─────────────────────────────────────────────────────────────

function FreezeModal({ sub, onClose, onFrozen }: { sub: Subscription; onClose: () => void; onFrozen: () => void }) {
  const today = new Date()
  const maxDate = new Date(today); maxDate.setDate(today.getDate() + 30)
  const [frozenUntil, setFrozenUntil] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handle = async () => {
    if (!frozenUntil) { setError('Выберите дату окончания заморозки'); return }
    setSaving(true); setError(null)
    try {
      await subscriptionsApi.freeze(sub.id, frozenUntil)
      onFrozen()
    } catch { setError('Ошибка при заморозке') } finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div className="modal-animate" style={{ position: 'relative', width: '100%', maxWidth: 380, background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 34, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 21, paddingBottom: 21, borderBottom: '1px solid var(--glass-border)' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Заморозить абонемент</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={16} /></button>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 13 }}>{sub.name}</div>
        {error && <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 13, padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8 }}>{error}</div>}
        <div style={{ marginBottom: 21 }}>
          <label style={labelStyle}>Заморозить до (макс. 30 дней)</label>
          <input type="date" style={inputStyle}
            min={today.toISOString().split('T')[0]}
            max={maxDate.toISOString().split('T')[0]}
            value={frozenUntil}
            onChange={e => setFrozenUntil(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => void handle()} disabled={saving} style={{ flex: 1, height: 40, background: '#f59e0b', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Заморозка...' : 'Заморозить'}
          </button>
          <button onClick={onClose} style={{ height: 40, padding: '0 21px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>Отмена</button>
        </div>
      </div>
    </div>
  )
}

// ─── CancelSubModal ───────────────────────────────────────────────────────────

function CancelSubModal({ subId, onClose, onCancelled }: { subId: string; onClose: () => void; onCancelled: () => void }) {
  const [reason, setReason] = useState('')
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  const handle = async () => {
    setSaving(true)
    try {
      await subscriptionsApi.patch(subId, { status: 'cancelled', cancellation_reason: reason || undefined })
      onCancelled()
    } catch { /* ignore */ } finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div className="modal-animate" style={{ position: 'relative', width: '100%', maxWidth: 400, background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 34, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 21, paddingBottom: 21, borderBottom: '1px solid var(--glass-border)' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Причина отмены</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 21 }}>
          {CANCELLATION_REASONS.map(r => (
            <button key={r.value} onClick={() => setReason(r.value)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 13px', background: reason === r.value ? 'rgba(239,68,68,0.08)' : 'transparent', border: `1px solid ${reason === r.value ? 'rgba(239,68,68,0.35)' : 'var(--glass-border)'}`, borderRadius: 8, color: reason === r.value ? '#ef4444' : 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
              {r.label}
            </button>
          ))}
          <textarea style={{ ...inputStyle, height: 60, paddingTop: 8, paddingBottom: 8, resize: 'none' }} placeholder="Комментарий (необязательно)..." value={comment} onChange={e => setComment(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => void handle()} disabled={saving} style={{ flex: 1, height: 40, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 8, color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Отмена...' : 'Отменить абонемент'}
          </button>
          <button onClick={onClose} style={{ height: 40, padding: '0 21px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>Закрыть</button>
        </div>
      </div>
    </div>
  )
}

// ─── RenewalsModal ────────────────────────────────────────────────────────────

function RenewalsModal({ sub, onClose }: { sub: Subscription; onClose: () => void }) {
  const [renewals, setRenewals] = useState<SubscriptionRenewal[] | null>(null)
  useEffect(() => {
    subscriptionsApi.getRenewals(sub.id)
      .then(setRenewals)
      .catch(() => setRenewals([]))
  }, [sub.id])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div className="modal-animate" style={{ position: 'relative', width: '100%', maxWidth: 480, background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 34, boxShadow: '0 24px 64px rgba(0,0,0,0.5)', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 21, paddingBottom: 21, borderBottom: '1px solid var(--glass-border)', flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>История продлений · {sub.name}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={16} /></button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {renewals === null ? (
            <div style={{ textAlign: 'center', padding: 34, fontSize: 13, color: 'var(--text-muted)' }}>Загрузка...</div>
          ) : renewals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 34, fontSize: 13, color: 'var(--text-muted)' }}>История продлений пуста</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {renewals.map(r => (
                <div key={r.id} style={{ padding: '10px 13px', background: 'var(--bg-surface)', borderRadius: 10, border: '1px solid var(--glass-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{new Date(r.created_at).toLocaleDateString('ru-RU')}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.profiles?.full_name ?? '—'}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    {r.old_date_end && <span>Было до: {new Date(r.old_date_end).toLocaleDateString('ru-RU')} → </span>}
                    {r.new_date_end && <span>Стало до: {new Date(r.new_date_end).toLocaleDateString('ru-RU')}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── FreezeClientModal ───────────────────────────────────────────────────────

function FreezeClientModal({ client, onClose, onFrozen }: { client: Client; onClose: () => void; onFrozen: () => void }) {
  const today = new Date()
  const maxDate = new Date(today); maxDate.setDate(today.getDate() + 90)
  const [freezeUntil, setFreezeUntil] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handle = async () => {
    if (!freezeUntil) { setError('Выберите дату окончания заморозки'); return }
    setSaving(true); setError(null)
    try {
      await clientsApi.freeze(client.id, freezeUntil)
      onFrozen()
    } catch { setError('Ошибка при заморозке клиента') } finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div className="modal-animate" style={{ position: 'relative', width: '100%', maxWidth: 380, background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 34, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 21, paddingBottom: 21, borderBottom: '1px solid var(--glass-border)' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Заморозить клиента</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={16} /></button>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 13 }}>{client.full_name}</div>
        {error && <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 13, padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8 }}>{error}</div>}
        <div style={{ marginBottom: 21 }}>
          <label style={labelStyle}>Заморозить до (макс. 90 дней)</label>
          <input type="date" style={inputStyle}
            min={today.toISOString().split('T')[0]}
            max={maxDate.toISOString().split('T')[0]}
            value={freezeUntil}
            onChange={e => setFreezeUntil(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => void handle()} disabled={saving} style={{ flex: 1, height: 40, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)', borderRadius: 8, color: '#6366f1', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Snowflake size={13} />{saving ? 'Заморозка...' : 'Заморозить'}
          </button>
          <button onClick={onClose} style={{ height: 40, padding: '0 21px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>Отмена</button>
        </div>
      </div>
    </div>
  )
}

// ─── ClientRow ────────────────────────────────────────────────────────────────

interface ClientRowProps {
  client: Client
  onClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
}

function ClientRow({ client, onClick, onContextMenu }: ClientRowProps) {
  const [hovered, setHovered] = useState(false)
  const activeSub = client.memberships?.find(m => m.status === 'active')

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(255,255,255,0.04)' : 'var(--glass-bg)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--glass-border)',
        borderRadius: 13, padding: '13px 21px',
        display: 'flex', alignItems: 'center', gap: 13,
        cursor: 'pointer', transition: 'background 0.15s',
      }}
    >
      {/* Avatar */}
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(2,189,182,0.12)', border: '1px solid rgba(2,189,182,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#02BDB6' }}>
          {client.full_name.charAt(0).toUpperCase()}
        </span>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {client.full_name}
          </span>
          {isTodayBirthday(client.birth_date ?? null) && (
            <span title="День рождения сегодня!" style={{ fontSize: 14, flexShrink: 0 }}>🎂</span>
          )}
          {client.tags && client.tags.slice(0, 2).map(t => (
            <span key={t} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: `${TAG_COLORS[t] ?? '#02BDB6'}18`, border: `1px solid ${TAG_COLORS[t] ?? '#02BDB6'}33`, color: TAG_COLORS[t] ?? '#02BDB6', flexShrink: 0 }}>
              {t}
            </span>
          ))}
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
              {new Date(client.birth_date + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
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

      {/* More icon hint */}
      <div style={{ color: 'var(--text-muted)', opacity: hovered ? 0.6 : 0.2, transition: 'opacity 0.15s', flexShrink: 0 }}>
        <MoreVertical size={15} />
      </div>
    </div>
  )
}

// ─── ClientsPage ──────────────────────────────────────────────────────────────

interface CtxMenu { x: number; y: number; client: Client }

export default function ClientsPage() {
  const [clients,      setClients]     = useState<Client[]>([])
  const [loading,      setLoading]     = useState(true)
  const [error,        setError]       = useState<string | null>(null)
  const [search,       setSearch]      = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [filterTags,   setFilterTags]  = useState<string[]>([])
  const [showModal,    setShowModal]   = useState(false)
  const [editTarget,   setEditTarget]  = useState<Client | null>(null)
  const [viewTarget,   setViewTarget]  = useState<Client | null>(null)
  const [ctxMenu,      setCtxMenu]     = useState<CtxMenu | null>(null)

  const load = async (q?: string) => {
    setLoading(true); setError(null)
    try {
      setClients(await clientsApi.getAll(q))
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Не удалось загрузить клиентов')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const handleSearch = (q: string) => { setSearch(q); void load(q || undefined) }

  const toggleFilterTag = (t: string) => {
    setFilterTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  const filtered = clients.filter(c => {
    if (filterSource && c.source !== filterSource) return false
    if (filterTags.length && !filterTags.every(t => c.tags?.includes(t))) return false
    return true
  })

  const handleExport = async () => {
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.json_to_sheet(clients.map(c => ({
      'Имя': c.full_name,
      'Телефон': c.phone ?? '',
      'Email': c.email ?? '',
      'Дата рождения': c.birth_date ?? '',
      'Теги': (c.tags ?? []).join(', '),
      'Источник': c.source ? (SOURCE_LABELS[c.source] ?? c.source) : '',
      'Создан': new Date(c.created_at).toLocaleDateString('ru-RU'),
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Клиенты')
    XLSX.writeFile(wb, 'clients.xlsx')
  }

  const handleSave = (c: Client) => {
    if (editTarget) setClients(prev => prev.map(x => x.id === c.id ? c : x))
    else setClients(prev => [c, ...prev])
    setShowModal(false); setEditTarget(null)
  }

  const handleEdit = (c: Client) => {
    setViewTarget(null); setEditTarget(c); setShowModal(true)
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

  const handleSellSub = (c: Client) => {
    setViewTarget(null)
    window.alert(`Продать абонемент клиенту: ${c.full_name}`)
  }

  const buildCtxItems = (c: Client): ContextMenuEntry[] => [
    { label: 'Открыть карточку', icon: <Eye size={13} />,        onClick: () => setViewTarget(c) },
    { label: 'Редактировать',    icon: <Edit2 size={13} />,       onClick: () => handleEdit(c) },
    { label: 'Продать абонемент', icon: <CreditCard size={13} />, onClick: () => handleSellSub(c) },
    { separator: true },
    { label: 'Удалить',          icon: <Trash2 size={13} />,      onClick: () => void handleDelete(c.id), danger: true },
  ]

  const hasFilters = !!filterSource || filterTags.length > 0

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 21, gap: 13 }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text-primary)', margin: 0, marginBottom: 4 }}>Клиенты</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{filtered.length} из {clients.length} клиентов</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => void handleExport()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 13px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}
          >
            <Download size={14} />Excel
          </button>
          <button
            onClick={() => { setEditTarget(null); setShowModal(true) }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 21px', background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
          >
            <Plus size={15} strokeWidth={2} />Добавить клиента
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 13px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 8, marginBottom: 8, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
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

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 13, flexWrap: 'wrap' }}>
        <select
          value={filterSource}
          onChange={e => setFilterSource(e.target.value)}
          style={{ height: 32, padding: '0 8px', background: 'var(--bg-elevated)', border: `1px solid ${filterSource ? '#02BDB6' : 'var(--glass-border)'}`, borderRadius: 8, color: filterSource ? '#02BDB6' : 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', outline: 'none' }}
        >
          <option value="">Все источники</option>
          {CLIENT_SOURCES.filter(s => s.value).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {PRESET_TAGS.map(t => (
          <button key={t} onClick={() => toggleFilterTag(t)}
            style={{ height: 32, padding: '0 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer', border: `1px solid ${filterTags.includes(t) ? (TAG_COLORS[t] ?? '#02BDB6') : 'var(--glass-border)'}`, background: filterTags.includes(t) ? `${TAG_COLORS[t] ?? '#02BDB6'}18` : 'transparent', color: filterTags.includes(t) ? (TAG_COLORS[t] ?? '#02BDB6') : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Tag size={10} />{t}
          </button>
        ))}
        {hasFilters && (
          <button onClick={() => { setFilterSource(''); setFilterTags([]) }}
            style={{ height: 32, padding: '0 10px', borderRadius: 8, fontSize: 11, cursor: 'pointer', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
            <X size={10} />Сбросить
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
      ) : filtered.length === 0 ? (
        <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 55, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: 300 }}>
          <div style={{ width: 56, height: 56, borderRadius: 21, background: 'rgba(2,189,182,0.08)', border: '1px solid rgba(2,189,182,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 13 }}>
            <Users size={24} strokeWidth={1.5} color="#02BDB6" />
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>
            {search || hasFilters ? 'Ничего не найдено' : 'Клиентов пока нет'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 300, lineHeight: 1.6 }}>
            {search || hasFilters ? 'Попробуйте изменить фильтры' : 'Нажмите «Добавить клиента» чтобы создать первого'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map(c => (
            <ClientRow
              key={c.id}
              client={c}
              onClick={() => setViewTarget(c)}
              onContextMenu={e => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, client: c }) }}
            />
          ))}
        </div>
      )}

      {showModal && (
        <ClientModal initial={editTarget} onClose={() => { setShowModal(false); setEditTarget(null) }} onSave={handleSave} />
      )}
      {viewTarget && (
        <ClientDetailModal
          client={viewTarget}
          onClose={() => setViewTarget(null)}
          onEdit={() => handleEdit(viewTarget)}
          onSellSub={() => handleSellSub(viewTarget)}
        />
      )}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={buildCtxItems(ctxMenu.client)}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  )
}
