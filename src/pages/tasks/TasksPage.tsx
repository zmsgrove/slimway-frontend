import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, useDroppable, useDraggable,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Plus, X, CheckSquare, MessageSquare, Clock, Flag, Trash2, ChevronDown } from 'lucide-react'
import { tasksApi, type CreateTaskPayload } from '../../api/tasks.api'
import { employeesApi } from '../../api/employees.api'
import { useAuth } from '../../hooks/useAuth'
import { playSound } from '../../lib/notify'
import { ContextMenu, type ContextMenuEntry } from '../../components/ContextMenu'
import type { Task, TaskStatus, TaskPriority, TaskChecklistItem, TaskComment, Employee } from '../../types'

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'new',   label: 'Новые',           color: '#3b82f6' },
  { id: 'today', label: 'Сегодня',         color: '#f59e0b' },
  { id: 'week',  label: 'На неделе',       color: '#8b5cf6' },
  { id: 'long',  label: 'Длительный срок', color: '#06b6d4' },
  { id: 'done',  label: 'Закрытые',        color: '#10b981' },
]

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low:      '#10b981',
  medium:   '#f59e0b',
  high:     '#ef4444',
  critical: '#dc2626',
}

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low:      'Низкий',
  medium:   'Средний',
  high:     'Высокий',
  critical: 'Критический',
}

const inputStyle: React.CSSProperties = {
  height: 36, padding: '0 13px', background: 'var(--bg-elevated)',
  border: '1px solid var(--glass-border)', borderRadius: 8,
  color: 'var(--text-primary)', fontSize: 13, outline: 'none',
  width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
}

const textareaStyle: React.CSSProperties = {
  padding: '8px 13px', background: 'var(--bg-elevated)',
  border: '1px solid var(--glass-border)', borderRadius: 8,
  color: 'var(--text-primary)', fontSize: 13, outline: 'none',
  width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
  resize: 'vertical', lineHeight: 1.5,
}

function fmtDeadline(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  if (diff < 0) return { text: d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }), color: '#ef4444' }
  if (diff < 86400000) return { text: d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }), color: '#f59e0b' }
  return { text: d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }), color: 'var(--text-muted)' }
}

// ─── Draggable Task Card ─────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task
  onClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
  isDragging?: boolean
}

function DraggableCard({ task, onClick, onContextMenu }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id })
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    cursor: 'grab',
  }
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <TaskCardContent task={task} onClick={onClick} onContextMenu={onContextMenu} />
    </div>
  )
}

function TaskCardContent({ task, onClick, onContextMenu, isDragging }: TaskCardProps) {
  const done  = task.task_checklist_items?.filter(c => c.is_done).length ?? 0
  const total = task.task_checklist_items?.length ?? 0
  const comments = task.task_comments?.length ?? 0
  const deadline = task.deadline ? fmtDeadline(task.deadline) : null
  const pColor = PRIORITY_COLORS[task.priority]

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      style={{
        background: 'var(--bg-elevated)',
        border: `1px solid var(--glass-border)`,
        borderLeft: `3px solid ${pColor}`,
        borderRadius: 10, padding: '10px 12px',
        cursor: isDragging ? 'grabbing' : 'pointer',
        transition: 'all 0.15s', userSelect: 'none',
        marginBottom: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4, flex: 1 }}>{task.title}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: pColor, background: `${pColor}18`, border: `1px solid ${pColor}30`, borderRadius: 4, padding: '1px 5px', flexShrink: 0, whiteSpace: 'nowrap' }}>
          {PRIORITY_LABELS[task.priority]}
        </span>
      </div>
      {task.description && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {task.description}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {deadline && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: deadline.color }}>
            <Clock size={10} />
            {deadline.text}
          </span>
        )}
        {comments > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--text-muted)' }}>
            <MessageSquare size={10} />
            {comments}
          </span>
        )}
        {total > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--text-muted)' }}>
            <CheckSquare size={10} />
            {done}/{total}
          </span>
        )}
      </div>
      {total > 0 && (
        <div style={{ marginTop: 6, height: 3, background: 'var(--glass-border)', borderRadius: 2 }}>
          <div style={{ height: '100%', width: `${Math.round((done / total) * 100)}%`, background: '#10b981', borderRadius: 2, transition: 'width 0.3s' }} />
        </div>
      )}
    </div>
  )
}

