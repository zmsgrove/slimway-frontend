import { api } from '../lib/api'
import type { Employee } from '../types'

export const employeesApi = {
  getAll: async (): Promise<Employee[]> => {
    const { data } = await api.get('/employees')
    return data
  },

  create: async (payload: {
    full_name: string
    phone?: string
    birth_date?: string
    position?: string
    department?: string
    profile_id?: string
  }): Promise<Employee> => {
    const { data } = await api.post('/employees', payload)
    return data
  },

  update: async (id: string, payload: Partial<{
    full_name: string
    phone: string | null
    birth_date: string | null
    position: string | null
    department: string | null
  }>): Promise<Employee> => {
    const { data } = await api.patch(`/employees/${id}`, payload)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/employees/${id}`)
  },
}
