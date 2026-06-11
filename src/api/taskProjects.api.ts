import { api } from '../lib/api'
import type { TaskProject } from '../types'

export const taskProjectsApi = {
  getAll: async (): Promise<TaskProject[]> => {
    const { data } = await api.get('/task-projects')
    return data
  },

  create: async (payload: { name: string; color?: string }): Promise<TaskProject> => {
    const { data } = await api.post('/task-projects', payload)
    return data
  },

  update: async (id: string, payload: { name?: string; color?: string }): Promise<TaskProject> => {
    const { data } = await api.patch(`/task-projects/${id}`, payload)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/task-projects/${id}`)
  },
}