// ─── Droppable Column ────────────────────────────────────────────────────────

function DroppableColumn({ col, tasks, onAddTask, onClick, onContextMenu }: {
  col: { id: TaskStatus; label: string; color: string }
  tasks: Task[]
  onAddTask: () => void
  onClick: (t: Task) => void
  onContextMenu: (t: Task, e: React.MouseEvent) => void
}) {
  const { isOver, setNodeRef } = useDroppable({ id: col.id })
  return (
    <div
      ref={setNodeRef}
      style={{
        display: 'flex', flexDirection: 'column',
        background: isOver ? `${col.color}0a` : 'var(--bg-surface)',
        border: `1.5px solid ${isOver ? col.color : 'var(--glass-border)'}`,
        borderRadius: 13, overflow: 'hidden', minWidth: 220, width: 240,
        transition: 'all 0.15s', flexShrink: 0,
      }}
    >
      <div style={{ padding: '10px 13px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, display: 'inline-block' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: col.color }}>{col.label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: col.color, background: `${col.color}22`, padding: '1px 7px', borderRadius: 20 }}>{tasks.length}</span>
          <button onClick={onAddTask} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, display: 'flex', lineHeight: 1 }}>
            <Plus size={14} />
          </button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px 8px', minHeight: 100 }}>
        {tasks.map(task => (
          <DraggableCard
            key={task.id}
            task={task}
            onClick={() => onClick(task)}
            onContextMenu={e => onContextMenu(task, e)}
          />
        ))}
        {tasks.length === 0 && (
          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', padding: '21px 0' }}>
            {isOver ? 'Перетащи сюда' : 'Нет задач'}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Create Task Modal ────────────────────────────────────────────────────────

function CreateTaskModal({ employees, defaultStatus, onClose, onCreate }: {
  employees: Employee[]
  defaultStatus?: TaskStatus
  onClose: () => void
  onCreate: (t: Task) => void
}) {
  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [priority,    setPriority]    = useState<TaskPriority>('medium')
  const [status,      setStatus]      = useState<TaskStatus>(defaultStatus ?? 'new')
  const [assignedTo,  setAssignedTo]  = useState('')
  const [deadline,    setDeadline]    = useState('')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const handleCreate = async () => {
    if (!title.trim()) { setError('Введите название'); return }
    setSaving(true); setError(null)
    try {
      const payload: CreateTaskPayload = {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        status,
        assigned_to: assignedTo || null,
        deadline:    deadline || null,
      }
      const task = await tasksApi.create(payload)
      onCreate(task)
    } catch {
      setError('Не удалось создать задачу')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 480, background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 34, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 21 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Новая задача</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
        </div>
        {error && <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 13 }}>{error}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Название *</label>
            <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="Название задачи" autoFocus />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Описание</label>
            <textarea style={{ ...textareaStyle, minHeight: 60 }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Описание (необязательно)" rows={2} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Приоритет</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}>
                {(Object.keys(PRIORITY_LABELS) as TaskPriority[]).map(p => (
                  <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Колонка</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={status} onChange={e => setStatus(e.target.value as TaskStatus)}>
                {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Исполнитель</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
                <option value="">— Не назначен —</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Срок</label>
              <input type="datetime-local" style={{ ...inputStyle, cursor: 'pointer' }} value={deadline} onChange={e => setDeadline(e.target.value)} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 21 }}>
          <button onClick={onClose} style={{ flex: 1, height: 40, background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>Отмена</button>
          <button onClick={() => void handleCreate()} disabled={saving} style={{ flex: 2, height: 40, background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Создание...' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Task Modal ────────────────────────────────────────────────────────────────

function TaskModal({ task: initialTask, employees, onClose, onUpdate, onDelete }: {
  task: Task
  employees: Employee[]
  onClose: () => void
  onUpdate: (t: Task) => void
  onDelete: (id: string) => void
}) {
  const { user } = useAuth()
  const [task,         setTask]         = useState<Task>(initialTask)
  const [tab,          setTab]          = useState<'main' | 'checklist' | 'comments'>('main')
  const [newCheckText, setNewCheckText] = useState('')
  const [newComment,   setNewComment]   = useState('')
  const [saving,       setSaving]       = useState(false)
  const [checkItems,   setCheckItems]   = useState<TaskChecklistItem[]>(initialTask.task_checklist_items ?? [])
  const [comments,     setComments]     = useState<TaskComment[]>(initialTask.task_comments ?? [])

  const canEdit = user?.role === 'developer' || user?.role === 'owner' ||
                  user?.role === 'franchisee' || user?.role === 'admin' ||
                  task.created_by === user?.id

  const save = async (patch: Partial<Task>) => {
    setSaving(true)
    try {
      const updated = await tasksApi.patch(task.id, patch)
      setTask(prev => ({ ...prev, ...updated }))
      onUpdate({ ...task, ...updated })
    } catch { /* ignore */ } finally { setSaving(false) }
  }

  const handleAddCheckItem = async () => {
    if (!newCheckText.trim()) return
    try {
      const item = await tasksApi.addChecklistItem(task.id, newCheckText.trim())
      setCheckItems(prev => [...prev, item])
      setNewCheckText('')
    } catch { /* ignore */ }
  }

  const handleToggleCheck = async (item: TaskChecklistItem) => {
    try {
      const updated = await tasksApi.toggleChecklistItem(task.id, item.id, !item.is_done)
      setCheckItems(prev => prev.map(c => c.id === item.id ? updated : c))
    } catch { /* ignore */ }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return
    try {
      const comment = await tasksApi.addComment(task.id, newComment.trim())
      setComments(prev => [...prev, comment])
      setNewComment('')
    } catch { /* ignore */ }
  }

  const doneCount = checkItems.filter(c => c.is_done).length

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 640, maxHeight: '88vh', background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 21, boxShadow: '0 24px 64px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '21px 21px 13px', borderBottom: '1px solid var(--glass-border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 13, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              {canEdit ? (
                <input
                  value={task.title}
                  onChange={e => setTask(p => ({ ...p, title: e.target.value }))}
                  onBlur={() => void save({ title: task.title })}
                  style={{ ...inputStyle, fontSize: 17, fontWeight: 700, height: 40, background: 'transparent', border: '1px solid transparent', borderRadius: 8 }}
                />
              ) : (
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', padding: '8px 0' }}>{task.title}</div>
              )}
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, flexShrink: 0 }}><X size={18} /></button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: PRIORITY_COLORS[task.priority], background: `${PRIORITY_COLORS[task.priority]}18`, border: `1px solid ${PRIORITY_COLORS[task.priority]}30`, borderRadius: 6, padding: '2px 8px' }}>
              <Flag size={9} style={{ marginRight: 3 }} />
              {PRIORITY_LABELS[task.priority]}
            </span>
            {saving && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Сохранение...</span>}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', flexShrink: 0 }}>
          {[
            { id: 'main',      label: 'Основное' },
            { id: 'checklist', label: `Чеклист${checkItems.length > 0 ? ` (${doneCount}/${checkItems.length})` : ''}` },
            { id: 'comments',  label: `Комментарии${comments.length > 0 ? ` (${comments.length})` : ''}` },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: `2px solid ${tab === t.id ? '#02BDB6' : 'transparent'}`, color: tab === t.id ? '#02BDB6' : 'var(--text-secondary)', fontSize: 12, padding: '10px 8px', cursor: 'pointer', transition: 'all 0.15s' }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 21 }}>
          {tab === 'main' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Описание</label>
                {canEdit ? (
                  <textarea
                    value={task.description ?? ''}
                    onChange={e => setTask(p => ({ ...p, description: e.target.value }))}
                    onBlur={() => void save({ description: task.description })}
                    style={{ ...textareaStyle, minHeight: 72 }}
                    placeholder="Описание задачи..."
                    rows={3}
                  />
                ) : (
                  <div style={{ fontSize: 13, color: task.description ? 'var(--text-primary)' : 'var(--text-muted)', lineHeight: 1.6 }}>{task.description || 'Нет описания'}</div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Приоритет</label>
                  {canEdit ? (
                    <select style={{ ...inputStyle, cursor: 'pointer' }} value={task.priority} onChange={e => void save({ priority: e.target.value as TaskPriority })}>
                      {(Object.keys(PRIORITY_LABELS) as TaskPriority[]).map(p => (
                        <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ fontSize: 13, fontWeight: 600, color: PRIORITY_COLORS[task.priority] }}>{PRIORITY_LABELS[task.priority]}</div>
                  )}
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Статус</label>
                  {canEdit ? (
                    <select style={{ ...inputStyle, cursor: 'pointer' }} value={task.status} onChange={e => void save({ status: e.target.value as TaskStatus })}>
                      {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{COLUMNS.find(c => c.id === task.status)?.label}</div>
                  )}
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Исполнитель</label>
                  {canEdit ? (
                    <select style={{ ...inputStyle, cursor: 'pointer' }} value={task.assigned_to ?? ''} onChange={e => void save({ assigned_to: e.target.value || null })}>
                      <option value="">— Не назначен —</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                    </select>
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                      {employees.find(e => e.id === task.assigned_to)?.full_name ?? '—'}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Срок</label>
                  {canEdit ? (
                    <input type="datetime-local" style={{ ...inputStyle, cursor: 'pointer' }}
                      value={task.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : ''}
                      onChange={e => void save({ deadline: e.target.value || null })}
                    />
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                      {task.deadline ? new Date(task.deadline).toLocaleString('ru-RU') : 'Не указан'}
                    </div>
                  )}
                </div>
              </div>
              {canEdit && (
                <button
                  onClick={() => { if (confirm('Удалить задачу?')) onDelete(task.id) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#ef4444', fontSize: 12, cursor: 'pointer', marginTop: 8, width: 'fit-content' }}
                >
                  <Trash2 size={13} />Удалить задачу
                </button>
              )}
            </div>
          )}

          {tab === 'checklist' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {checkItems.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ height: 4, background: 'var(--glass-border)', borderRadius: 2, marginBottom: 6 }}>
                    <div style={{ height: '100%', width: `${Math.round((doneCount / checkItems.length) * 100)}%`, background: '#10b981', borderRadius: 2, transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>{doneCount}/{checkItems.length} выполнено</div>
                </div>
              )}
              {checkItems.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: item.is_done ? 'rgba(16,185,129,0.06)' : 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--glass-border)' }}>
                  <input type="checkbox" checked={item.is_done} onChange={() => void handleToggleCheck(item)} style={{ accentColor: '#10b981', width: 15, height: 15, cursor: 'pointer' }} />
                  <span style={{ fontSize: 13, color: item.is_done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: item.is_done ? 'line-through' : 'none', flex: 1 }}>{item.text}</span>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input
                  style={inputStyle}
                  value={newCheckText}
                  onChange={e => setNewCheckText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') void handleAddCheckItem() }}
                  placeholder="Новый пункт чеклиста..."
                />
                <button onClick={() => void handleAddCheckItem()}
                  style={{ height: 36, padding: '0 13px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, color: '#10b981', fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>
                  +
                </button>
              </div>
            </div>
          )}

          {tab === 'comments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {comments.length === 0 && (
                <div style={{ textAlign: 'center', padding: 34, fontSize: 13, color: 'var(--text-muted)' }}>Нет комментариев</div>
              )}
              {comments.map(c => (
                <div key={c.id} style={{ padding: '10px 13px', background: 'var(--bg-surface)', borderRadius: 10, border: '1px solid var(--glass-border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                    {new Date(c.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>{c.text}</div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input
                  style={inputStyle}
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) void handleAddComment() }}
                  placeholder="Написать комментарий..."
                />
                <button onClick={() => void handleAddComment()} disabled={!newComment.trim()}
                  style={{ height: 36, padding: '0 13px', background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, cursor: newComment.trim() ? 'pointer' : 'default', flexShrink: 0, opacity: newComment.trim() ? 1 : 0.5 }}>
                  ➤
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main TasksPage ────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [tasks,         setTasks]         = useState<Task[]>([])
  const [loading,       setLoading]       = useState(true)
  const [employees,     setEmployees]     = useState<Employee[]>([])
  const [selectedTask,  setSelectedTask]  = useState<Task | null>(null)
  const [showCreate,    setShowCreate]    = useState(false)
  const [createStatus,  setCreateStatus]  = useState<TaskStatus>('new')
  const [activeId,      setActiveId]      = useState<string | null>(null)
  const [ctxMenu,       setCtxMenu]       = useState<{ task: Task; x: number; y: number } | null>(null)
  const [search,        setSearch]        = useState('')
  const [filterPri,     setFilterPri]     = useState<TaskPriority | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const loadTasks = useCallback(async () => {
    try {
      const data = await tasksApi.getAll()
      setTasks(data)
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    void loadTasks()
    employeesApi.getAll().then(setEmployees).catch(() => { /* ignore */ })
  }, [loadTasks])

  useEffect(() => {
    const close = () => setCtxMenu(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  const getColTasks = (colId: TaskStatus) =>
    tasks.filter(t => {
      if (t.status !== colId) return false
      if (filterPri && t.priority !== filterPri) return false
      if (search) {
        const q = search.toLowerCase()
        if (!t.title.toLowerCase().includes(q)) return false
      }
      return true
    })

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over) return
    const taskId = active.id as string
    const newStatus = over.id as TaskStatus
    const task = tasks.find(t => t.id === taskId)
    if (!task || task.status === newStatus) return
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    try {
      await tasksApi.updateStatus(taskId, newStatus)
    } catch {
      void loadTasks()
    }
  }

  const handleTaskCreate = (task: Task) => {
    setTasks(prev => [task, ...prev])
    setShowCreate(false)
    playSound('new_task')
  }

  const handleTaskUpdate = (updated: Task) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t))
    setSelectedTask(updated)
  }

  const handleTaskDelete = async (id: string) => {
    try {
      await tasksApi.delete(id)
      setTasks(prev => prev.filter(t => t.id !== id))
      setSelectedTask(null)
    } catch { /* ignore */ }
  }

  const buildCtxItems = (task: Task): ContextMenuEntry[] => [
    { label: 'Открыть', onClick: () => { setSelectedTask(task); setCtxMenu(null) } },
    { label: 'Закрыть задачу', onClick: async () => {
      await tasksApi.updateStatus(task.id, 'done')
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'done' } : t))
      setCtxMenu(null)
    }},
    { label: 'Высокий приоритет', onClick: async () => {
      await tasksApi.patch(task.id, { priority: 'high' })
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, priority: 'high' } : t))
      setCtxMenu(null)
    }},
    { label: 'Удалить', danger: true, onClick: () => { void handleTaskDelete(task.id); setCtxMenu(null) } },
  ]

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Загрузка...</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px - 42px)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 13, marginBottom: 13, flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text-primary)', margin: 0, marginBottom: 2 }}>Задачи</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Канбан доска</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <input
              style={{ ...inputStyle, width: 200, paddingLeft: 30 }}
              placeholder="Поиск задач..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 13 }}>🔍</span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['high', 'medium', 'low'] as TaskPriority[]).map(p => (
              <button
                key={p}
                onClick={() => setFilterPri(filterPri === p ? null : p)}
                style={{
                  height: 36, padding: '0 10px', borderRadius: 8, fontSize: 11, cursor: 'pointer',
                  background: filterPri === p ? `${PRIORITY_COLORS[p]}18` : 'transparent',
                  border: `1px solid ${filterPri === p ? PRIORITY_COLORS[p] : 'var(--glass-border)'}`,
                  color: filterPri === p ? PRIORITY_COLORS[p] : 'var(--text-secondary)',
                }}
              >
                {p === 'high' ? '🔴' : p === 'medium' ? '🟡' : '🟢'}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setCreateStatus('new'); setShowCreate(true) }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 16px', background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
          >
            <Plus size={15} />Задача
          </button>
        </div>
      </div>

      {/* Kanban board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', gap: 13, overflowX: 'auto', flex: 1, paddingBottom: 8 }}>
          {COLUMNS.map(col => (
            <DroppableColumn
              key={col.id}
              col={col}
              tasks={getColTasks(col.id)}
              onAddTask={() => { setCreateStatus(col.id); setShowCreate(true) }}
              onClick={t => setSelectedTask(t)}
              onContextMenu={(t, e) => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ task: t, x: Math.min(e.clientX, window.innerWidth - 200), y: Math.min(e.clientY, window.innerHeight - 180) }) }}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? <TaskCardContent task={activeTask} onClick={() => {}} onContextMenu={() => {}} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      {/* Modals */}
      {showCreate && (
        <CreateTaskModal
          employees={employees}
          defaultStatus={createStatus}
          onClose={() => setShowCreate(false)}
          onCreate={handleTaskCreate}
        />
      )}

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          employees={employees}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskUpdate}
          onDelete={id => void handleTaskDelete(id)}
        />
      )}

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={buildCtxItems(ctxMenu.task)}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  )
}
