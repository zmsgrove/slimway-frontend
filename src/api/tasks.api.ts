import { api } from '../lib/api'
import type { Task, TaskChecklistItem, TaskChecklistGroup, TaskComment, TaskStatus, TaskPriority, TaskActivity, TaskAttachment } from '../types'

export interface CreateTaskPayload {
  title: string
  description?: string | null
  priority?: TaskPriority
  status?: TaskStatus
  assigned_to?: string | null
  observer_ids?: string[]
  deadline?: string | null
  project_id?: string | null
}

export const tasksApi = {
  getAll: async (params?: { from?: string; to?: string; date_field?: 'created_at' | 'deadline' }): Promise<Task[]> => {
    const { data } = await api.get('/tasks', { params })
    return (data as { data: Task[] }).data ?? data
  },

  getById: async (id: string): Promise<Task> => {
    const { data } = await api.get(`/tasks/${id}`)
    return data
  },

  create: async (payload: CreateTaskPayload): Promise<Task> => {
    const { data } = await api.post('/tasks', payload)
    return data
  },

  patch: async (id: string, payload: Partial<Task>): Promise<Task> => {
    const { data } = await api.patch(`/tasks/${id}`, payload)
    return data
  },

  updateStatus: async (id: string, status: TaskStatus): Promise<Task> => {
    const { data } = await api.patch(`/tasks/${id}/status`, { status })
    return data
  },

  confirmClose: async (id: string): Promise<Task> => {
    const { data } = await api.post(`/tasks/${id}/confirm-close`)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/tasks/${id}`)
  },

  addChecklistItem: async (taskId: string, text: string, groupId?: string | null): Promise<TaskChecklistItem> => {
    const { data } = await api.post(`/tasks/${taskId}/checklists`, { text, group_id: groupId ?? null })
    return data
  },

  toggleChecklistItem: async (taskId: string, itemId: string, is_done: boolean): Promise<TaskChecklistItem> => {
    const { data } = await api.patch(`/tasks/${taskId}/checklists/${itemId}`, { is_done })
    return data
  },

  addChecklistGroup: async (taskId: string, title: string): Promise<TaskChecklistGroup> => {
    const { data } = await api.post(`/tasks/${taskId}/checklist-groups`, { title })
    return data
  },

  addChecklistGroupItem: async (taskId: string, groupId: string, text: string): Promise<TaskChecklistItem> => {
    const { data } = await api.post(`/tasks/${taskId}/checklist-groups/${groupId}/items`, { text })
    return data
  },

  deleteChecklistGroup: async (taskId: string, groupId: string): Promise<void> => {
    await api.delete(`/tasks/${taskId}/checklist-groups/${groupId}`)
  },

  addComment: async (taskId: string, text: string): Promise<TaskComment> => {
    const { data } = await api.post(`/tasks/${taskId}/comments`, { text })
    return data
  },

  deleteComment: async (taskId: string, commentId: string): Promise<void> => {
    await api.delete(`/tasks/${taskId}/comments/${commentId}`)
  },

  deleteChecklistItem: async (taskId: string, itemId: string): Promise<void> => {
    await api.delete(`/tasks/${taskId}/checklists/${itemId}`)
  },

  addObserver: async (taskId: string, profileId: string): Promise<void> => {
    await api.post(`/tasks/${taskId}/observers`, { profile_id: profileId })
  },

  removeObserver: async (taskId: string, profileId: string): Promise<void> => {
    await api.delete(`/tasks/${taskId}/observers/${profileId}`)
  },

  moveToColumn: async (taskId: string, columnId: string | null, position?: number): Promise<void> => {
    await api.patch(`/tasks/${taskId}/column`, { column_id: columnId, position: position ?? 0 })
  },

  getActivity: async (taskId: string): Promise<TaskActivity[]> => {
    const { data } = await api.get(`/tasks/${taskId}/activity`)
    return data
  },

  getAttachments: async (taskId: string): Promise<TaskAttachment[]> => {
    const { data } = await api.get(`/tasks/${taskId}/attachments`)
    return data
  },

  addAttachment: async (taskId: string, payload: { name: string; url?: string | null; size?: number | null; mime_type?: string | null }): Promise<TaskAttachment> => {
    const { data } = await api.post(`/tasks/${taskId}/attachments`, payload)
    return data
  },

  deleteAttachment: async (taskId: string, attachmentId: string): Promise<void> => {
    await api.delete(`/tasks/${taskId}/attachments/${attachmentId}`)
  },
}
