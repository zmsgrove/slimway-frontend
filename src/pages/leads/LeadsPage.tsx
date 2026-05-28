import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, X, MessageCircle, Phone, User, AlertCircle,
  ChevronRight, Trash2, Edit2, Check, ChevronLeft,
  UserPlus,
} from 'lucide-react'
import { leadsApi } from '../../api/leads.api'
import { employeesApi } from '../../api/employees.api'
import { clientsApi } from '../../api/clients.api'
import { useAuth } from '../../hooks/useAuth'
import { ContextMenu, type ContextMenuEntry } from '../../components/ContextMenu'
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
  manual:    'Вручную',
  whatsapp:  'WhatsApp',
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 36, padding: '0 13px',
  background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)',
  borderRadius: 8, color: 'var(--text-primary)', fontSize: 13,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}
const textareaStyle: React.CSSProperties = {
  width: '100%', padding: '8px 13px',
  background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)',
  borderRadius: 8, color: 'var(--text-primary)', fontSize: 13,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  resize: 'vertical', lineHeight: 1.5,
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
        source:    'manual',
      })
      // If not 'new', move to the correct status
      if (initialStatus !== 'new') {
        const updated = await leadsApi.updateStatus(lead.id, initialStatus)
        onCreate(updated)
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div className="modal-animate" style={{ position: 'relative', width: '100%', maxWidth: 440, background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 34, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 21, paddingBottom: 21, borderBottom: '1px solid var(--glass-border)' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Новый лид</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 21, fontSize: 12, color: '#ef4444' }}>
            <AlertCircle size={13} />{error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Имя *</div>
            <input style={inputStyle} placeholder="Имя клиента" value={fullName} onChange={e => setFullName(e.target.value)} autoFocus />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Телефон</div>
            <input style={inputStyle} placeholder="+7 ..." value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Ответственный</div>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
              <option value="">Не назначен</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Заметки</div>
            <textarea style={textareaStyle} placeholder="Комментарий..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 13, marginTop: 21, paddingTop: 21, borderTop: '1px solid var(--glass-border)' }}>
          <button onClick={() => void handleCreate()} disabled={saving}
            style={{ flex: 1, height: 40, background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Создание...' : 'Создать'}
          </button>
          <button onClick={onClose} style={{ height: 40, padding: '0 21px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
            Отмена
          </button>
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
  const [detail, setDetail]     = useState<Lead>(lead)
  const [activeTab, setActiveTab] = useState<'info' | 'comments'>('info')
  const [comments, setComments] = useState<LeadComment[]>(lead.lead_comments ?? [])
  const [commentText, setCommentText] = useState('')
  const [addingComment, setAddingComment] = useState(false)
  const [editing, setEditing]   = useState(false)
  const [editName, setEditName] = useState(lead.full_name)
  const [editPhone, setEditPhone] = useState(lead.phone ?? '')
  const [editNotes, setEditNotes] = useState(lead.notes ?? '')
  const [editAssigned, setEditAssigned] = useState(lead.assigned_to ?? '')
  const [saving, setSaving]     = useState(false)
  const [movingTo, setMovingTo] = useState<LeadStatus | null>(null)
  const [completeClientId, setCompleteClientId] = useState<string | null>(null)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // load full detail with comments
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

  const handleStatusChange = async (status: LeadStatus) => {
    setMovingTo(status)
    try {
      const updated = await leadsApi.updateStatus(detail.id, status)
      setDetail(updated)
      onUpdate(updated)
      // If success and a new client was created — open complete modal
      if (status === 'success' && updated.client_id && !detail.client_id) {
        setCompleteClientId(updated.client_id)
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
  const assignedEmp = employees.find(e => e.id === detail.assigned_to)

  return (
    <>
    {completeClientId && (
      <CompleteClientModal
        clientId={completeClientId}
        onClose={() => setCompleteClientId(null)}
        onCompleted={() => setCompleteClientId(null)}
      />
    )}
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div className="modal-animate" style={{
        position: 'relative', width: '100%', maxWidth: 680, maxHeight: '90vh',
        background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)',
        borderRadius: 21, boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '21px 34px', borderBottom: '1px solid var(--glass-border)', flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {editing ? (
              <input style={{ ...inputStyle, fontSize: 16, fontWeight: 700, height: 38 }} value={editName} onChange={e => setEditName(e.target.value)} autoFocus />
            ) : (
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{detail.full_name}</div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {detail.phone && <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{detail.phone}</span>}
              {col && (
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: col.color + '18', color: col.color, border: `1px solid ${col.color}33` }}>
                  {col.label}
                </span>
              )}
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{SOURCE_LABELS[detail.source] ?? detail.source}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 13 }}>
            {editing ? (
              <button onClick={() => void handleSave()} disabled={saving}
                style={{ height: 34, padding: '0 13px', background: '#10b981', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                <Check size={14} />
              </button>
            ) : (
              <button onClick={() => setEditing(true)}
                style={{ height: 34, width: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer' }}>
                <Edit2 size={14} />
              </button>
            )}
            <button onClick={() => { if (confirm('Удалить лид?')) { onDelete(detail.id) } }}
              style={{ height: 34, width: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', cursor: 'pointer' }}>
              <Trash2 size={14} />
            </button>
            <button onClick={onClose} style={{ height: 34, width: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={14} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left panel */}
          <div style={{ width: 280, borderRight: '1px solid var(--glass-border)', padding: 21, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 21, flexShrink: 0 }}>

            {/* Status */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Статус</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {COLUMNS.map(c => (
                  <button key={c.id} onClick={() => void handleStatusChange(c.id)} disabled={movingTo !== null}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 10px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                      background: detail.status === c.id ? c.color + '18' : 'transparent',
                      border: `1px solid ${detail.status === c.id ? c.color + '55' : 'var(--glass-border)'}`,
                      color: detail.status === c.id ? c.color : 'var(--text-secondary)',
                      transition: 'all 0.15s', textAlign: 'left',
                      opacity: movingTo !== null && movingTo !== c.id ? 0.5 : 1,
                    }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                    {c.label}
                    {movingTo === c.id && <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>...</span>}
                    {detail.status === c.id && movingTo === null && <Check size={12} style={{ marginLeft: 'auto' }} />}
                  </button>
                ))}
              </div>
            </div>

            {/* Phone (edit mode) */}
            {editing && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Телефон</div>
                <input style={inputStyle} value={editPhone} onChange={e => setEditPhone(e.target.value)} />
              </div>
            )}

            {/* Assigned */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Ответственный</div>
              {editing ? (
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={editAssigned} onChange={e => setEditAssigned(e.target.value)}>
                  <option value="">Не назначен</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                </select>
              ) : (
                <div style={{ fontSize: 13, color: assignedEmp ? 'var(--text-primary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <User size={13} color="var(--text-muted)" />
                  {assignedEmp?.full_name ?? 'Не назначен'}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Заметки</div>
              {editing ? (
                <textarea style={textareaStyle} value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={4} />
              ) : (
                <div style={{ fontSize: 13, color: detail.notes ? 'var(--text-secondary)' : 'var(--text-muted)', lineHeight: 1.6 }}>
                  {detail.notes || 'Нет заметок'}
                </div>
              )}
            </div>

            {/* Meta */}
            <div style={{ fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--glass-border)', paddingTop: 13 }}>
              <div>Создан: {fmtDate(detail.created_at)}</div>
              <div>Обновлён: {fmtDate(detail.updated_at)}</div>
            </div>

            {/* Success action */}
            {detail.status === 'success' && detail.client_id && (
              <div style={{ padding: 13, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 13 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#10b981', marginBottom: 4 }}>Клиент создан!</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>Клиент добавлен в базу и ожидает активации.</div>
              </div>
            )}
          </div>

          {/* Right panel — comments */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', flexShrink: 0 }}>
              {(['info', 'comments'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  style={{ flex: 1, padding: '12px 0', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: activeTab === tab ? 600 : 400, color: activeTab === tab ? '#02BDB6' : 'var(--text-secondary)', borderBottom: `2px solid ${activeTab === tab ? '#02BDB6' : 'transparent'}`, transition: 'all 0.15s' }}>
                  {tab === 'info' ? 'Информация' : `Комментарии (${comments.length})`}
                </button>
              ))}
            </div>

            {activeTab === 'info' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: 21 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                  <InfoRow label="Имя" value={detail.full_name} />
                  <InfoRow label="Телефон" value={detail.phone ?? '—'} />
                  <InfoRow label="Источник" value={SOURCE_LABELS[detail.source] ?? detail.source} />
                  <InfoRow label="Статус" value={col?.label ?? detail.status} />
                  <InfoRow label="Ответственный" value={assignedEmp?.full_name ?? 'Не назначен'} />
                  {detail.notes && <InfoRow label="Заметки" value={detail.notes} />}
                  <InfoRow label="Создан" value={fmtDateTime(detail.created_at)} />
                  <InfoRow label="Обновлён" value={fmtDateTime(detail.updated_at)} />
                </div>
              </div>
            )}

            {activeTab === 'comments' && (
              <>
                <div style={{ flex: 1, overflowY: 'auto', padding: 21, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {comments.length === 0 ? (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '34px 0' }}>Комментариев пока нет</div>
                  ) : comments.map(c => (
                    <div key={c.id} style={{ padding: '10px 13px', background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', borderRadius: 13 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#02BDB6' }}>
                          {c.profiles?.full_name ?? 'Сотрудник'}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDateTime(c.created_at)}</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{c.text}</div>
                    </div>
                  ))}
                  <div ref={commentsEndRef} />
                </div>
                <div style={{ padding: '13px 21px', borderTop: '1px solid var(--glass-border)', flexShrink: 0, display: 'flex', gap: 8 }}>
                  <textarea
                    style={{ ...textareaStyle, flex: 1 }}
                    placeholder="Написать комментарий..."
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    rows={2}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleAddComment() } }}
                  />
                  <button onClick={() => void handleAddComment()} disabled={addingComment || !commentText.trim()}
                    style={{ width: 36, height: 36, alignSelf: 'flex-end', background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', cursor: (addingComment || !commentText.trim()) ? 'not-allowed' : 'pointer', opacity: (addingComment || !commentText.trim()) ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 13, paddingBottom: 10, borderBottom: '1px solid var(--glass-border)' }}>
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
  const assignedEmp = employees.find(e => e.id === lead.assigned_to)
  const commentCount = lead.lead_comments?.length ?? 0

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      onContextMenu={onContextMenu}
      style={{
        background: 'var(--bg-surface)',
        border: `1px solid var(--glass-border)`,
        borderRadius: 13,
        padding: 13,
        cursor: 'grab',
        userSelect: 'none',
        opacity: isDragging ? 0.4 : 1,
        boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.08)',
        transform: isDragging ? 'rotate(2deg) scale(1.02)' : 'none',
        transition: 'opacity 0.15s, box-shadow 0.15s, transform 0.15s',
      }}
    >
      {/* Status stripe */}
      <div style={{ width: '100%', height: 3, background: colColor + '60', borderRadius: 2, marginBottom: 10 }} />

      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 5 }}>{lead.full_name}</div>

      {lead.phone && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>
          <Phone size={11} color="var(--text-muted)" />
          {lead.phone}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--glass-border)' }}>
            {SOURCE_LABELS[lead.source] ?? lead.source}
          </span>
          {assignedEmp && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <User size={9} />
              {assignedEmp.full_name.split(' ')[0]}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {commentCount > 0 && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <MessageCircle size={10} />{commentCount}
            </span>
          )}
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fmtDate(lead.created_at)}</span>
        </div>
      </div>
    </div>
  )
}

// ─── CompleteClientModal ──────────────────────────────────────────────────────

interface CompleteClientModalProps {
  clientId: string
  onClose: () => void
  onCompleted: () => void
}

function CompleteClientModal({ clientId, onClose, onCompleted }: CompleteClientModalProps) {
  const [email,     setEmail]     = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [notes,     setNotes]     = useState('')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true); setError(null)
    try {
      await clientsApi.update(clientId, {
        email:      email.trim() || null,
        birth_date: birthDate || null,
        notes:      notes.trim() || null,
        status:     'active',
      } as Parameters<typeof clientsApi.update>[1])
      onCompleted()
    } catch {
      setError('Не удалось сохранить данные клиента')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div className="modal-animate" style={{ position: 'relative', width: '100%', maxWidth: 440, background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 34, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 21, paddingBottom: 21, borderBottom: '1px solid var(--glass-border)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserPlus size={15} color="#10b981" />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Дополните данные клиента</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Клиент создан. Заполните дополнительную информацию.</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, flexShrink: 0 }}><X size={18} /></button>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 21, fontSize: 12, color: '#ef4444' }}>
            <AlertCircle size={13} />{error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Email</div>
            <input style={inputStyle} type="email" placeholder="client@example.com" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Дата рождения</div>
            <input style={inputStyle} type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Заметки</div>
            <textarea style={textareaStyle} placeholder="Дополнительная информация..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 13, marginTop: 21, paddingTop: 21, borderTop: '1px solid var(--glass-border)' }}>
          <button onClick={() => void handleSave()} disabled={saving}
            style={{ flex: 1, height: 40, background: '#10b981', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          <button onClick={onClose}
            style={{ height: 40, padding: '0 21px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
            Пропустить
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── LeadsPage ────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const { user } = useAuth()
  const [leads, setLeads]               = useState<Lead[]>([])
  const [employees, setEmployees]       = useState<Employee[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [createCol, setCreateCol]       = useState<LeadStatus | null>(null)
  const [dragOver, setDragOver]         = useState<LeadStatus | null>(null)
  const [ctxMenu, setCtxMenu]           = useState<{ x: number; y: number; lead: Lead } | null>(null)
  const draggingRef = useRef<Lead | null>(null)

  const canManage = user?.role === 'developer' || user?.role === 'owner' || user?.role === 'franchisee' || user?.role === 'admin' || user?.role === 'staff'

  const loadData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [leadsData, empsData] = await Promise.all([leadsApi.getAll(), employeesApi.getAll()])
      setLeads(leadsData)
      setEmployees(empsData)
    } catch {
      setError('Не удалось загрузить лиды')
    } finally {
      setLoading(false)
    }
  }, [])

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

  const handleDrop = async (e: React.DragEvent, colId: LeadStatus) => {
    e.preventDefault()
    setDragOver(null)
    const lead = draggingRef.current
    draggingRef.current = null
    if (!lead || lead.status === colId) return
    // Optimistic update
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: colId } : l))
    try {
      const updated = await leadsApi.updateStatus(lead.id, colId)
      setLeads(prev => prev.map(l => l.id === lead.id ? updated : l))
    } catch {
      // revert
      setLeads(prev => prev.map(l => l.id === lead.id ? lead : l))
    }
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
  }

  const buildCtxItems = (lead: Lead): ContextMenuEntry[] => [
    { label: 'Открыть карточку', icon: <ChevronRight size={13} />, onClick: () => setSelectedLead(lead) },
    { separator: true } as ContextMenuEntry,
    ...COLUMNS.filter(c => c.id !== lead.status).map(c => ({
      label: `→ ${c.label}`,
      onClick: async () => {
        setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: c.id } : l))
        try {
          const updated = await leadsApi.updateStatus(lead.id, c.id)
          setLeads(prev => prev.map(l => l.id === lead.id ? updated : l))
        } catch {
          setLeads(prev => prev.map(l => l.id === lead.id ? lead : l))
        }
      },
    })),
    { separator: true } as ContextMenuEntry,
    { label: 'Удалить', icon: <Trash2 size={13} />, danger: true, onClick: () => { if (confirm('Удалить лид?')) void handleLeadDelete(lead.id) } },
  ]

  if (loading) {
    return (
      <div>
        <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 21px' }}>Лиды</h1>
        <div style={{ padding: 55, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>Загрузка...</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px - 42px)', minHeight: 0 }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 21, flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text-primary)', margin: 0, marginBottom: 4 }}>Лиды</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            {leads.length} лидов · Воронка продаж
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setCreateCol('new')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 16px', background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={16} />Новый лид
          </button>
        )}
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 13, fontSize: 12, color: '#ef4444', flexShrink: 0 }}>
          <AlertCircle size={13} />{error}
        </div>
      )}

      {/* Kanban board */}
      <div style={{ display: 'flex', gap: 13, flex: 1, minHeight: 0, overflowX: 'auto', paddingBottom: 8 }}>
        {COLUMNS.map(col => {
          const colLeads = leads.filter(l => l.status === col.id)
          const isOver   = dragOver === col.id

          return (
            <div
              key={col.id}
              onDragOver={e => handleDragOver(e, col.id)}
              onDrop={e => void handleDrop(e, col.id)}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null) }}
              style={{
                flex: '1 0 260px',
                minWidth: 260,
                maxWidth: 320,
                display: 'flex',
                flexDirection: 'column',
                background: isOver ? col.color + '08' : 'var(--glass-bg)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: `1px solid ${isOver ? col.color + '55' : 'var(--glass-border)'}`,
                borderRadius: 21,
                overflow: 'hidden',
                transition: 'border-color 0.18s, background 0.18s',
                boxShadow: isOver ? `0 0 0 2px ${col.color}33` : 'none',
              }}>
              {/* Column header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 13px 8px', borderBottom: `1px solid var(--glass-border)`, flexShrink: 0, background: col.color + '08' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: col.color }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: col.color }}>{col.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 20, background: col.color + '22', color: col.color }}>
                    {colLeads.length}
                  </span>
                </div>
                {canManage && (
                  <button onClick={() => setCreateCol(col.id)}
                    style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 6, color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <Plus size={12} />
                  </button>
                )}
              </div>

              {/* Cards scroll area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {colLeads.length === 0 && (
                  <div style={{ fontSize: 12, color: isOver ? col.color : 'var(--text-muted)', textAlign: 'center', padding: '21px 0', border: isOver ? `2px dashed ${col.color}55` : 'none', borderRadius: 8 }}>
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

      {/* Create modal */}
      {createCol && (
        <CreateLeadModal
          initialStatus={createCol}
          employees={employees}
          onClose={() => setCreateCol(null)}
          onCreate={handleLeadCreate}
        />
      )}

      {/* Detail modal */}
      {selectedLead && (
        <LeadModal
          lead={selectedLead}
          employees={employees}
          onClose={() => setSelectedLead(null)}
          onUpdate={handleLeadUpdate}
          onDelete={id => void handleLeadDelete(id)}
        />
      )}

      {/* Context menu */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={buildCtxItems(ctxMenu.lead)}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  )
}
