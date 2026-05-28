import { api } from '../lib/api'
import type { Shift } from '../types'

export const shiftsApi = {
  getWeek: async (weekStart: string, weekEnd: string): Promise<Shift[]> => {
    const { data } = await api.get('/shifts', { params: { week_start: weekStart, week_end: weekEnd } })
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

  checkin: async (id: string, payload: { location?: string; is_own_shift?: boolean }): Promise<void> => {
    await api.post(`/shifts/${id}/checkin`, payload)
  },

  checkout: async (id: string): Promise<void> => {
    await api.post(`/shifts/${id}/checkout`, {})
  },
}
