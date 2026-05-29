import { api } from '../lib/api'
import type { Task, TaskChecklistItem, TaskComment, TaskStatus, TaskPriority } from '../types'

export interface CreateTaskPayload {
  title: string
  description?: string | null
  priority?: TaskPriority
  status?: TaskStatus
  assigned_to?: string | null
  observer_ids?: string[]
  deadline?: string | null
}

export const tasksApi = {
  getAll: async (): Promise<Task[]> => {
    const { data } = await api.get('/tasks')
    return data
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

  delete: async (id: string): Promise<void> => {
    await api.delete(`/tasks/${id}`)
  },

  addChecklistItem: async (taskId: string, text: string): Promise<TaskChecklistItem> => {
    const { data } = await api.post(`/tasks/${taskId}/checklists`, { text })
    return data
  },

  toggleChecklistItem: async (taskId: string, itemId: string, is_done: boolean): Promise<TaskChecklistItem> => {
    const { data } = await api.patch(`/tasks/${taskId}/checklists/${itemId}`, { is_done })
    return data
  },

  addComment: async (taskId: string, text: string): Promise<TaskComment> => {
    const { data } = await api.post(`/tasks/${taskId}/comments`, { text })
    return data
  },
}
