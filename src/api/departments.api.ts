import { api } from '../lib/api'
import type { Department, Position } from '../types'

export const departmentsApi = {
  getAll: async (): Promise<Department[]> => {
    const { data } = await api.get('/departments')
    return data
  },

  create: async (name: string): Promise<Department> => {
    const { data } = await api.post('/departments', { name })
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/departments/${id}`)
  },
}

export const positionsApi = {
  getAll: async (): Promise<Position[]> => {
    const { data } = await api.get('/positions')
    return data
  },

  create: async (name: string): Promise<Position> => {
    const { data } = await api.post('/positions', { name })
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/positions/${id}`)
  },
}
