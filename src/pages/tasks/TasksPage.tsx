import React, { useState, useEffect, useCallback } from 'react'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, useDroppable, useDraggable,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus, X, CheckSquare, MessageSquare, Clock, Flag,
  Trash2, ChevronDown, ChevronRight, Users, ListChecks,
} from 'lucide-react'
import { tasksApi, type CreateTaskPayload } from '../../api/tasks.api'
import { employeesApi } from '../../api/employees.api'
import { useAuth } from '../../hooks/useAuth'
import { playSound } from '../../lib/notify'
import { ContextMenu, type ContextMenuEntry } from '../../components/ContextMenu'
import { PeriodFilter, type PeriodValue } from '../../components/ui/PeriodFilter'
import type {
  Task, TaskStatus, TaskPriority,
  TaskChecklistItem, TaskChecklistGroup, TaskComment, Employee,
} from '../../types'

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'new',           label: 'Новые',           color: '#3b82f6' },
  { id: 'today',         label: 'Сегодня',         color: '#f59e0b' },
  { id: 'week',          label: 'На неделе',        color: '#8b5cf6' },
  { id: 'long',          label: 'Длительный срок',  color: '#06b6d4' },
  { id: 'pending_close', label: 'На закрытии',      color: '#f97316' },
  { id: 'closed',        label: 'Закрытые',         color: '#10b981' },
]

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low:      '#71717A',
  medium:   'var(--accent)',
  high:     '#F59E0B',
  critical: '#EF4444',
}

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low:      'Низкий',
  medium:   'Средний',
  high:     'Высокий',
  critical: 'Критический',
}

const PRIVILEGED_ROLES = ['developer', 'owner', 'franchisee']

const inputStyle: React.CSSProperties = {
  height: 36, padding: '0 12px', background: 'transparent',
  border: '1px solid var(--border)', borderRadius: 8,
  color: 'var(--text)', fontSize: 13, outline: 'none',
  width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
  transition: 'border-color 150ms ease-out, box-shadow 150ms ease-out',
}

const textareaStyle: React.CSSProperties = {
  padding: '8px 12px', background: 'transparent',
  border: '1px solid var(--border)', borderRadius: 8,
  color: 'var(--text)', fontSize: 13, outline: 'none',
  width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
  resize: 'vertical', lineHeight: 1.5,
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 5,
}

function fmtDeadline(iso: string): { text: string; color: string; bg: string } {
  const d = new Date(iso)
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  const dayMs = 86400000
  if (diff < 0)           return { text: d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }), color: '#EF4444', bg: 'color-mix(in srgb, #EF4444 10%, transparent)' }
  if (diff < dayMs)       return { text: d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }), color: '#F59E0B', bg: 'color-mix(in srgb, #F59E0B 10%, transparent)' }
  if (diff < 2 * dayMs)   return { text: 'Завтра', color: '#EAB308', bg: 'color-mix(in srgb, #EAB308 10%, transparent)' }
  return { text: d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }), color: 'var(--text-muted)', bg: 'transparent' }
}

// ─── Task Card Content ────────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task
  onClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
  isDragging?: boolean
}

function TaskCardContent({ task, onClick, onContextMenu, isDragging }: TaskCardProps) {
  const done    = task.task_checklist_items?.filter(c => c.is_done).length ?? 0
  const total   = task.task_checklist_items?.length ?? 0
  const comments = task.task_comments?.length ?? 0
  const deadline = task.deadline ? fmtDeadline(task.deadline) : null
  const pColor = PRIORITY_COLORS[task.priority]

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      className="kanban-card"
      style={{
        opacity: isDragging ? 0.35 : 1,
        borderLeft: `3px solid color-mix(in srgb, ${pColor} 60%, transparent)`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4, flex: 1, letterSpacing: '-0.01em' }}>
          {task.title}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 600, color: pColor,
          background: `color-mix(in srgb, ${pColor} 10%, transparent)`,
          border: `1px solid color-mix(in srgb, ${pColor} 25%, transparent)`,
          borderRadius: 4, padding: '1px 5px', flexShrink: 0, whiteSpace: 'nowrap',
        }}>
          {PRIORITY_LABELS[task.priority]}
        </span>
      </div>
      {task.description && (
        <div style={{
          fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.4,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {task.description}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
        {deadline && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: deadline.color, background: deadline.bg, borderRadius: 4, padding: '1px 5px' }}>
            <Clock size={9} />{deadline.text}
          </span>
        )}
        {comments > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--text-muted)' }}>
            <MessageSquare size={9} />{comments}
          </span>
        )}
        {total > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
            <CheckSquare size={9} />{done}/{total}
          </span>
        )}
      </div>
      {total > 0 && (
        <div style={{ marginTop: 6, height: 3, background: 'var(--border)', borderRadius: 2 }}>
          <div style={{
            height: '100%', width: `${Math.round((done / total) * 100)}%`,
            background: '#10b981', borderRadius: 2, transition: 'width 300ms ease-out',
          }} />
        </div>
      )}
    </div>
  )
}

