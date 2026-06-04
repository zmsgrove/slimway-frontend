import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, X, MessageCircle, Phone, User, AlertCircle,
  ChevronRight, Trash2, Edit2, Check, ChevronLeft,
  UserPlus, Download, Clock,
} from 'lucide-react'
import { leadsApi } from '../../api/leads.api'
import { employeesApi } from '../../api/employees.api'
import { useAuth } from '../../hooks/useAuth'
import { playSound } from '../../lib/notify'
import { ContextMenu, type ContextMenuEntry } from '../../components/ContextMenu'
import { PeriodFilter, type PeriodValue } from '../../components/ui/PeriodFilter'
import type { Lead, LeadStatus, LeadComment, Employee } from '../../types'

// ─── Constants ───────────────────────────────────────────────────────────────

const COLUMNS: { id: LeadStatus; label: string; color: string }[] = [
  { id: 'new',     label: 'Новый',          color: '#3b82f6' },
  { id: 'in_work', label: 'В работе',       color: '#f59e0b' },
  { id: 'waiting', label: 'Ждём на филиал', color: '#f97316' },
  { id: 'success', label: 'Успешно',        color: '#10b981' },
  { id: 'fail',    label: 'Не успешно',     color: '#ef4444' },
]

const SOURCE_LABELS: Record<string, string> = {
  manual:         'Вручную',
  whatsapp:       'WhatsApp',
  instagram:      'Instagram',
  tiktok:         'TikTok',
  site:           'Сайт',
  tilda:          'Tilda',
  recommendation: 'Рекомендация',
  call:           'Обзвон',
  other:          'Другое',
}

const LEAD_SOURCES = [
  { value: 'instagram',      label: 'Instagram' },
  { value: 'tiktok',         label: 'TikTok' },
  { value: 'site',           label: 'Сайт' },
  { value: 'tilda',          label: 'Tilda' },
  { value: 'recommendation', label: 'Рекомендация' },
  { value: 'call',           label: 'Обзвон' },
  { value: 'whatsapp',       label: 'WhatsApp' },
  { value: 'manual',         label: 'Вручную' },
  { value: 'other',          label: 'Другое' },
]

