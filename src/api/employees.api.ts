import { api } from '../lib/api'
import type { Employee } from '../types'

export interface CreateEmployeePayload {
  first_name: string
  last_name: string
  middle_name?: string
  phone?: string
  birth_date?: string
  address?: string
  position: string
  department?: string
  email: string
  password: string
}

export const employeesApi = {
  getAll: async (): Promise<Employee[]> => {
    const { data } = await api.get('/employees')
    return data
  },

  create: async (payload: CreateEmployeePayload): Promise<Employee> => {
    const { data } = await api.post('/employees', payload)
    return data
  },

  update: async (id: string, payload: Partial<{
    first_name: string
    last_name: string
    middle_name: string | null
    full_name: string
    phone: string | null
    birth_date: string | null
    position: string | null
    department: string | null
    address: string | null
    salary_rate: number | null
    payment_type: 'hourly' | 'fixed' | 'percent' | null
    base_salary: number | null
    kpi_amount: number | null
    sales_percent: number | null
  }>): Promise<Employee> => {
    const { data } = await api.patch(`/employees/${id}`, payload)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/employees/${id}`)
  },

  patchRole: async (id: string, payload: { role: string; branch_id: string | null }): Promise<void> => {
    await api.patch(`/employees/${id}/role`, payload)
  },
}