// ─── Draggable Card ───────────────────────────────────────────────────────────

function DraggableCard({ task, onClick, onContextMenu }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id })
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.3 : 1,
    cursor: 'grab',
  }
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <TaskCardContent task={task} onClick={onClick} onContextMenu={onContextMenu} />
    </div>
  )
}

// ─── Droppable Column ─────────────────────────────────────────────────────────

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
        background: isOver ? `color-mix(in srgb, ${col.color} 5%, var(--bg-card))` : 'var(--bg-card)',
        border: `1px solid ${isOver ? `color-mix(in srgb, ${col.color} 50%, transparent)` : 'var(--border)'}`,
        borderRadius: 12, overflow: 'hidden', minWidth: 220, width: 240,
        transition: 'border-color 150ms ease-out, background 150ms ease-out', flexShrink: 0,
      }}
    >
      <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: col.color, display: 'inline-block' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: col.color }}>{col.label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: col.color, background: `color-mix(in srgb, ${col.color} 12%, transparent)`, padding: '1px 7px', borderRadius: 20, fontVariantNumeric: 'tabular-nums' }}>{tasks.length}</span>
          <button onClick={onAddTask} className="icon-btn" style={{ width: 20, height: 20 }}>
            <Plus size={12} />
          </button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 7, minHeight: 100, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {tasks.map(task => (
          <DraggableCard
            key={task.id}
            task={task}
            onClick={() => onClick(task)}
            onContextMenu={e => onContextMenu(task, e)}
          />
        ))}
        {tasks.length === 0 && (
          <div style={{ textAlign: 'center', fontSize: 12, color: isOver ? col.color : 'var(--text-muted)', padding: '20px 0' }}>
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
  const [title,          setTitle]          = useState('')
  const [description,    setDescription]    = useState('')
  const [priority,       setPriority]       = useState<TaskPriority>('medium')
  const [status,         setStatus]         = useState<TaskStatus>(defaultStatus ?? 'new')
  const [assignedTo,     setAssignedTo]     = useState('')
  const [deadline,       setDeadline]       = useState('')
  const [saving,         setSaving]         = useState(false)
  const [error,          setError]          = useState<string | null>(null)

  const [showParticipants, setShowParticipants] = useState(false)
  const [selectedObservers, setSelectedObservers] = useState<string[]>([])

  const [showChecklists,   setShowChecklists]   = useState(false)
  const [checkItems,       setCheckItems]       = useState<string[]>([])
  const [newCheckText,     setNewCheckText]     = useState('')

  const toggleObserver = (profileId: string) => {
    setSelectedObservers(prev =>
      prev.includes(profileId) ? prev.filter(id => id !== profileId) : [...prev, profileId]
    )
  }

  const addCheckItem = () => {
    if (!newCheckText.trim()) return
    setCheckItems(prev => [...prev, newCheckText.trim()])
    setNewCheckText('')
  }

  const handleCreate = async () => {
    if (!title.trim()) { setError('Введите название'); return }
    setSaving(true); setError(null)
    try {
      const payload: CreateTaskPayload = {
        title:        title.trim(),
        description:  description.trim() || null,
        priority,
        status,
        assigned_to:  assignedTo || null,
        observer_ids: selectedObservers,
        deadline:     deadline || null,
      }
      const task = await tasksApi.create(payload)
      for (const text of checkItems) {
        await tasksApi.addChecklistItem(task.id, text)
      }
      if (checkItems.length > 0) {
        const full = await tasksApi.getById(task.id)
        onCreate(full)
      } else {
        onCreate(task)
      }
    } catch {
      setError('Не удалось создать задачу')
    } finally {
      setSaving(false)
    }
  }

  const EDITABLE_COLUMNS = COLUMNS.filter(c => c.id !== 'pending_close' && c.id !== 'closed')

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div className="modal-animate" style={{ position: 'relative', width: '100%', maxWidth: 520, maxHeight: '90vh', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>Новая задача</div>
          <button onClick={onClose} className="icon-btn"><X size={16} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {error && <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 12, padding: '8px 12px', background: 'color-mix(in srgb, #ef4444 8%, transparent)', border: '1px solid color-mix(in srgb, #ef4444 20%, transparent)', borderRadius: 8 }}>{error}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>Название *</label>
              <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="Название задачи" autoFocus
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) void handleCreate() }}
              />
            </div>
            <div>
              <label style={labelStyle}>Описание</label>
              <textarea style={{ ...textareaStyle, minHeight: 60 }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Описание (необязательно)" rows={2} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Приоритет</label>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}>
                  {(Object.keys(PRIORITY_LABELS) as TaskPriority[]).map(p => (
                    <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Колонка</label>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={status} onChange={e => setStatus(e.target.value as TaskStatus)}>
                  {EDITABLE_COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Исполнитель</label>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
                  <option value="">— Не назначен —</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Срок</label>
                <input type="datetime-local" style={{ ...inputStyle, cursor: 'pointer' }} value={deadline} onChange={e => setDeadline(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Participants section */}
          <div style={{ marginTop: 12 }}>
            <button
              onClick={() => setShowParticipants(p => !p)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 12, padding: '6px 12px', cursor: 'pointer', width: '100%', transition: 'border-color 150ms ease-out' }}
            >
              {showParticipants ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              <Users size={12} />
              Наблюдатели
              {selectedObservers.length > 0 && (
                <span style={{ marginLeft: 'auto', background: 'var(--accent)', color: '#fff', fontSize: 10, borderRadius: 10, padding: '1px 6px', fontVariantNumeric: 'tabular-nums' }}>
                  {selectedObservers.length}
                </span>
              )}
            </button>
            {showParticipants && (
              <div style={{ marginTop: 6, padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Выберите наблюдателей:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {employees.map(emp => {
                    const pid = emp.profile_id ?? emp.id
                    const selected = selectedObservers.includes(pid)
                    return (
                      <button
                        key={emp.id}
                        onClick={() => toggleObserver(pid)}
                        style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                          background: selected ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent',
                          border: `1px solid ${selected ? 'color-mix(in srgb, var(--accent) 35%, transparent)' : 'var(--border)'}`,
                          color: selected ? 'var(--accent)' : 'var(--text-secondary)',
                          transition: 'background 150ms ease-out, border-color 150ms ease-out',
                        }}
                      >
                        {emp.full_name}
                      </button>
                    )
                  })}
                  {employees.length === 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Нет сотрудников</span>}
                </div>
              </div>
            )}
          </div>

          {/* Checklists section */}
          <div style={{ marginTop: 8 }}>
            <button
              onClick={() => setShowChecklists(p => !p)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 12, padding: '6px 12px', cursor: 'pointer', width: '100%', transition: 'border-color 150ms ease-out' }}
            >
              {showChecklists ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              <ListChecks size={12} />
              Чеклист
              {checkItems.length > 0 && (
                <span style={{ marginLeft: 'auto', background: 'var(--accent)', color: '#fff', fontSize: 10, borderRadius: 10, padding: '1px 6px', fontVariantNumeric: 'tabular-nums' }}>
                  {checkItems.length}
                </span>
              )}
            </button>
            {showChecklists && (
              <div style={{ marginTop: 6, padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 5 }}>
                {checkItems.map((text, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', background: 'var(--bg-card)', borderRadius: 6, border: '1px solid var(--border)' }}>
                    <span style={{ width: 14, height: 14, borderRadius: 3, border: '1px solid var(--border)', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12, color: 'var(--text)' }}>{text}</span>
                    <button onClick={() => setCheckItems(prev => prev.filter((_, j) => j !== i))} className="icon-btn" style={{ width: 18, height: 18 }}>
                      <X size={11} />
                    </button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                  <input
                    style={{ ...inputStyle, height: 32, fontSize: 12 }}
                    value={newCheckText}
                    onChange={e => setNewCheckText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addCheckItem() }}
                    placeholder="Новый пункт..."
                  />
                  <button onClick={addCheckItem}
                    style={{ height: 32, padding: '0 12px', background: 'color-mix(in srgb, #10b981 12%, transparent)', border: '1px solid color-mix(in srgb, #10b981 25%, transparent)', borderRadius: 8, color: '#10b981', fontSize: 13, cursor: 'pointer', flexShrink: 0, fontWeight: 600 }}>
                    +
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Отмена</button>
          <button onClick={() => void handleCreate()} disabled={saving} className="btn btn-primary" style={{ flex: 2 }}>
            {saving ? 'Создание...' : 'Создать задачу'}
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
  const [newGroupTitle, setNewGroupTitle] = useState('')
  const [showNewGroup,  setShowNewGroup]  = useState(false)
  const [newComment,   setNewComment]   = useState('')
  const [saving,       setSaving]       = useState(false)
  const [checkItems,   setCheckItems]   = useState<TaskChecklistItem[]>(initialTask.task_checklist_items ?? [])
  const [groups,       setGroups]       = useState<TaskChecklistGroup[]>(initialTask.task_checklist_groups ?? [])
  const [comments,     setComments]     = useState<TaskComment[]>(initialTask.task_comments ?? [])

  const isPrivileged = PRIVILEGED_ROLES.includes(user?.role ?? '')
  const isCreator    = task.created_by === user?.id
  const canEdit      = isPrivileged || isCreator

  const save = async (patch: Partial<Task>) => {
    setSaving(true)
    try {
      const updated = await tasksApi.patch(task.id, patch)
      setTask(prev => ({ ...prev, ...updated }))
      onUpdate({ ...task, ...updated })
    } catch { /* ignore */ } finally { setSaving(false) }
  }

  const handleStatusChange = async (newStatus: TaskStatus) => {
    try {
      const updated = await tasksApi.updateStatus(task.id, newStatus)
      setTask(prev => ({ ...prev, ...updated }))
      onUpdate({ ...task, ...updated })
    } catch { /* ignore */ }
  }

  const handleConfirmClose = async () => {
    try {
      const updated = await tasksApi.confirmClose(task.id)
      setTask(prev => ({ ...prev, ...updated }))
      onUpdate({ ...task, ...updated })
    } catch { /* ignore */ }
  }

  const handleAddCheckItem = async (groupId?: string | null) => {
    if (!newCheckText.trim()) return
    try {
      const item = await tasksApi.addChecklistItem(task.id, newCheckText.trim(), groupId)
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

  const handleAddGroup = async () => {
    if (!newGroupTitle.trim()) return
    try {
      const group = await tasksApi.addChecklistGroup(task.id, newGroupTitle.trim())
      setGroups(prev => [...prev, group])
      setNewGroupTitle('')
      setShowNewGroup(false)
    } catch { /* ignore */ }
  }

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await tasksApi.deleteChecklistGroup(task.id, groupId)
      setGroups(prev => prev.filter(g => g.id !== groupId))
      setCheckItems(prev => prev.filter(c => c.group_id !== groupId))
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

  const doneCount  = checkItems.filter(c => c.is_done).length
  const totalCount = checkItems.length
  const ungroupedItems = checkItems.filter(c => !c.group_id)
  const pColor = PRIORITY_COLORS[task.priority]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div className="modal-animate" style={{ position: 'relative', width: '100%', maxWidth: 640, maxHeight: '88vh', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              {canEdit ? (
                <input
                  value={task.title}
                  onChange={e => setTask(p => ({ ...p, title: e.target.value }))}
                  onBlur={() => void save({ title: task.title })}
                  style={{ ...inputStyle, fontSize: 16, fontWeight: 600, height: 38, background: 'transparent', border: '1px solid transparent', letterSpacing: '-0.01em' }}
                />
              ) : (
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', padding: '8px 0', letterSpacing: '-0.01em' }}>{task.title}</div>
              )}
            </div>
            <button onClick={onClose} className="icon-btn" style={{ flexShrink: 0 }}><X size={16} /></button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: pColor, background: `color-mix(in srgb, ${pColor} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${pColor} 25%, transparent)`, borderRadius: 6, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Flag size={9} />{PRIORITY_LABELS[task.priority]}
            </span>
            {saving && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Сохранение...</span>}
          </div>

          {/* pending_close banner */}
          {task.status === 'pending_close' && (
            <div style={{ marginTop: 10, background: 'color-mix(in srgb, #f97316 8%, transparent)', border: '1px solid color-mix(in srgb, #f97316 25%, transparent)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: '#f97316', flex: 1 }}>Исполнитель запросил закрытие задачи</span>
              {(isCreator || isPrivileged) && (
                <>
                  <button
                    onClick={() => void handleConfirmClose()}
                    style={{ padding: '5px 12px', background: 'color-mix(in srgb, #10b981 12%, transparent)', border: '1px solid color-mix(in srgb, #10b981 30%, transparent)', borderRadius: 7, color: '#10b981', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Подтвердить
                  </button>
                  <button
                    onClick={() => void handleStatusChange('long')}
                    style={{ padding: '5px 12px', background: 'color-mix(in srgb, #ef4444 8%, transparent)', border: '1px solid color-mix(in srgb, #ef4444 25%, transparent)', borderRadius: 7, color: '#ef4444', fontSize: 12, cursor: 'pointer' }}
                  >
                    Вернуть
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {[
            { id: 'main',      label: 'Основное' },
            { id: 'checklist', label: `Чеклист${totalCount > 0 ? ` (${doneCount}/${totalCount})` : ''}` },
            { id: 'comments',  label: `Комментарии${comments.length > 0 ? ` (${comments.length})` : ''}` },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              style={{
                flex: 1, background: 'transparent', border: 'none',
                borderBottom: `2px solid ${tab === t.id ? 'var(--accent)' : 'transparent'}`,
                color: tab === t.id ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: 12, padding: '10px 8px', cursor: 'pointer',
                transition: 'color 150ms ease-out, border-color 150ms ease-out',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

          {/* Main tab */}
          {tab === 'main' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>Описание</label>
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
                  <div style={{ fontSize: 13, color: task.description ? 'var(--text)' : 'var(--text-muted)', lineHeight: 1.6 }}>
                    {task.description || 'Нет описания'}
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Приоритет</label>
                  {canEdit ? (
                    <select style={{ ...inputStyle, cursor: 'pointer' }} value={task.priority} onChange={e => void save({ priority: e.target.value as TaskPriority })}>
                      {(Object.keys(PRIORITY_LABELS) as TaskPriority[]).map(p => (
                        <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ fontSize: 13, fontWeight: 600, color: pColor }}>{PRIORITY_LABELS[task.priority]}</div>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Статус</label>
                  {canEdit ? (
                    <select style={{ ...inputStyle, cursor: 'pointer' }} value={task.status} onChange={e => void handleStatusChange(e.target.value as TaskStatus)}>
                      {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--text)' }}>
                      {COLUMNS.find(c => c.id === task.status)?.label ?? task.status}
                    </div>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Исполнитель</label>
                  {canEdit ? (
                    <select style={{ ...inputStyle, cursor: 'pointer' }} value={task.assigned_to ?? ''} onChange={e => void save({ assigned_to: e.target.value || null })}>
                      <option value="">— Не назначен —</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                    </select>
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--text)' }}>
                      {employees.find(e => e.id === task.assigned_to)?.full_name ?? '—'}
                    </div>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Срок</label>
                  {canEdit ? (
                    <input type="datetime-local" style={{ ...inputStyle, cursor: 'pointer' }}
                      value={task.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : ''}
                      onChange={e => void save({ deadline: e.target.value || null })}
                    />
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--text)' }}>
                      {task.deadline ? new Date(task.deadline).toLocaleString('ru-RU') : 'Не указан'}
                    </div>
                  )}
                </div>
              </div>

              {/* Observers */}
              {task.observer_ids.length > 0 && (
                <div>
                  <label style={labelStyle}>Наблюдатели</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {task.observer_ids.map(oid => {
                      const emp = employees.find(e => e.profile_id === oid || e.id === oid)
                      return (
                        <span key={oid} style={{ fontSize: 12, background: 'color-mix(in srgb, var(--accent) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)', color: 'var(--accent)', borderRadius: 20, padding: '2px 10px' }}>
                          {emp?.full_name ?? oid.slice(0, 8)}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              {canEdit && (
                <button
                  onClick={() => { if (confirm('Удалить задачу?')) onDelete(task.id) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 12px', background: 'color-mix(in srgb, #ef4444 8%, transparent)', border: '1px solid color-mix(in srgb, #ef4444 20%, transparent)', borderRadius: 8, color: '#ef4444', fontSize: 12, cursor: 'pointer', marginTop: 4, width: 'fit-content', transition: 'background 150ms ease-out' }}
                >
                  <Trash2 size={13} />Удалить задачу
                </button>
              )}
            </div>
          )}

          {/* Checklist tab */}
          {tab === 'checklist' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {totalCount > 0 && (
                <div style={{ marginBottom: 6 }}>
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginBottom: 4 }}>
                    <div style={{ height: '100%', width: `${Math.round((doneCount / totalCount) * 100)}%`, background: '#10b981', borderRadius: 2, transition: 'width 300ms ease-out' }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{doneCount}/{totalCount} выполнено</div>
                </div>
              )}

              {ungroupedItems.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: item.is_done ? 'color-mix(in srgb, #10b981 5%, transparent)' : 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <input type="checkbox" checked={item.is_done} onChange={() => void handleToggleCheck(item)} style={{ accentColor: '#10b981', width: 14, height: 14, cursor: 'pointer' }} />
                  <span style={{ fontSize: 13, color: item.is_done ? 'var(--text-muted)' : 'var(--text)', textDecoration: item.is_done ? 'line-through' : 'none', flex: 1 }}>{item.text}</span>
                </div>
              ))}

              {groups.map(group => {
                const groupItems = checkItems.filter(c => c.group_id === group.id)
                return (
                  <div key={group.id} style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ padding: '8px 12px', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{group.title}</span>
                      {canEdit && (
                        <button onClick={() => void handleDeleteGroup(group.id)} className="icon-btn" style={{ width: 18, height: 18 }}>
                          <X size={11} />
                        </button>
                      )}
                    </div>
                    <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {groupItems.map(item => (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', background: item.is_done ? 'color-mix(in srgb, #10b981 5%, transparent)' : 'transparent', borderRadius: 6 }}>
                          <input type="checkbox" checked={item.is_done} onChange={() => void handleToggleCheck(item)} style={{ accentColor: '#10b981', width: 13, height: 13, cursor: 'pointer' }} />
                          <span style={{ fontSize: 12, color: item.is_done ? 'var(--text-muted)' : 'var(--text)', textDecoration: item.is_done ? 'line-through' : 'none', flex: 1 }}>{item.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

              {canEdit && (
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <input
                    style={inputStyle}
                    value={newCheckText}
                    onChange={e => setNewCheckText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') void handleAddCheckItem() }}
                    placeholder="Новый пункт чеклиста..."
                  />
                  <button onClick={() => void handleAddCheckItem()}
                    style={{ height: 36, padding: '0 12px', background: 'color-mix(in srgb, #10b981 12%, transparent)', border: '1px solid color-mix(in srgb, #10b981 25%, transparent)', borderRadius: 8, color: '#10b981', fontSize: 13, cursor: 'pointer', flexShrink: 0, fontWeight: 600 }}>
                    +
                  </button>
                </div>
              )}

              {canEdit && (
                <div style={{ marginTop: 4 }}>
                  {showNewGroup ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        style={{ ...inputStyle, fontSize: 12 }}
                        value={newGroupTitle}
                        onChange={e => setNewGroupTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') void handleAddGroup(); if (e.key === 'Escape') setShowNewGroup(false) }}
                        placeholder="Название группы..."
                        autoFocus
                      />
                      <button onClick={() => void handleAddGroup()} className="btn btn-primary" style={{ height: 36, fontSize: 12, flexShrink: 0 }}>
                        Добавить
                      </button>
                      <button onClick={() => setShowNewGroup(false)} className="icon-btn">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setShowNewGroup(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', background: 'transparent', border: '1px dashed var(--border)', borderRadius: 8, color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>
                      <Plus size={12} />Добавить группу
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Comments tab */}
          {tab === 'comments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {comments.length === 0 && (
                <div style={{ textAlign: 'center', padding: 32, fontSize: 13, color: 'var(--text-muted)' }}>Нет комментариев</div>
              )}
              {comments.map(c => (
                <div key={c.id} style={{ padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                    {new Date(c.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{c.text}</div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <input
                  style={inputStyle}
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) void handleAddComment() }}
                  placeholder="Написать комментарий..."
                />
                <button onClick={() => void handleAddComment()} disabled={!newComment.trim()}
                  style={{ height: 36, padding: '0 12px', background: 'var(--accent)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, cursor: newComment.trim() ? 'pointer' : 'default', flexShrink: 0, opacity: newComment.trim() ? 1 : 0.4, transition: 'opacity 150ms' }}>
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

type MyFilter = 'all' | 'my' | 'observing'

export default function TasksPage() {
  const { user } = useAuth()
  const [tasks,        setTasks]        = useState<Task[]>([])
  const [loading,      setLoading]      = useState(true)
  const [employees,    setEmployees]    = useState<Employee[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showCreate,   setShowCreate]   = useState(false)
  const [createStatus, setCreateStatus] = useState<TaskStatus>('new')
  const [activeId,     setActiveId]     = useState<string | null>(null)
  const [ctxMenu,      setCtxMenu]      = useState<{ task: Task; x: number; y: number } | null>(null)
  const [search,       setSearch]       = useState('')
  const [filterPri,    setFilterPri]    = useState<TaskPriority | null>(null)
  const [myFilter,     setMyFilter]     = useState<MyFilter>('all')
  const [period,       setPeriod]       = useState<PeriodValue | null>(null)
  const [dateField,    setDateField]    = useState<'created_at' | 'deadline'>('created_at')
  const [showAutoOnly, setShowAutoOnly] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const loadTasks = useCallback(async () => {
    try {
      const params = period ? { from: period.from, to: period.to, date_field: dateField } : undefined
      const data = await tasksApi.getAll(params)
      setTasks(data)
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [period, dateField])

  useEffect(() => {
    void loadTasks()
    employeesApi.getAll().then(setEmployees).catch(() => { /* ignore */ })
  }, [loadTasks])

  useEffect(() => {
    const close = () => setCtxMenu(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  const getColTasks = (colId: TaskStatus) => {
    const userId = user?.id
    return tasks
      .filter(t => {
        const effectiveStatus = t.status === 'done' ? 'closed' : t.status
        if (effectiveStatus !== colId) return false
        if (filterPri && t.priority !== filterPri) return false
        if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
        if (myFilter === 'my' && t.assigned_to !== userId) return false
        if (myFilter === 'observing' && (!userId || !t.observer_ids.includes(userId))) return false
        if (showAutoOnly && !t.is_auto) return false
        return true
      })
      .sort((a, b) => {
        const aOver = a.deadline && new Date(a.deadline) < new Date() ? 0 : 1
        const bOver = b.deadline && new Date(b.deadline) < new Date() ? 0 : 1
        return aOver - bOver
      })
  }

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
      const updated = await tasksApi.updateStatus(taskId, newStatus)
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updated } : t))
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
      const updated = await tasksApi.updateStatus(task.id, 'closed')
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...updated } : t))
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="skeleton" style={{ height: 24, width: 120, borderRadius: 6 }} />
          <div className="skeleton" style={{ height: 36, width: 120, borderRadius: 8 }} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {COLUMNS.map((_, i) => (
            <div key={i} className="skeleton" style={{ flex: '0 0 240px', height: 400, borderRadius: 12 }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px - 42px)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ marginBottom: 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', margin: 0, marginBottom: 2, letterSpacing: '-0.02em' }}>Задачи</h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Канбан доска</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* My filter */}
            <div style={{ display: 'flex', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              {(['all', 'my', 'observing'] as MyFilter[]).map((f, i) => (
                <button key={f} onClick={() => setMyFilter(f)}
                  style={{
                    height: 34, padding: '0 11px',
                    background: myFilter === f ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent',
                    border: 'none',
                    borderRight: i < 2 ? '1px solid var(--border)' : 'none',
                    color: myFilter === f ? 'var(--accent)' : 'var(--text-secondary)',
                    fontSize: 12, cursor: 'pointer', fontWeight: myFilter === f ? 600 : 400,
                    transition: 'background 150ms ease-out, color 150ms ease-out',
                  }}>
                  {f === 'all' ? 'Все' : f === 'my' ? 'Мои' : 'Наблюдаю'}
                </button>
              ))}
            </div>
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...inputStyle, width: 180, paddingLeft: 30 }}
                placeholder="Поиск задач..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 12, pointerEvents: 'none' }}>🔍</span>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['critical', 'high', 'medium', 'low'] as TaskPriority[]).map(p => (
                <button
                  key={p}
                  onClick={() => setFilterPri(filterPri === p ? null : p)}
                  style={{
                    height: 34, padding: '0 9px', borderRadius: 8, fontSize: 11, cursor: 'pointer',
                    background: filterPri === p ? `color-mix(in srgb, ${PRIORITY_COLORS[p]} 10%, transparent)` : 'transparent',
                    border: `1px solid ${filterPri === p ? `color-mix(in srgb, ${PRIORITY_COLORS[p]} 40%, transparent)` : 'var(--border)'}`,
                    color: filterPri === p ? PRIORITY_COLORS[p] : 'var(--text-secondary)',
                    transition: 'background 150ms ease-out, border-color 150ms ease-out',
                  }}
                >
                  {p === 'critical' ? '🔴' : p === 'high' ? '🟠' : p === 'medium' ? '🟡' : '⚫'}
                </button>
              ))}
            </div>
            <button
              onClick={() => { setCreateStatus('new'); setShowCreate(true) }}
              className="btn btn-primary"
              style={{ gap: 6, flexShrink: 0 }}
            >
              <Plus size={15} strokeWidth={2.5} />Задача
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <PeriodFilter value={period} onChange={p => { setPeriod(p) }} />
          {period && (
            <div style={{ display: 'flex', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              {(['created_at', 'deadline'] as const).map((f, i) => (
                <button key={f} onClick={() => setDateField(f)}
                  style={{
                    height: 28, padding: '0 10px',
                    background: dateField === f ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent',
                    border: 'none',
                    borderRight: i === 0 ? '1px solid var(--border)' : 'none',
                    color: dateField === f ? 'var(--accent)' : 'var(--text-secondary)',
                    fontSize: 11, cursor: 'pointer',
                    transition: 'background 150ms ease-out, color 150ms ease-out',
                  }}>
                  {f === 'created_at' ? 'По дате создания' : 'По дедлайну'}
                </button>
              ))}
            </div>
          )}
          {user?.role === 'developer' && (
            <button
              onClick={() => setShowAutoOnly(v => !v)}
              style={{
                height: 28, padding: '0 10px',
                background: showAutoOnly ? 'color-mix(in srgb, #8b5cf6 12%, transparent)' : 'transparent',
                border: `1px solid ${showAutoOnly ? 'color-mix(in srgb, #8b5cf6 35%, transparent)' : 'var(--border)'}`,
                borderRadius: 8, color: showAutoOnly ? '#8b5cf6' : 'var(--text-secondary)',
                fontSize: 11, fontWeight: showAutoOnly ? 600 : 400, cursor: 'pointer',
                transition: 'background 150ms ease-out, border-color 150ms ease-out',
              }}>
              Автозадачи
            </button>
          )}
        </div>
      </div>

      {/* Kanban board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', flex: 1, paddingBottom: 8 }}>
          {COLUMNS.map(col => (
            <DroppableColumn
              key={col.id}
              col={col}
              tasks={getColTasks(col.id)}
              onAddTask={() => {
                const targetStatus = (col.id === 'pending_close' || col.id === 'closed') ? 'new' : col.id
                setCreateStatus(targetStatus)
                setShowCreate(true)
              }}
              onClick={t => setSelectedTask(t)}
              onContextMenu={(t, e) => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ task: t, x: Math.min(e.clientX, window.innerWidth - 200), y: Math.min(e.clientY, window.innerHeight - 180) }) }}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? (
            <div style={{ transform: 'rotate(2deg) scale(1.02)', opacity: 0.95 }}>
              <TaskCardContent task={activeTask} onClick={() => {}} onContextMenu={() => {}} isDragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

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
