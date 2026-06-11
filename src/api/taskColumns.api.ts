import { api } from '../lib/api'
import type { TaskCustomColumn } from '../types'

export const taskColumnsApi = {
  getAll: async (): Promise<TaskCustomColumn[]> => {
    const { data } = await api.get('/task-columns')
    return data
  },

  create: async (payload: { name: string; color?: string }): Promise<TaskCustomColumn> => {
    const { data } = await api.post('/task-columns', payload)
    return data
  },

  update: async (id: string, payload: { name?: string; color?: string; position?: number }): Promise<TaskCustomColumn> => {
    const { data } = await api.patch(`/task-columns/${id}`, payload)
    return data
  },

  reorder: async (updates: Array<{ id: string; position: number }>): Promise<void> => {
    await api.patch('/task-columns/reorder', updates)
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/task-columns/${id}`)
  },
}
