import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, useDroppable, useDraggable,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus, X, Flag, Clock, MessageSquare, CheckSquare, Paperclip,
  User, Users, Settings2, Trash2, ChevronDown, ChevronRight,
  ListChecks, Activity, Eye, FolderOpen, Layers, AlignLeft,
  Circle, ArrowRight, Pause, Search, RotateCcw, Ban,
} from 'lucide-react'
import { tasksApi, type CreateTaskPayload } from '../../api/tasks.api'
import { taskProjectsApi } from '../../api/taskProjects.api'
import { taskColumnsApi } from '../../api/taskColumns.api'
import { employeesApi } from '../../api/employees.api'
import { useAuth } from '../../hooks/useAuth'
import { playSound } from '../../lib/notify'
import type {
  Task, TaskStatus, TaskPriority, TaskProject, TaskCustomColumn,
  TaskChecklistItem, TaskChecklistGroup, TaskComment,
  TaskActivity, TaskAttachment, Employee,
} from '../../types'
import { Skeleton } from '@/components/ui/skeleton'

// ─── Constants ─────────────────────────────────────────────────────────────

const STANDARD_COLUMNS: { id: TaskStatus; label: string; color: string; icon: React.ReactNode }[] = [
  { id: 'new',         label: 'Новые',        color: 'var(--text-muted)',      icon: <Circle size={12} /> },
  { id: 'in_progress', label: 'В работе',     color: 'var(--accent)',          icon: <ArrowRight size={12} /> },
  { id: 'waiting',     label: 'Ожидание',     color: 'var(--color-warning)',   icon: <Pause size={12} /> },
  { id: 'review',      label: 'На проверке',  color: '#8b5cf6',                icon: <Eye size={12} /> },
  { id: 'done',        label: 'Выполнено',    color: 'var(--color-success)',   icon: <CheckSquare size={12} /> },
  { id: 'cancelled',   label: 'Отменено',     color: 'var(--color-danger)',    icon: <Ban size={12} /> },
]

const LEGACY_STATUS_MAP: Record<string, TaskStatus> = {
  today: 'in_progress', week: 'in_progress', long: 'waiting',
  closed: 'done', pending_close: 'review',
}

function normalizeStatus(status: string): TaskStatus {
  if (LEGACY_STATUS_MAP[status]) return LEGACY_STATUS_MAP[status]
  return status as TaskStatus
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low:      'var(--text-muted)',
  medium:   'var(--accent)',
  high:     'var(--color-warning)',
  critical: 'var(--color-danger)',
}

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Низкий', medium: 'Средний', high: 'Высокий', critical: 'Критический',
}

const PRIVILEGED_ROLES = ['developer', 'owner', 'franchisee']

const inputStyle: React.CSSProperties = {
  height: 36, padding: '0 12px', background: 'var(--bg-card)',
  border: '1px solid var(--border)', borderRadius: 8,
  color: 'var(--text)', fontSize: 13, outline: 'none',
  width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
  transition: 'border-color 150ms ease-out',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 5,
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmtDeadline(iso: string): { text: string; color: string; urgent: boolean } {
  const d = new Date(iso)
  const diff = d.getTime() - Date.now()
  const day = 86400000
  if (diff < 0)         return { text: d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }), color: 'var(--color-danger)', urgent: true }
  if (diff < day)       return { text: d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }), color: 'var(--color-warning)', urgent: true }
  if (diff < 2 * day)   return { text: 'Завтра', color: 'var(--color-warning)', urgent: false }
  return { text: d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }), color: 'var(--text-muted)', urgent: false }
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(s => s[0] ?? '').join('').toUpperCase()
}

// ─── Task Card ──────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task
  employees: Employee[]
  projects: TaskProject[]
  onClick: () => void
  onContextMenu?: (e: React.MouseEvent) => void
  isDragging?: boolean
}

function TaskCardContent({ task, employees, projects, onClick, onContextMenu, isDragging }: TaskCardProps) {
  const done     = task.task_checklist_items?.filter(c => c.is_done).length ?? 0
  const total    = task.task_checklist_items?.length ?? 0
  const comments = task.task_comments?.length ?? 0
  const deadline = task.deadline ? fmtDeadline(task.deadline) : null
  const pColor   = PRIORITY_COLORS[task.priority]
  const assignee = task.assigned_to
    ? (employees.find(e => e.profile_id === task.assigned_to) ?? employees.find(e => e.id === task.assigned_to))
    : null
  const project  = task.project_id ? projects.find(p => p.id === task.project_id) : null
  const observers = task.observer_ids?.length ?? 0

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      className="kanban-card"
      style={{
        opacity: isDragging ? 0.3 : 1,
        borderLeft: `3px solid color-mix(in srgb, ${pColor} 55%, transparent)`,
        cursor: 'pointer',
      }}
    >
      {project && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: project.color, flexShrink: 0 }} />
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{project.name}</span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: task.description ? 5 : 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4, flex: 1, letterSpacing: '-0.01em' }}>
          {task.title}
        </span>
        <span style={{
          fontSize: 9, fontWeight: 700, color: pColor,
          background: `color-mix(in srgb, ${pColor} 10%, transparent)`,
          border: `1px solid color-mix(in srgb, ${pColor} 22%, transparent)`,
          borderRadius: 4, padding: '1px 5px', flexShrink: 0, whiteSpace: 'nowrap', letterSpacing: '0.02em',
        }}>
          {PRIORITY_LABELS[task.priority].toUpperCase()}
        </span>
      </div>

      {task.description && (
        <div style={{
          fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.45,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {task.description}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {deadline && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: deadline.color, fontVariantNumeric: 'tabular-nums' }}>
            <Clock size={9} strokeWidth={2.5} />{deadline.text}
          </span>
        )}
        {comments > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--text-muted)' }}>
            <MessageSquare size={9} strokeWidth={2} />{comments}
          </span>
        )}
        {total > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: done === total ? 'var(--color-success)' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
            <CheckSquare size={9} strokeWidth={2} />{done}/{total}
          </span>
        )}
        {observers > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--text-muted)' }}>
            <Eye size={9} strokeWidth={2} />{observers}
          </span>
        )}

        {assignee && (
          <div title={assignee.full_name} style={{ marginLeft: 'auto', flexShrink: 0 }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
              color: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700,
            }}>
              {getInitials(assignee.full_name)}
            </div>
          </div>
        )}
      </div>

      {total > 0 && (
        <div style={{ marginTop: 8, height: 5, background: 'var(--border)', borderRadius: 3 }}>
          <div style={{
            height: '100%',
            width: `${Math.round((done / total) * 100)}%`,
            background: done === total ? 'var(--color-success)' : 'var(--accent)',
            borderRadius: 3, transition: 'width 300ms ease-out',
          }} />
        </div>
      )}
    </div>
  )
}

