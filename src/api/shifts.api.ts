import { api } from '../lib/api'
import type { Shift } from '../types'

export const shiftsApi = {
  getWeek: async (weekStart: string, weekEnd: string): Promise<Shift[]> => {
    const { data } = await api.get('/shifts', { params: { week_start: weekStart, week_end: weekEnd } })
    return data
  },

  getByEmployee: async (employee_id: string): Promise<Shift[]> => {
    const { data } = await api.get('/shifts', { params: { employee_id } })
    return data
  },

  bulkCreate: async (shifts: Array<{
    employee_id: string
    date: string
    time_start: string
    time_end: string
    status?: string
  }>): Promise<Shift[]> => {
    const { data } = await api.post('/shifts/bulk', { shifts })
    return data
  },

  create: async (payload: {
    employee_id: string
    date: string
    time_start: string
    time_end: string
  }): Promise<Shift> => {
    const { data } = await api.post('/shifts', payload)
    return data
  },

  update: async (id: string, payload: Partial<{
    time_start: string
    time_end: string
    status: string
    date: string
  }>): Promise<Shift> => {
    const { data } = await api.patch(`/shifts/${id}`, payload)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/shifts/${id}`)
  },

  bulkDelete: async (payload: { employee_id: string; date_from: string; date_end: string }): Promise<void> => {
    await api.delete('/shifts/bulk', { data: payload })
  },

  checkin: async (id: string, payload: {
    location?: string
    geo_lat?: number
    geo_lng?: number
    checkin_type?: 'regular' | 'replacement' | 'day_off_work'
    replaces_employee_id?: string
  }): Promise<void> => {
    await api.post(`/shifts/${id}/checkin`, payload)
  },

  checkout: async (id: string): Promise<void> => {
    await api.post(`/shifts/${id}/checkout`, {})
  },
}