function daysInStage(statusChangedAt: string | null | undefined, createdAt: string): number {
  const base = statusChangedAt ?? createdAt
  const diff = Date.now() - new Date(base).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 36, padding: '0 12px',
  background: 'transparent', border: '1px solid var(--border)',
  borderRadius: 8, color: 'var(--text)', fontSize: 13,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  transition: 'border-color 150ms ease-out, box-shadow 150ms ease-out',
}
const textareaStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px',
  background: 'transparent', border: '1px solid var(--border)',
  borderRadius: 8, color: 'var(--text)', fontSize: 13,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  resize: 'vertical', lineHeight: 1.5,
}
const labelStyle: React.CSSProperties = {
  fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, display: 'block',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// ─── CreateLeadModal ──────────────────────────────────────────────────────────

interface CreateLeadModalProps {
  initialStatus?: LeadStatus
  employees: Employee[]
  onClose: () => void
  onCreate: (lead: Lead) => void
}

function CreateLeadModal({ initialStatus = 'new', employees, onClose, onCreate }: CreateLeadModalProps) {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone]       = useState('')
  const [notes, setNotes]       = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [source, setSource]     = useState('manual')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const handleCreate = async () => {
    if (!fullName.trim()) { setError('Введите имя'); return }
    setSaving(true); setError(null)
    try {
      const lead = await leadsApi.create({
        full_name: fullName.trim(),
        phone:     phone.trim() || undefined,
        notes:     notes.trim() || undefined,
        assigned_to: assignedTo || undefined,
        source:    source as Lead['source'],
      })
      if (initialStatus !== 'new') {
        const result = await leadsApi.updateStatus(lead.id, initialStatus)
        onCreate(result.lead)
      } else {
        onCreate(lead)
      }
    } catch {
      setError('Не удалось создать лид')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div className="modal-animate" style={{
        position: 'relative', width: '100%', maxWidth: 440,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>Новый лид</div>
          <button onClick={onClose} className="icon-btn"><X size={16} /></button>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'color-mix(in srgb, #ef4444 8%, transparent)', border: '1px solid color-mix(in srgb, #ef4444 25%, transparent)', borderRadius: 8, marginBottom: 16, fontSize: 12, color: '#ef4444' }}>
            <AlertCircle size={13} />{error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>Имя *</label>
            <input style={inputStyle} placeholder="Имя клиента" value={fullName} onChange={e => setFullName(e.target.value)} autoFocus />
          </div>
          <div>
            <label style={labelStyle}>Телефон</label>
            <input style={inputStyle} placeholder="+7 ..." value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Источник</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={source} onChange={e => setSource(e.target.value)}>
                {LEAD_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Ответственный</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
                <option value="">Не назначен</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Заметки</label>
            <textarea style={textareaStyle} placeholder="Комментарий..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <button onClick={() => void handleCreate()} disabled={saving} className="btn btn-primary" style={{ flex: 1 }}>
            {saving ? 'Создание...' : 'Создать'}
          </button>
          <button onClick={onClose} className="btn btn-secondary">Отмена</button>
        </div>
      </div>
    </div>
  )
}

// ─── LeadModal (detail) ───────────────────────────────────────────────────────

interface LeadModalProps {
  lead: Lead
  employees: Employee[]
  onClose: () => void
  onUpdate: (lead: Lead) => void
  onDelete: (id: string) => void
}

function LeadModal({ lead, employees, onClose, onUpdate, onDelete }: LeadModalProps) {
  const navigate = useNavigate()
  const [detail, setDetail]     = useState<Lead>(lead)
  const [activeTab, setActiveTab] = useState<'info' | 'comments'>('info')
  const [comments, setComments] = useState<LeadComment[]>(lead.lead_comments ?? [])
  const [commentText, setCommentText] = useState('')
  const [addingComment, setAddingComment] = useState(false)
  const [editing, setEditing]   = useState(false)
  const [editName, setEditName] = useState(lead.full_name)
  const [editPhone, setEditPhone] = useState(lead.phone ?? '')
  const [editNotes, setEditNotes] = useState(lead.notes ?? '')
  const [editAssigned, setEditAssigned] = useState(
    () => employees.find(e => e.profile_id === lead.assigned_to)?.id ?? lead.assigned_to ?? ''
  )
  const [saving, setSaving]     = useState(false)
  const [movingTo, setMovingTo] = useState<LeadStatus | null>(null)
  const [showClientAdded, setShowClientAdded] = useState<{ id: string | null; full_name: string | null; phone: string | null } | null>(null)
  const [failReasonPending, setFailReasonPending] = useState(false)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    leadsApi.getById(lead.id)
      .then(d => { setDetail(d); setComments(d.lead_comments ?? []) })
      .catch(() => { /* use cached */ })
  }, [lead.id])

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await leadsApi.update(detail.id, {
        full_name:   editName.trim(),
        phone:       editPhone.trim() || null,
        notes:       editNotes.trim() || null,
        assigned_to: editAssigned || null,
      })
      setDetail(updated)
      onUpdate(updated)
      setEditing(false)
    } catch { /* */ }
    finally { setSaving(false) }
  }

  const handleStatusChange = async (status: LeadStatus, fail_reason?: string) => {
    if (status === 'fail' && fail_reason === undefined) {
      setFailReasonPending(true)
      return
    }
    setMovingTo(status)
    try {
      const result = await leadsApi.updateStatus(detail.id, status, fail_reason)
      const updated = result.lead
      setDetail(updated)
      onUpdate(updated)
      if (status === 'success') {
        setShowClientAdded(result.client
          ? { id: result.client.id, full_name: result.client.full_name, phone: result.client.phone }
          : { id: null, full_name: null, phone: null }
        )
      }
    } catch { /* */ }
    finally { setMovingTo(null) }
  }

  const handleAddComment = async () => {
    if (!commentText.trim()) return
    setAddingComment(true)
    try {
      const c = await leadsApi.addComment(detail.id, commentText.trim())
      setComments(prev => [...prev, c])
      setCommentText('')
    } catch { /* */ }
    finally { setAddingComment(false) }
  }

  const col = COLUMNS.find(c => c.id === detail.status)
  const assignedEmp = employees.find(e => e.profile_id === detail.assigned_to)
    ?? employees.find(e => e.id === detail.assigned_to)

  return (
    <>
    {failReasonPending && (
      <FailReasonModal
        onConfirm={reason => { setFailReasonPending(false); void handleStatusChange('fail', reason) }}
        onClose={() => setFailReasonPending(false)}
      />
    )}
    {showClientAdded !== null && (
      <ClientAddedModal
        clientId={showClientAdded.id}
        clientName={showClientAdded.full_name}
        onGoToClient={() => { const cid = showClientAdded.id; setShowClientAdded(null); if (cid) navigate(`/clients/${cid}`) }}
        onClose={() => setShowClientAdded(null)}
      />
    )}
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div className="modal-animate" style={{
        position: 'relative', width: '100%', maxWidth: 680, maxHeight: '90vh',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {editing ? (
              <input style={{ ...inputStyle, fontSize: 15, fontWeight: 600, height: 36 }} value={editName} onChange={e => setEditName(e.target.value)} autoFocus />
            ) : (
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em', marginBottom: 4 }}>{detail.full_name}</div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {detail.phone && <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{detail.phone}</span>}
              {col && (
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: `color-mix(in srgb, ${col.color} 10%, transparent)`, color: col.color, border: `1px solid color-mix(in srgb, ${col.color} 25%, transparent)` }}>
                  {col.label}
                </span>
              )}
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{SOURCE_LABELS[detail.source] ?? detail.source}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 12 }}>
            {editing ? (
              <button onClick={() => void handleSave()} disabled={saving} className="icon-btn" style={{ background: 'color-mix(in srgb, #10b981 12%, transparent)', color: '#10b981' }}>
                <Check size={14} />
              </button>
            ) : (
              <button onClick={() => setEditing(true)} className="icon-btn"><Edit2 size={14} /></button>
            )}
            <button onClick={() => { if (confirm('Удалить лид?')) { onDelete(detail.id) } }} className="icon-btn" style={{ color: '#ef4444' }}>
              <Trash2 size={14} />
            </button>
            <button onClick={onClose} className="icon-btn"><X size={14} /></button>
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left panel */}
          <div style={{ width: 260, borderRight: '1px solid var(--border)', padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20, flexShrink: 0 }}>

            {/* Status */}
            <div>
              <div className="section-label" style={{ marginBottom: 8 }}>Статус</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {COLUMNS.map(c => (
                  <button key={c.id} onClick={() => void handleStatusChange(c.id)} disabled={movingTo !== null}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 10px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                      background: detail.status === c.id ? `color-mix(in srgb, ${c.color} 10%, transparent)` : 'transparent',
                      border: `1px solid ${detail.status === c.id ? `color-mix(in srgb, ${c.color} 35%, transparent)` : 'var(--border)'}`,
                      color: detail.status === c.id ? c.color : 'var(--text-secondary)',
                      transition: 'background 150ms ease-out, border-color 150ms ease-out',
                      textAlign: 'left',
                      opacity: movingTo !== null && movingTo !== c.id ? 0.5 : 1,
                    }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                    {c.label}
                    {movingTo === c.id && <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>...</span>}
                    {detail.status === c.id && movingTo === null && <Check size={11} style={{ marginLeft: 'auto' }} />}
                  </button>
                ))}
              </div>
            </div>

            {/* Phone (edit mode) */}
            {editing && (
              <div>
                <label style={labelStyle}>Телефон</label>
                <input style={inputStyle} value={editPhone} onChange={e => setEditPhone(e.target.value)} />
              </div>
            )}

            {/* Assigned */}
            <div>
              <div className="section-label" style={{ marginBottom: 8 }}>Ответственный</div>
              {editing ? (
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={editAssigned} onChange={e => setEditAssigned(e.target.value)}>
                  <option value="">Не назначен</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                </select>
              ) : (
                <div style={{ fontSize: 13, color: assignedEmp ? 'var(--text)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <User size={13} color="var(--text-muted)" />
                  {assignedEmp?.full_name ?? 'Не назначен'}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <div className="section-label" style={{ marginBottom: 8 }}>Заметки</div>
              {editing ? (
                <textarea style={textareaStyle} value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={4} />
              ) : (
                <div style={{ fontSize: 13, color: detail.notes ? 'var(--text-secondary)' : 'var(--text-muted)', lineHeight: 1.6 }}>
                  {detail.notes || 'Нет заметок'}
                </div>
              )}
            </div>

            {/* Meta */}
            <div style={{ fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <div>Создан: {fmtDate(detail.created_at)}</div>
              <div>Обновлён: {fmtDate(detail.updated_at)}</div>
            </div>

            {/* Success action */}
            {detail.status === 'success' && detail.client_id && (
              <div style={{ padding: 12, background: 'color-mix(in srgb, #10b981 8%, transparent)', border: '1px solid color-mix(in srgb, #10b981 25%, transparent)', borderRadius: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#10b981', marginBottom: 4 }}>Клиент создан!</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>Клиент добавлен в базу и ожидает активации.</div>
              </div>
            )}
          </div>

          {/* Right panel — comments */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              {(['info', 'comments'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  style={{
                    flex: 1, padding: '12px 0', background: 'transparent', border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: activeTab === tab ? 600 : 400,
                    color: activeTab === tab ? 'var(--accent)' : 'var(--text-secondary)',
                    borderBottom: `2px solid ${activeTab === tab ? 'var(--accent)' : 'transparent'}`,
                    transition: 'color 150ms ease-out, border-color 150ms ease-out',
                  }}>
                  {tab === 'info' ? 'Информация' : `Комментарии (${comments.length})`}
                </button>
              ))}
            </div>

            {activeTab === 'info' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <InfoRow label="Имя" value={detail.full_name} />
                  <InfoRow label="Телефон" value={detail.phone ?? '—'} />
                  <InfoRow label="Источник" value={SOURCE_LABELS[detail.source] ?? detail.source} />
                  <InfoRow label="Статус" value={col?.label ?? detail.status} />
                  <InfoRow label="Ответственный" value={assignedEmp?.full_name ?? 'Не назначен'} />
                  {detail.notes && <InfoRow label="Заметки" value={detail.notes} />}
                  {detail.fail_reason && <InfoRow label="Причина отказа" value={detail.fail_reason} />}
                  <InfoRow label="Создан" value={fmtDateTime(detail.created_at)} />
                  <InfoRow label="Обновлён" value={fmtDateTime(detail.updated_at)} />
                </div>
              </div>
            )}

            {activeTab === 'comments' && (
              <>
                <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {comments.length === 0 ? (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '32px 0' }}>Комментариев пока нет</div>
                  ) : comments.map(c => (
                    <div key={c.id} style={{ padding: '10px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>
                          {c.profiles?.full_name ?? 'Сотрудник'}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDateTime(c.created_at)}</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{c.text}</div>
                    </div>
                  ))}
                  <div ref={commentsEndRef} />
                </div>
                <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', gap: 8 }}>
                  <textarea
                    style={{ ...textareaStyle, flex: 1 }}
                    placeholder="Написать комментарий..."
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    rows={2}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleAddComment() } }}
                  />
                  <button onClick={() => void handleAddComment()} disabled={addingComment || !commentText.trim()}
                    style={{ width: 36, height: 36, alignSelf: 'flex-end', background: 'var(--accent)', border: 'none', borderRadius: 8, color: '#fff', cursor: (addingComment || !commentText.trim()) ? 'not-allowed' : 'pointer', opacity: (addingComment || !commentText.trim()) ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'opacity 150ms' }}>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'right', lineHeight: 1.4 }}>{value}</span>
    </div>
  )
}

// ─── LeadCard ─────────────────────────────────────────────────────────────────

interface LeadCardProps {
  lead: Lead
  colColor: string
  isDragging: boolean
  employees: Employee[]
  onClick: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
  onContextMenu: (e: React.MouseEvent) => void
}

function LeadCard({ lead, colColor, isDragging, employees, onClick, onDragStart, onDragEnd, onContextMenu }: LeadCardProps) {
  const assignedEmp = employees.find(e => e.profile_id === lead.assigned_to)
    ?? employees.find(e => e.id === lead.assigned_to)
  const commentCount = lead.lead_comments?.length ?? 0
  const days = daysInStage(lead.status_changed_at, lead.created_at)
  const stageColor = days >= 7 ? '#ef4444' : days >= 3 ? '#f59e0b' : 'var(--text-muted)'

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      onContextMenu={onContextMenu}
      className="kanban-card"
      style={{
        opacity: isDragging ? 0.35 : 1,
        transform: isDragging ? 'rotate(2deg) scale(1.02)' : 'none',
        borderLeft: `3px solid color-mix(in srgb, ${colColor} 60%, transparent)`,
      }}
    >
      {/* Color bar */}
      <div style={{ width: '100%', height: 2, background: `color-mix(in srgb, ${colColor} 40%, transparent)`, borderRadius: 2, marginBottom: 10 }} />

      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 5, letterSpacing: '-0.01em' }}>
        {lead.full_name}
      </div>

      {lead.phone && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>
          <Phone size={11} color="var(--text-muted)" />
          {lead.phone}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, flexWrap: 'wrap', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 5, background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            {SOURCE_LABELS[lead.source] ?? lead.source}
          </span>
          {assignedEmp && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <User size={9} />
              {assignedEmp.full_name.split(' ')[0]}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 10, color: stageColor, display: 'flex', alignItems: 'center', gap: 3 }}>
            <Clock size={9} />{days}д
          </span>
          {commentCount > 0 && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <MessageCircle size={10} />{commentCount}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── FailReasonModal ──────────────────────────────────────────────────────────

interface FailReasonModalProps {
  onConfirm: (reason: string) => void
  onClose: () => void
}

function FailReasonModal({ onConfirm, onClose }: FailReasonModalProps) {
  const [reason, setReason] = useState('')

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div className="modal-animate" style={{
        position: 'relative', width: '100%', maxWidth: 420,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>Причина отказа</div>
          <button onClick={onClose} className="icon-btn"><X size={16} /></button>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
          Укажите причину, по которой лид не был успешно закрыт.
        </div>
        <textarea
          style={textareaStyle}
          placeholder="Например: не дозвонились, передумал, не подошла цена..."
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={4}
          autoFocus
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={() => onConfirm(reason.trim())} className="btn btn-danger" style={{ flex: 1 }}>
            Подтвердить отказ
          </button>
          <button onClick={onClose} className="btn btn-secondary">Отмена</button>
        </div>
      </div>
    </div>
  )
}

// ─── ClientAddedModal ─────────────────────────────────────────────────────────

interface ClientAddedModalProps {
  clientId: string | null
  clientName: string | null
  onGoToClient: () => void
  onClose: () => void
}

function ClientAddedModal({ clientId, clientName, onGoToClient, onClose }: ClientAddedModalProps) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div className="modal-animate" style={{
        position: 'relative', width: '100%', maxWidth: 380,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 28, boxShadow: '0 24px 64px rgba(0,0,0,0.4)', textAlign: 'center',
      }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: 'color-mix(in srgb, #10b981 12%, transparent)', border: '1px solid color-mix(in srgb, #10b981 25%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <UserPlus size={22} color="#10b981" />
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 12, letterSpacing: '-0.01em' }}>Лид успешно закрыт!</div>
        {clientName ? (
          <>
            <div style={{ marginBottom: 16, padding: '10px 12px', background: 'color-mix(in srgb, #10b981 8%, transparent)', border: '1px solid color-mix(in srgb, #10b981 20%, transparent)', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 3 }}>Создана карточка клиента</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#10b981' }}>{clientName}</div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
              Статус «Черновик». Перейдите в карточку для заполнения данных.
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
            Статус лида обновлён.
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          {clientId && (
            <button onClick={onGoToClient} className="btn btn-primary" style={{ flex: 1, background: '#10b981' }}>
              Перейти к клиенту
            </button>
          )}
          <button onClick={onClose} className="btn btn-secondary" style={{ flex: clientId ? undefined : 1 }}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── LeadsPage ────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [leads, setLeads]               = useState<Lead[]>([])
  const [employees, setEmployees]       = useState<Employee[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [createCol, setCreateCol]       = useState<LeadStatus | null>(null)
  const [dragOver, setDragOver]         = useState<LeadStatus | null>(null)
  const [ctxMenu, setCtxMenu]           = useState<{ x: number; y: number; lead: Lead } | null>(null)
  const [clientAddedModal, setClientAddedModal] = useState<{ id: string | null; full_name: string | null; phone: string | null } | null>(null)
  const [filterSource, setFilterSource] = useState('')
  const [failReasonDrop, setFailReasonDrop] = useState<Lead | null>(null)
  const [period, setPeriod] = useState<PeriodValue | null>(null)
  const draggingRef = useRef<Lead | null>(null)

  const canManage = user?.role === 'developer' || user?.role === 'owner' || user?.role === 'franchisee' || user?.role === 'admin' || user?.role === 'staff'

  const handleExport = async () => {
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.json_to_sheet(leads.map(l => ({
      'Имя': l.full_name,
      'Телефон': l.phone ?? '',
      'Статус': COLUMNS.find(c => c.id === l.status)?.label ?? l.status,
      'Источник': SOURCE_LABELS[l.source] ?? l.source,
      'Ответственный': (employees.find(e => e.profile_id === l.assigned_to) ?? employees.find(e => e.id === l.assigned_to))?.full_name ?? l.assigned_profile?.full_name ?? '',
      'Дней в статусе': daysInStage(l.status_changed_at, l.created_at),
      'Создан': new Date(l.created_at).toLocaleDateString('ru-RU'),
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Лиды')
    XLSX.writeFile(wb, 'leads.xlsx')
  }

  const loadData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [leadsData, empsData] = await Promise.all([
        leadsApi.getAll(period ? { from: period.from, to: period.to } : undefined),
        employeesApi.getAll().catch(() => [] as Employee[]),
      ])
      setLeads(leadsData)
      setEmployees(empsData)
    } catch {
      setError('Не удалось загрузить лиды')
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { void loadData() }, [loadData])

  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    draggingRef.current = lead
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', lead.id)
  }
  const handleDragEnd = () => { draggingRef.current = null; setDragOver(null) }

  const handleDragOver = (e: React.DragEvent, colId: LeadStatus) => {
    e.preventDefault()
    setDragOver(colId)
  }

  const doStatusUpdate = async (lead: Lead, colId: LeadStatus, fail_reason?: string) => {
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: colId } : l))
    try {
      const result = await leadsApi.updateStatus(lead.id, colId, fail_reason)
      setLeads(prev => prev.map(l => l.id === lead.id ? result.lead : l))
      if (colId === 'success') {
        setClientAddedModal(result.client
          ? { id: result.client.id, full_name: result.client.full_name, phone: result.client.phone }
          : { id: null, full_name: null, phone: null }
        )
      }
    } catch {
      setLeads(prev => prev.map(l => l.id === lead.id ? lead : l))
    }
  }

  const handleDrop = (e: React.DragEvent, colId: LeadStatus) => {
    e.preventDefault()
    setDragOver(null)
    const lead = draggingRef.current
    draggingRef.current = null
    if (!lead || lead.status === colId) return
    if (colId === 'fail') {
      setFailReasonDrop(lead)
      return
    }
    void doStatusUpdate(lead, colId)
  }

  const handleLeadUpdate = (updated: Lead) => {
    setLeads(prev => prev.map(l => l.id === updated.id ? updated : l))
    setSelectedLead(updated)
  }

  const handleLeadDelete = async (id: string) => {
    try {
      await leadsApi.delete(id)
      setLeads(prev => prev.filter(l => l.id !== id))
      setSelectedLead(null)
    } catch { /* */ }
  }

  const handleLeadCreate = (lead: Lead) => {
    setLeads(prev => [lead, ...prev])
    setCreateCol(null)
    playSound('new_lead')
  }

  const buildCtxItems = (lead: Lead): ContextMenuEntry[] => [
    { label: 'Открыть карточку', icon: <ChevronRight size={13} />, onClick: () => setSelectedLead(lead) },
    { separator: true } as ContextMenuEntry,
    ...COLUMNS.filter(c => c.id !== lead.status).map(c => ({
      label: `→ ${c.label}`,
      onClick: () => {
        if (c.id === 'fail') { setFailReasonDrop(lead); return }
        void doStatusUpdate(lead, c.id)
      },
    })),
    { separator: true } as ContextMenuEntry,
    { label: 'Удалить', icon: <Trash2 size={13} />, danger: true, onClick: () => { if (confirm('Удалить лид?')) void handleLeadDelete(lead.id) } },
  ]

  if (loading) {
    return (
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', margin: '0 0 20px', letterSpacing: '-0.02em' }}>Лиды</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          {COLUMNS.map((_, i) => (
            <div key={i} className="skeleton" style={{ flex: '1 0 240px', minWidth: 240, height: 400, borderRadius: 12 }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px - 42px)', minHeight: 0 }}>
      {/* Page header */}
      <div style={{ marginBottom: 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', margin: 0, marginBottom: 3, letterSpacing: '-0.02em' }}>Лиды</h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
              {leads.length} лидов · Воронка продаж
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select
              value={filterSource}
              onChange={e => setFilterSource(e.target.value)}
              style={{
                height: 34, padding: '0 10px', background: 'transparent',
                border: `1px solid ${filterSource ? 'color-mix(in srgb, var(--accent) 50%, transparent)' : 'var(--border)'}`,
                borderRadius: 8,
                color: filterSource ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: 12, cursor: 'pointer', outline: 'none', fontFamily: 'inherit',
              }}
            >
              <option value="">Все источники</option>
              {LEAD_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <button onClick={() => void handleExport()} className="btn btn-secondary" style={{ gap: 6 }}>
              <Download size={14} />Excel
            </button>
            {canManage && (
              <button onClick={() => setCreateCol('new')} className="btn btn-primary" style={{ gap: 6 }}>
                <Plus size={15} strokeWidth={2.5} />Новый лид
              </button>
            )}
          </div>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'color-mix(in srgb, #ef4444 8%, transparent)', border: '1px solid color-mix(in srgb, #ef4444 20%, transparent)', borderRadius: 8, marginBottom: 12, fontSize: 12, color: '#ef4444', flexShrink: 0 }}>
          <AlertCircle size={13} />{error}
        </div>
      )}

      {/* Kanban board */}
      <div style={{ display: 'flex', gap: 10, flex: 1, minHeight: 0, overflowX: 'auto', paddingBottom: 8 }}>
        {COLUMNS.map(col => {
          const colLeads = leads.filter(l => l.status === col.id && (!filterSource || l.source === filterSource))
          const isOver   = dragOver === col.id

          return (
            <div
              key={col.id}
              onDragOver={e => handleDragOver(e, col.id)}
              onDrop={e => void handleDrop(e, col.id)}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null) }}
              style={{
                flex: '1 0 240px', minWidth: 240, maxWidth: 300,
                display: 'flex', flexDirection: 'column',
                background: isOver ? `color-mix(in srgb, ${col.color} 5%, var(--bg-card))` : 'var(--bg-card)',
                border: `1px solid ${isOver ? `color-mix(in srgb, ${col.color} 50%, transparent)` : 'var(--border)'}`,
                borderRadius: 12, overflow: 'hidden',
                transition: 'border-color 180ms ease-out, background 180ms ease-out',
                boxShadow: isOver ? `0 0 0 2px color-mix(in srgb, ${col.color} 20%, transparent)` : 'none',
              }}>
              {/* Column header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '11px 12px 8px',
                borderBottom: `1px solid var(--border)`, flexShrink: 0,
                background: `color-mix(in srgb, ${col.color} 5%, transparent)`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: col.color }}>{col.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 20, background: `color-mix(in srgb, ${col.color} 15%, transparent)`, color: col.color, fontVariantNumeric: 'tabular-nums' }}>
                    {colLeads.length}
                  </span>
                </div>
                {canManage && (
                  <button onClick={() => setCreateCol(col.id)} className="icon-btn" style={{ width: 22, height: 22 }}>
                    <Plus size={11} />
                  </button>
                )}
              </div>

              {/* Cards scroll area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {colLeads.length === 0 && (
                  <div style={{ fontSize: 12, color: isOver ? col.color : 'var(--text-muted)', textAlign: 'center', padding: '20px 0', border: isOver ? `2px dashed color-mix(in srgb, ${col.color} 40%, transparent)` : 'none', borderRadius: 8 }}>
                    {isOver ? 'Отпустите здесь' : 'Нет лидов'}
                  </div>
                )}
                {colLeads.map(lead => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    colColor={col.color}
                    isDragging={draggingRef.current?.id === lead.id}
                    employees={employees}
                    onClick={() => setSelectedLead(lead)}
                    onDragStart={e => handleDragStart(e, lead)}
                    onDragEnd={handleDragEnd}
                    onContextMenu={e => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, lead }) }}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {createCol && (
        <CreateLeadModal
          initialStatus={createCol}
          employees={employees}
          onClose={() => setCreateCol(null)}
          onCreate={handleLeadCreate}
        />
      )}

      {selectedLead && (
        <LeadModal
          lead={selectedLead}
          employees={employees}
          onClose={() => setSelectedLead(null)}
          onUpdate={handleLeadUpdate}
          onDelete={id => void handleLeadDelete(id)}
        />
      )}

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={buildCtxItems(ctxMenu.lead)}
          onClose={() => setCtxMenu(null)}
        />
      )}

      {clientAddedModal !== null && (
        <ClientAddedModal
          clientId={clientAddedModal.id}
          clientName={clientAddedModal.full_name}
          onGoToClient={() => { const cid = clientAddedModal.id; setClientAddedModal(null); if (cid) navigate(`/clients/${cid}`) }}
          onClose={() => setClientAddedModal(null)}
        />
      )}

      {failReasonDrop && (
        <FailReasonModal
          onConfirm={reason => { const l = failReasonDrop; setFailReasonDrop(null); void doStatusUpdate(l, 'fail', reason) }}
          onClose={() => { setFailReasonDrop(null) }}
        />
      )}
    </div>
  )
}