function DraggableCard(props: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: props.task.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.3 : 1, cursor: 'grab' }}
      {...listeners}
      {...attributes}
    >
      <TaskCardContent {...props} />
    </div>
  )
}

// ─── Kanban Column ─────────────────────────────────────────────────────────

interface KanbanColumnProps {
  id: string
  label: string
  color: string
  icon?: React.ReactNode
  tasks: Task[]
  employees: Employee[]
  projects: TaskProject[]
  onAdd: () => void
  onCardClick: (t: Task) => void
}

function KanbanColumn({ id, label, color, icon, tasks, employees, projects, onAdd, onCardClick }: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{
        display: 'flex', flexDirection: 'column',
        background: isOver ? `color-mix(in srgb, ${color} 4%, var(--bg-card))` : 'var(--bg-card)',
        border: `1px solid ${isOver ? `color-mix(in srgb, ${color} 45%, transparent)` : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)', overflow: 'hidden',
        minWidth: 230, width: 250, flexShrink: 0,
        transition: 'border-color 150ms ease-out, background 150ms ease-out',
      }}
    >
      <div style={{ padding: '10px 12px 9px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color, display: 'flex' }}>{icon ?? <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block' }} />}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color }}>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color, background: `color-mix(in srgb, ${color} 10%, transparent)`, padding: '1px 7px', borderRadius: 20, fontVariantNumeric: 'tabular-nums' }}>
            {tasks.length}
          </span>
          <button onClick={onAdd} className="icon-btn" style={{ width: 20, height: 20 }}>
            <Plus size={12} />
          </button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 7, minHeight: 80, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {tasks.map(task => (
          <DraggableCard
            key={task.id}
            task={task}
            employees={employees}
            projects={projects}
            onClick={() => onCardClick(task)}
          />
        ))}
        {tasks.length === 0 && (
          <div style={{ textAlign: 'center', fontSize: 12, color: isOver ? color : 'var(--text-muted)', padding: '20px 0', opacity: isOver ? 1 : 0.5 }}>
            {isOver ? 'Перетащи сюда' : 'Пусто'}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Column Manager Modal ──────────────────────────────────────────────────

function ColumnManagerModal({ columns, onClose, onAdd, onDelete, onRename }: {
  columns: TaskCustomColumn[]
  onClose: () => void
  onAdd: (name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onRename: (id: string, name: string) => Promise<void>
}) {
  const [newName, setNewName] = useState('')
  const [saving,  setSaving]  = useState(false)
  const [editId,  setEditId]  = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')

  const handleAdd = async () => {
    if (!newName.trim()) return
    setSaving(true)
    await onAdd(newName.trim())
    setNewName('')
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div className="modal-animate" style={{ position: 'relative', width: '100%', maxWidth: 400, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', boxShadow: '0 20px 60px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 18px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Мои колонки</span>
          <button onClick={onClose} className="icon-btn"><X size={15} /></button>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '50vh', overflowY: 'auto' }}>
          {columns.map(col => (
            <div key={col.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
              {editId === col.id ? (
                <input
                  style={{ ...inputStyle, height: 28, flex: 1, fontSize: 12 }}
                  value={editVal}
                  onChange={e => setEditVal(e.target.value)}
                  onKeyDown={async e => {
                    if (e.key === 'Enter') { await onRename(col.id, editVal); setEditId(null) }
                    if (e.key === 'Escape') setEditId(null)
                  }}
                  autoFocus
                />
              ) : (
                <span
                  style={{ flex: 1, fontSize: 13, color: 'var(--text)', cursor: 'text' }}
                  onClick={() => { setEditId(col.id); setEditVal(col.name) }}
                >
                  {col.name}
                </span>
              )}
              <button onClick={() => onDelete(col.id)} className="icon-btn" style={{ width: 22, height: 22 }}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {columns.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>Нет колонок</div>}
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
          <input
            style={{ ...inputStyle, flex: 1, height: 34, fontSize: 12 }}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void handleAdd() }}
            placeholder="Название колонки..."
          />
          <button
            onClick={() => void handleAdd()}
            disabled={!newName.trim() || saving}
            className="btn btn-primary"
            style={{ height: 34, padding: '0 14px', fontSize: 12, flexShrink: 0 }}
          >
            <Plus size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Task Drawer ───────────────────────────────────────────────────────────

type DrawerTab = 'main' | 'checklist' | 'comments' | 'activity' | 'attachments'

interface TaskDrawerProps {
  task: Task
  employees: Employee[]
  projects: TaskProject[]
  onClose: () => void
  onUpdate: (t: Task) => void
  onDelete: (id: string) => void
}

function TaskDrawer({ task: initialTask, employees, projects, onClose, onUpdate, onDelete }: TaskDrawerProps) {
  const { user } = useAuth()
  const [task,         setTask]        = useState<Task>(initialTask)
  const [tab,          setTab]         = useState<DrawerTab>('main')
  const [saving,       setSaving]      = useState(false)

  const [checkItems,   setCheckItems]  = useState<TaskChecklistItem[]>(initialTask.task_checklist_items ?? [])
  const [groups,       setGroups]      = useState<TaskChecklistGroup[]>(initialTask.task_checklist_groups ?? [])
  const [comments,     setComments]    = useState<TaskComment[]>(initialTask.task_comments ?? [])
  const [activity,     setActivity]    = useState<TaskActivity[]>([])
  const [attachments,  setAttachments] = useState<TaskAttachment[]>([])
  const [actLoaded,    setActLoaded]   = useState(false)

  const [newCheckText, setNewCheckText]   = useState('')
  const [newComment,   setNewComment]     = useState('')
  const [showNewGroup, setShowNewGroup]   = useState(false)
  const [newGroupTitle, setNewGroupTitle] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const toggleGroup = useCallback((id: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const isPrivileged = PRIVILEGED_ROLES.includes(user?.role ?? '')
  const isCreator    = task.created_by === user?.id
  const canEdit      = isPrivileged || isCreator

  useEffect(() => {
    if (tab === 'activity' && !actLoaded) {
      void tasksApi.getActivity(task.id).then(data => { setActivity(data); setActLoaded(true) })
      void tasksApi.getAttachments(task.id).then(setAttachments)
    }
    if (tab === 'attachments') {
      void tasksApi.getAttachments(task.id).then(setAttachments)
    }
  }, [tab, actLoaded, task.id])

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

  const handleAddCheck = async (groupId?: string | null) => {
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

  const handleDeleteCheck = async (itemId: string) => {
    try {
      await tasksApi.deleteChecklistItem(task.id, itemId)
      setCheckItems(prev => prev.filter(c => c.id !== itemId))
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

  const handleDeleteComment = async (commentId: string) => {
    try {
      await tasksApi.deleteComment(task.id, commentId)
      setComments(prev => prev.filter(c => c.id !== commentId))
    } catch { /* ignore */ }
  }

  const doneCount  = checkItems.filter(c => c.is_done).length
  const totalCount = checkItems.length
  const ungrouped  = checkItems.filter(c => !c.group_id)
  const pColor     = PRIORITY_COLORS[task.priority]
  const assignee   = task.assigned_to
    ? (employees.find(e => e.profile_id === task.assigned_to) ?? employees.find(e => e.id === task.assigned_to))
    : null

  const TABS: { id: DrawerTab; label: string; badge?: number }[] = [
    { id: 'main',        label: 'Основное' },
    { id: 'checklist',   label: 'Чеклист',      badge: totalCount > 0 ? totalCount : undefined },
    { id: 'comments',    label: 'Комментарии',  badge: comments.length > 0 ? comments.length : undefined },
    { id: 'activity',    label: 'История' },
    { id: 'attachments', label: 'Файлы',        badge: attachments.length > 0 ? attachments.length : undefined },
  ]

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="modal-animate"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 720, maxHeight: '90vh',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              {canEdit ? (
                <input
                  value={task.title}
                  onChange={e => setTask(p => ({ ...p, title: e.target.value }))}
                  onBlur={() => void save({ title: task.title })}
                  style={{ ...inputStyle, fontSize: 15, fontWeight: 600, height: 36, background: 'transparent', border: '1px solid transparent', letterSpacing: '-0.01em', padding: '0 6px' }}
                />
              ) : (
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', padding: '8px 6px', letterSpacing: '-0.01em' }}>{task.title}</div>
              )}
            </div>
            <button onClick={onClose} className="icon-btn" style={{ flexShrink: 0, marginTop: 4 }}><X size={15} /></button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: pColor, background: `color-mix(in srgb, ${pColor} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${pColor} 22%, transparent)`, borderRadius: 5, padding: '2px 7px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Flag size={9} strokeWidth={2.5} />{PRIORITY_LABELS[task.priority].toUpperCase()}
            </span>
            {saving && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Сохранение...</span>}
            {canEdit && (
              <button
                onClick={() => { if (confirm('Удалить задачу?')) onDelete(task.id) }}
                className="icon-btn"
                style={{ marginLeft: 'auto', color: 'var(--color-danger)', width: 26, height: 26 }}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0, overflowX: 'auto' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, background: 'transparent', border: 'none', minWidth: 80,
                borderBottom: `2px solid ${tab === t.id ? 'var(--accent)' : 'transparent'}`,
                color: tab === t.id ? 'var(--accent)' : 'var(--text-muted)',
                fontSize: 11, padding: '9px 6px', cursor: 'pointer', whiteSpace: 'nowrap',
                transition: 'color 150ms ease-out, border-color 150ms ease-out',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}
            >
              {t.label}
              {t.badge !== undefined && (
                <span style={{ fontSize: 9, fontWeight: 700, background: tab === t.id ? 'var(--accent)' : 'var(--border)', color: tab === t.id ? '#fff' : 'var(--text-muted)', borderRadius: 10, padding: '1px 5px', fontVariantNumeric: 'tabular-nums' }}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>

          {/* Main tab */}
          {tab === 'main' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Описание</label>
                {canEdit ? (
                  <textarea
                    value={task.description ?? ''}
                    onChange={e => setTask(p => ({ ...p, description: e.target.value }))}
                    onBlur={() => void save({ description: task.description })}
                    style={{ padding: '8px 12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.5, minHeight: 72 }}
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
                    <select style={{ ...inputStyle, cursor: 'pointer' }} value={normalizeStatus(task.status)} onChange={e => void handleStatusChange(e.target.value as TaskStatus)}>
                      {STANDARD_COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--text)' }}>
                      {STANDARD_COLUMNS.find(c => c.id === normalizeStatus(task.status))?.label ?? task.status}
                    </div>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Исполнитель</label>
                  {canEdit ? (
                    <select style={{ ...inputStyle, cursor: 'pointer' }} value={task.assigned_to ?? ''} onChange={e => void save({ assigned_to: e.target.value || null })}>
                      <option value="">— Не назначен —</option>
                      {employees.map(e => <option key={e.id} value={e.profile_id ?? e.id}>{e.full_name}</option>)}
                    </select>
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--text)' }}>
                      {assignee?.full_name ?? '—'}
                    </div>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Срок</label>
                  {canEdit ? (
                    <input
                      type="datetime-local"
                      style={{ ...inputStyle, cursor: 'pointer' }}
                      value={task.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : ''}
                      onChange={e => void save({ deadline: e.target.value || null })}
                    />
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--text)' }}>
                      {task.deadline ? new Date(task.deadline).toLocaleString('ru-RU') : '—'}
                    </div>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Проект</label>
                  {canEdit ? (
                    <select style={{ ...inputStyle, cursor: 'pointer' }} value={task.project_id ?? ''} onChange={e => void save({ project_id: e.target.value || null })}>
                      <option value="">— Без проекта —</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--text)' }}>
                      {projects.find(p => p.id === task.project_id)?.name ?? '—'}
                    </div>
                  )}
                </div>
              </div>

              {task.observer_ids.length > 0 && (
                <div>
                  <label style={labelStyle}>Наблюдатели</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {task.observer_ids.map(oid => {
                      const emp = employees.find(e => e.profile_id === oid || e.id === oid)
                      return (
                        <span key={oid} style={{ fontSize: 12, background: 'color-mix(in srgb, var(--accent) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 22%, transparent)', color: 'var(--accent)', borderRadius: 20, padding: '2px 10px' }}>
                          {emp?.full_name ?? oid.slice(0, 8)}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Checklist tab */}
          {tab === 'checklist' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {totalCount > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginBottom: 5 }}>
                    <div style={{ height: '100%', width: `${Math.round((doneCount / totalCount) * 100)}%`, background: doneCount === totalCount ? 'var(--color-success)' : 'var(--accent)', borderRadius: 2, transition: 'width 300ms ease-out' }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{doneCount}/{totalCount}</div>
                </div>
              )}

              {ungrouped.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: item.is_done ? 'color-mix(in srgb, var(--color-success) 5%, transparent)' : 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <input type="checkbox" checked={item.is_done} onChange={() => void handleToggleCheck(item)} style={{ accentColor: 'var(--color-success)', width: 14, height: 14, cursor: 'pointer', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, color: item.is_done ? 'var(--text-muted)' : 'var(--text)', textDecoration: item.is_done ? 'line-through' : 'none' }}>{item.text}</span>
                  {canEdit && (
                    <button onClick={() => void handleDeleteCheck(item.id)} className="icon-btn" style={{ width: 18, height: 18, flexShrink: 0 }}>
                      <X size={10} />
                    </button>
                  )}
                </div>
              ))}

              {groups.map(group => {
                const gItems = checkItems.filter(c => c.group_id === group.id)
                const isCollapsed = collapsedGroups.has(group.id)
                const gDone = gItems.filter(i => i.is_done).length
                return (
                  <div key={group.id} style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                    <div
                      onClick={() => toggleGroup(group.id)}
                      style={{ padding: '8px 12px', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {isCollapsed
                          ? <ChevronRight size={12} strokeWidth={2} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          : <ChevronDown size={12} strokeWidth={2} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        }
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{group.title}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{gDone}/{gItems.length}</span>
                      </div>
                      {canEdit && (
                        <button
                          onClick={e => { e.stopPropagation(); void handleDeleteGroup(group.id) }}
                          className="icon-btn"
                          style={{ width: 18, height: 18 }}
                        >
                          <X size={11} />
                        </button>
                      )}
                    </div>
                    {!isCollapsed && (
                      <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {gItems.map(item => (
                          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', background: item.is_done ? 'color-mix(in srgb, var(--color-success) 5%, transparent)' : 'transparent', borderRadius: 6 }}>
                            <input type="checkbox" checked={item.is_done} onChange={() => void handleToggleCheck(item)} style={{ accentColor: 'var(--color-success)', width: 13, height: 13, cursor: 'pointer', flexShrink: 0 }} />
                            <span style={{ flex: 1, fontSize: 12, color: item.is_done ? 'var(--text-muted)' : 'var(--text)', textDecoration: item.is_done ? 'line-through' : 'none' }}>{item.text}</span>
                            {canEdit && (
                              <button onClick={() => void handleDeleteCheck(item.id)} className="icon-btn" style={{ width: 16, height: 16, flexShrink: 0 }}>
                                <X size={9} />
                              </button>
                            )}
                          </div>
                        ))}
                        {canEdit && (
                          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                            <input
                              style={{ ...inputStyle, height: 30, fontSize: 12 }}
                              placeholder="Новый пункт..."
                              onKeyDown={e => { if (e.key === 'Enter') { void handleAddCheck(group.id); (e.target as HTMLInputElement).value = '' } }}
                              onChange={e => setNewCheckText(e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {canEdit && (
                <>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <input
                      style={inputStyle}
                      value={newCheckText}
                      onChange={e => setNewCheckText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') void handleAddCheck() }}
                      placeholder="Новый пункт..."
                    />
                    <button onClick={() => void handleAddCheck()}
                      style={{ height: 36, padding: '0 12px', background: 'color-mix(in srgb, var(--color-success) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--color-success) 25%, transparent)', borderRadius: 8, color: 'var(--color-success)', fontSize: 16, cursor: 'pointer', flexShrink: 0, fontWeight: 600, lineHeight: 1 }}>+</button>
                  </div>
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
                        <button onClick={() => void handleAddGroup()} className="btn btn-primary" style={{ height: 36, fontSize: 12, flexShrink: 0 }}>Добавить</button>
                        <button onClick={() => setShowNewGroup(false)} className="icon-btn"><X size={14} /></button>
                      </div>
                    ) : (
                      <button onClick={() => setShowNewGroup(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', background: 'transparent', border: '1px dashed var(--border)', borderRadius: 8, color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>
                        <Plus size={12} />Группа
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Comments tab */}
          {tab === 'comments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {comments.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 13, color: 'var(--text-muted)' }}>Нет комментариев</div>
              )}
              {comments.map(c => {
                const isOwn = c.author_id === user?.id
                return (
                  <div key={c.id} style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                        {new Date(c.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {(isOwn || isPrivileged) && (
                        <button onClick={() => void handleDeleteComment(c.id)} className="icon-btn" style={{ width: 20, height: 20 }}>
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{c.text}</div>
                  </div>
                )
              })}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <input
                  style={inputStyle}
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) void handleAddComment() }}
                  placeholder="Написать комментарий..."
                />
                <button
                  onClick={() => void handleAddComment()}
                  disabled={!newComment.trim()}
                  style={{ height: 36, padding: '0 12px', background: 'var(--accent)', border: 'none', borderRadius: 8, color: 'var(--accent-fg)', fontSize: 14, cursor: newComment.trim() ? 'pointer' : 'default', flexShrink: 0, opacity: newComment.trim() ? 1 : 0.4, transition: 'opacity 150ms' }}>
                  ➤
                </button>
              </div>
            </div>
          )}

          {/* Activity tab */}
          {tab === 'activity' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {!actLoaded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
                </div>
              )}
              {actLoaded && activity.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 13, color: 'var(--text-muted)' }}>Нет активности</div>
              )}
              {activity.map(a => (
                <div key={a.id} style={{ display: 'flex', gap: 10, padding: '8px 10px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Activity size={12} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--text)' }}>
                      <span style={{ fontWeight: 600 }}>{a.profiles?.full_name ?? 'Система'}</span>{' '}
                      <span style={{ color: 'var(--text-muted)' }}>{a.action}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                      {new Date(a.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Attachments tab */}
          {tab === 'attachments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {attachments.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 13, color: 'var(--text-muted)' }}>Нет вложений</div>
              )}
              {attachments.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <Paperclip size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.url ? <a href={a.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>{a.name}</a> : a.name}
                    </div>
                    {a.size && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{(a.size / 1024).toFixed(0)} KB</div>}
                  </div>
                  {canEdit && (
                    <button
                      onClick={async () => { await tasksApi.deleteAttachment(task.id, a.id); setAttachments(prev => prev.filter(x => x.id !== a.id)) }}
                      className="icon-btn"
                      style={{ width: 22, height: 22, flexShrink: 0 }}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Create Task Modal ──────────────────────────────────────────────────────

function CreateTaskModal({ employees, projects, defaultStatus, onClose, onCreate }: {
  employees: Employee[]
  projects: TaskProject[]
  defaultStatus?: TaskStatus
  onClose: () => void
  onCreate: (t: Task) => void
}) {
  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [priority,    setPriority]    = useState<TaskPriority>('medium')
  const [status,      setStatus]      = useState<TaskStatus>(defaultStatus ?? 'new')
  const [assignedTo,  setAssignedTo]  = useState('')
  const [projectId,   setProjectId]   = useState('')
  const [deadline,    setDeadline]    = useState('')
  const [observers,   setObservers]   = useState<string[]>([])
  const [checkItems,  setCheckItems]  = useState<string[]>([])
  const [newCheck,    setNewCheck]    = useState('')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [showMore,    setShowMore]    = useState(false)

  const toggleObs = (pid: string) => setObservers(prev => prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid])
  const addCheck  = () => { if (!newCheck.trim()) return; setCheckItems(prev => [...prev, newCheck.trim()]); setNewCheck('') }

  const handleCreate = async () => {
    if (!title.trim()) { setError('Введите название'); return }
    setSaving(true); setError(null)
    try {
      const payload: CreateTaskPayload = {
        title: title.trim(), description: description.trim() || null,
        priority, status, assigned_to: assignedTo || null,
        observer_ids: observers, deadline: deadline || null,
        project_id: projectId || null,
      }
      const task = await tasksApi.create(payload)
      for (const text of checkItems) await tasksApi.addChecklistItem(task.id, text)
      const full = checkItems.length > 0 ? await tasksApi.getById(task.id) : task
      onCreate(full)
    } catch { setError('Не удалось создать задачу') } finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)' }} />
      <div className="modal-animate" style={{ position: 'relative', width: '100%', maxWidth: 520, maxHeight: '90vh', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', boxShadow: '0 24px 64px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>Новая задача</span>
          <button onClick={onClose} className="icon-btn"><X size={16} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {error && <div style={{ fontSize: 12, color: 'var(--color-danger)', marginBottom: 12, padding: '8px 12px', background: 'color-mix(in srgb, var(--color-danger) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--color-danger) 20%, transparent)', borderRadius: 8 }}>{error}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>Название *</label>
              <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="Название задачи" autoFocus
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) void handleCreate() }}
              />
            </div>
            <div>
              <label style={labelStyle}>Описание</label>
              <textarea
                style={{ padding: '8px 12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.5, minHeight: 60 }}
                value={description} onChange={e => setDescription(e.target.value)} placeholder="Описание (необязательно)" rows={2}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Приоритет</label>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}>
                  {(Object.keys(PRIORITY_LABELS) as TaskPriority[]).map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Статус</label>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={status} onChange={e => setStatus(e.target.value as TaskStatus)}>
                  {STANDARD_COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Исполнитель</label>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
                  <option value="">— Не назначен —</option>
                  {employees.map(e => <option key={e.id} value={e.profile_id ?? e.id}>{e.full_name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Срок</label>
                <input type="datetime-local" style={{ ...inputStyle, cursor: 'pointer' }} value={deadline} onChange={e => setDeadline(e.target.value)} />
              </div>
              {projects.length > 0 && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Проект</label>
                  <select style={{ ...inputStyle, cursor: 'pointer' }} value={projectId} onChange={e => setProjectId(e.target.value)}>
                    <option value="">— Без проекта —</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Expandable section */}
            <button
              onClick={() => setShowMore(p => !p)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', fontSize: 12, padding: '6px 12px', cursor: 'pointer', width: '100%', transition: 'border-color 150ms' }}
            >
              {showMore ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              <Users size={12} />Наблюдатели и чеклист
              {(observers.length > 0 || checkItems.length > 0) && (
                <span style={{ marginLeft: 'auto', background: 'var(--accent)', color: 'var(--accent-fg)', fontSize: 10, borderRadius: 10, padding: '1px 6px', fontVariantNumeric: 'tabular-nums' }}>
                  {observers.length + checkItems.length}
                </span>
              )}
            </button>

            {showMore && (
              <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Наблюдатели</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {employees.map(emp => {
                      const pid = emp.profile_id ?? emp.id
                      const sel = observers.includes(pid)
                      return (
                        <button key={emp.id} onClick={() => toggleObs(pid)} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, cursor: 'pointer', background: sel ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent', border: `1px solid ${sel ? 'color-mix(in srgb, var(--accent) 35%, transparent)' : 'var(--border)'}`, color: sel ? 'var(--accent)' : 'var(--text-muted)', transition: 'background 150ms, border-color 150ms' }}>
                          {emp.full_name}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Чеклист</div>
                  {checkItems.map((text, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', background: 'var(--bg-card)', borderRadius: 6, border: '1px solid var(--border)', marginBottom: 4 }}>
                      <span style={{ width: 12, height: 12, borderRadius: 3, border: '1px solid var(--border)', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 12, color: 'var(--text)' }}>{text}</span>
                      <button onClick={() => setCheckItems(prev => prev.filter((_, j) => j !== i))} className="icon-btn" style={{ width: 18, height: 18 }}><X size={11} /></button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <input style={{ ...inputStyle, height: 30, fontSize: 12 }} value={newCheck} onChange={e => setNewCheck(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addCheck() }} placeholder="Новый пункт..." />
                    <button onClick={addCheck} style={{ height: 30, padding: '0 10px', background: 'color-mix(in srgb, var(--color-success) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--color-success) 25%, transparent)', borderRadius: 7, color: 'var(--color-success)', fontSize: 16, cursor: 'pointer', flexShrink: 0, lineHeight: 1 }}>+</button>
                  </div>
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

// ─── Project Manager Panel ─────────────────────────────────────────────────

function ProjectManagerModal({ projects, onClose, onAdd, onDelete, onRename }: {
  projects: TaskProject[]
  onClose: () => void
  onAdd: (name: string, color: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onRename: (id: string, name: string) => Promise<void>
}) {
  const [newName,  setNewName]  = useState('')
  const [newColor, setNewColor] = useState('#6366f1')
  const [saving,   setSaving]   = useState(false)
  const [editId,   setEditId]   = useState<string | null>(null)
  const [editVal,  setEditVal]  = useState('')

  const handleAdd = async () => {
    if (!newName.trim()) return
    setSaving(true)
    await onAdd(newName.trim(), newColor)
    setNewName('')
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div className="modal-animate" style={{ position: 'relative', width: '100%', maxWidth: 420, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', boxShadow: '0 20px 60px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 18px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Проекты</span>
          <button onClick={onClose} className="icon-btn"><X size={15} /></button>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '50vh', overflowY: 'auto' }}>
          {projects.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
              {editId === p.id ? (
                <input
                  style={{ ...inputStyle, height: 28, flex: 1, fontSize: 12 }}
                  value={editVal}
                  onChange={e => setEditVal(e.target.value)}
                  onKeyDown={async e => {
                    if (e.key === 'Enter') { await onRename(p.id, editVal); setEditId(null) }
                    if (e.key === 'Escape') setEditId(null)
                  }}
                  autoFocus
                />
              ) : (
                <span style={{ flex: 1, fontSize: 13, color: 'var(--text)', cursor: 'text' }} onClick={() => { setEditId(p.id); setEditVal(p.name) }}>{p.name}</span>
              )}
              <button onClick={() => onDelete(p.id)} className="icon-btn" style={{ width: 22, height: 22 }}><Trash2 size={12} /></button>
            </div>
          ))}
          {projects.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>Нет проектов</div>}
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
          <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} style={{ width: 34, height: 34, borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', padding: 2, background: 'var(--bg)', flexShrink: 0 }} />
          <input style={{ ...inputStyle, flex: 1, height: 34, fontSize: 12 }} value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void handleAdd() }} placeholder="Название проекта..." />
          <button onClick={() => void handleAdd()} disabled={!newName.trim() || saving} className="btn btn-primary" style={{ height: 34, padding: '0 14px', fontSize: 12, flexShrink: 0 }}>
            <Plus size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main TasksPage ────────────────────────────────────────────────────────

type KanbanMode = 'standard' | 'custom'
type MyFilter   = 'all' | 'my' | 'observing'

export default function TasksPage() {
  const { user } = useAuth()
  const [tasks,          setTasks]          = useState<Task[]>([])
  const [loading,        setLoading]        = useState(true)
  const [employees,      setEmployees]      = useState<Employee[]>([])
  const [projects,       setProjects]       = useState<TaskProject[]>([])
  const [customCols,     setCustomCols]     = useState<TaskCustomColumn[]>([])

  const [selectedTask,   setSelectedTask]   = useState<Task | null>(null)
  const [showCreate,     setShowCreate]     = useState(false)
  const [createStatus,   setCreateStatus]   = useState<TaskStatus>('new')
  const [activeId,       setActiveId]       = useState<string | null>(null)

  const [search,         setSearch]         = useState('')
  const [filterPri,      setFilterPri]      = useState<TaskPriority | null>(null)
  const [filterProject,  setFilterProject]  = useState<string | null>(null)
  const [myFilter,       setMyFilter]       = useState<MyFilter>('all')
  const [mode,           setMode]           = useState<KanbanMode>('standard')
  const [showColMgr,     setShowColMgr]     = useState(false)
  const [showProjMgr,    setShowProjMgr]    = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const loadAll = useCallback(async () => {
    try {
      const [tasksData, empsData, projectsData, colsData] = await Promise.all([
        tasksApi.getAll(),
        employeesApi.getAll(),
        taskProjectsApi.getAll().catch(() => [] as TaskProject[]),
        taskColumnsApi.getAll().catch(() => [] as TaskCustomColumn[]),
      ])
      setTasks(tasksData)
      setEmployees(empsData)
      setProjects(projectsData)
      setCustomCols(colsData)
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { void loadAll() }, [loadAll])

  const filterTask = useCallback((t: Task) => {
    const ns = normalizeStatus(t.status)
    if (filterPri     && t.priority !== filterPri)      return false
    if (filterProject && t.project_id !== filterProject) return false
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    const userId = user?.id
    if (myFilter === 'my' && t.assigned_to !== userId && t.created_by !== userId) return false
    if (myFilter === 'observing' && (!userId || !t.observer_ids.includes(userId))) return false
    return true
  }, [filterPri, filterProject, search, myFilter, user?.id])

  const getStandardColTasks = (colId: TaskStatus) =>
    tasks.filter(t => normalizeStatus(t.status) === colId && filterTask(t))
      .sort((a, b) => {
        const aOver = a.deadline && new Date(a.deadline) < new Date() ? 0 : 1
        const bOver = b.deadline && new Date(b.deadline) < new Date() ? 0 : 1
        return aOver - bOver
      })

  const getCustomColTasks = (colId: string | null) =>
    tasks.filter(t => {
      if (!filterTask(t)) return false
      return true
    }).filter(t => {
      if (colId === 'done')   return normalizeStatus(t.status) === 'done' || normalizeStatus(t.status) === 'cancelled'
      if (colId === null)     return normalizeStatus(t.status) === 'new'
      return false
    })

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string)

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over) return
    const taskId  = active.id as string
    const overId  = over.id as string
    const task    = tasks.find(t => t.id === taskId)
    if (!task) return

    if (mode === 'standard') {
      const newStatus = overId as TaskStatus
      if (normalizeStatus(task.status) === newStatus) return
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
      try {
        const updated = await tasksApi.updateStatus(taskId, newStatus)
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updated } : t))
      } catch { void loadAll() }
    } else {
      const colId = overId === '__none__' ? null : overId
      try {
        await tasksApi.moveToColumn(taskId, colId)
      } catch { /* ignore */ }
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

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null
  const filteredCount = tasks.filter(filterTask).length

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton className="h-6 w-24 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-[400px] rounded-xl" style={{ flex: '0 0 250px' }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px - 42px)', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ marginBottom: 10, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', margin: 0, marginBottom: 1, letterSpacing: '-0.02em' }}>Задачи</h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              {filteredCount} задач
              {filterProject && projects.length > 0 && ` · ${projects.find(p => p.id === filterProject)?.name}`}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {/* Mode toggle */}
            <div style={{ display: 'flex', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              {(['standard', 'custom'] as KanbanMode[]).map((m, i) => (
                <button key={m} onClick={() => setMode(m)}
                  style={{
                    height: 32, padding: '0 12px',
                    background: mode === m ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent',
                    border: 'none', borderRight: i === 0 ? '1px solid var(--border)' : 'none',
                    color: mode === m ? 'var(--accent)' : 'var(--text-muted)',
                    fontSize: 12, cursor: 'pointer', fontWeight: mode === m ? 600 : 400,
                    transition: 'background 150ms, color 150ms',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                  {m === 'standard' ? <><Layers size={12} />Стандарт</> : <><AlignLeft size={12} />Личный</>}
                </button>
              ))}
            </div>

            {/* My filter */}
            <div style={{ display: 'flex', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              {(['all', 'my', 'observing'] as MyFilter[]).map((f, i) => (
                <button key={f} onClick={() => setMyFilter(f)}
                  style={{
                    height: 32, padding: '0 10px',
                    background: myFilter === f ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent',
                    border: 'none', borderRight: i < 2 ? '1px solid var(--border)' : 'none',
                    color: myFilter === f ? 'var(--accent)' : 'var(--text-muted)',
                    fontSize: 12, cursor: 'pointer', fontWeight: myFilter === f ? 600 : 400,
                    transition: 'background 150ms, color 150ms',
                  }}>
                  {f === 'all' ? 'Все' : f === 'my' ? 'Мои' : 'Наблюдаю'}
                </button>
              ))}
            </div>

            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                style={{ ...inputStyle, width: 170, height: 32, paddingLeft: 28, fontSize: 12 }}
                placeholder="Поиск..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Priority filter */}
            <div style={{ display: 'flex', gap: 3 }}>
              {(['critical', 'high', 'medium', 'low'] as TaskPriority[]).map(p => (
                <button key={p} onClick={() => setFilterPri(filterPri === p ? null : p)}
                  style={{
                    height: 32, width: 32, borderRadius: 7, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: filterPri === p ? `color-mix(in srgb, ${PRIORITY_COLORS[p]} 12%, transparent)` : 'transparent',
                    border: `1px solid ${filterPri === p ? `color-mix(in srgb, ${PRIORITY_COLORS[p]} 35%, transparent)` : 'var(--border)'}`,
                    transition: 'background 150ms, border-color 150ms',
                  }}>
                  <Flag size={11} style={{ color: PRIORITY_COLORS[p] }} />
                </button>
              ))}
            </div>

            {/* Project filter */}
            {projects.length > 0 && (
              <select
                style={{ ...inputStyle, width: 'auto', minWidth: 120, height: 32, fontSize: 12, cursor: 'pointer' }}
                value={filterProject ?? ''}
                onChange={e => setFilterProject(e.target.value || null)}
              >
                <option value="">Все проекты</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}

            {/* Tools */}
            {mode === 'custom' && (
              <button onClick={() => setShowColMgr(true)} className="icon-btn" style={{ width: 32, height: 32 }} title="Настройка колонок">
                <Settings2 size={14} />
              </button>
            )}
            <button onClick={() => setShowProjMgr(true)} className="icon-btn" style={{ width: 32, height: 32 }} title="Проекты">
              <FolderOpen size={14} />
            </button>
            <button onClick={() => void loadAll()} className="icon-btn" style={{ width: 32, height: 32 }} title="Обновить">
              <RotateCcw size={13} />
            </button>
            <button onClick={() => { setCreateStatus('new'); setShowCreate(true) }} className="btn btn-primary" style={{ height: 32, gap: 5, fontSize: 13, padding: '0 14px', flexShrink: 0 }}>
              <Plus size={14} strokeWidth={2.5} />Задача
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', flex: 1, paddingBottom: 8 }}>

          {mode === 'standard' && STANDARD_COLUMNS.map(col => (
            <KanbanColumn
              key={col.id}
              id={col.id}
              label={col.label}
              color={col.color}
              icon={col.icon}
              tasks={getStandardColTasks(col.id)}
              employees={employees}
              projects={projects}
              onAdd={() => { setCreateStatus(col.id !== 'done' && col.id !== 'cancelled' ? col.id : 'new'); setShowCreate(true) }}
              onCardClick={t => setSelectedTask(t)}
            />
          ))}

          {mode === 'custom' && (
            <>
              {/* New column (always first) */}
              <KanbanColumn
                id="new"
                label="Входящие"
                color="var(--text-muted)"
                icon={<Circle size={12} />}
                tasks={tasks.filter(t => normalizeStatus(t.status) === 'new' && filterTask(t))}
                employees={employees}
                projects={projects}
                onAdd={() => { setCreateStatus('new'); setShowCreate(true) }}
                onCardClick={t => setSelectedTask(t)}
              />
              {customCols.map(col => (
                <KanbanColumn
                  key={col.id}
                  id={col.id}
                  label={col.name}
                  color={col.color}
                  tasks={tasks.filter(t => filterTask(t) && t.status !== 'new' && t.status !== 'done' && t.status !== 'cancelled').slice(0, 0)}
                  employees={employees}
                  projects={projects}
                  onAdd={() => { setCreateStatus('in_progress'); setShowCreate(true) }}
                  onCardClick={t => setSelectedTask(t)}
                />
              ))}
              {customCols.length === 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 250, background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)', flexShrink: 0 }}>
                  <button onClick={() => setShowColMgr(true)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 20 }}>
                    <Plus size={20} />
                    <span style={{ fontSize: 12 }}>Добавить колонку</span>
                  </button>
                </div>
              )}
              {/* Done column (always last) */}
              <KanbanColumn
                id="done"
                label="Завершено"
                color="var(--color-success)"
                icon={<CheckSquare size={12} />}
                tasks={tasks.filter(t => (normalizeStatus(t.status) === 'done' || normalizeStatus(t.status) === 'cancelled') && filterTask(t))}
                employees={employees}
                projects={projects}
                onAdd={() => { setCreateStatus('done'); setShowCreate(true) }}
                onCardClick={t => setSelectedTask(t)}
              />
            </>
          )}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div style={{ transform: 'rotate(1deg)', opacity: 0.92, cursor: 'grabbing' }}>
              <TaskCardContent task={activeTask} employees={employees} projects={projects} onClick={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modals */}
      {showCreate && (
        <CreateTaskModal
          employees={employees}
          projects={projects}
          defaultStatus={createStatus}
          onClose={() => setShowCreate(false)}
          onCreate={handleTaskCreate}
        />
      )}

      {selectedTask && (
        <TaskDrawer
          task={selectedTask}
          employees={employees}
          projects={projects}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskUpdate}
          onDelete={id => void handleTaskDelete(id)}
        />
      )}

      {showColMgr && (
        <ColumnManagerModal
          columns={customCols}
          onClose={() => setShowColMgr(false)}
          onAdd={async name => {
            const col = await taskColumnsApi.create({ name })
            setCustomCols(prev => [...prev, col])
          }}
          onDelete={async id => {
            await taskColumnsApi.delete(id)
            setCustomCols(prev => prev.filter(c => c.id !== id))
          }}
          onRename={async (id, name) => {
            const col = await taskColumnsApi.update(id, { name })
            setCustomCols(prev => prev.map(c => c.id === id ? col : c))
          }}
        />
      )}

      {showProjMgr && (
        <ProjectManagerModal
          projects={projects}
          onClose={() => setShowProjMgr(false)}
          onAdd={async (name, color) => {
            const p = await taskProjectsApi.create({ name, color })
            setProjects(prev => [...prev, p])
          }}
          onDelete={async id => {
            await taskProjectsApi.delete(id)
            setProjects(prev => prev.filter(p => p.id !== id))
          }}
          onRename={async (id, name) => {
            const p = await taskProjectsApi.update(id, { name })
            setProjects(prev => prev.map(x => x.id === id ? p : x))
          }}
        />
      )}
    </div>
  )
}
