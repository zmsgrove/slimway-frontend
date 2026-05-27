import { api } from '../lib/api'
import type { ScheduleSlot } from '../types'

export interface BookingV2Result {
  id: string
  client_id: string
  subscription_id: string
  branch_id: string
  date: string
  slot_1_schedule_slot_id: string
  slot_2_schedule_slot_id: string | null
  created_by: string
  created_at: string
}

export interface BookingV2Error {
  error: string
  code: string
  next_available?: { date: string; time_start: string } | null
  slot_2_type?: string
  required_time?: string
}

export const scheduleSlotsApi = {
  getByDate: async (date: string): Promise<ScheduleSlot[]> => {
    const { data } = await api.get('/schedule-slots', { params: { date } })
    return data
  },

  create: async (payload: {
    device_id: string
    date: string
    time_start: string
    time_end: string
  }): Promise<ScheduleSlot> => {
    const { data } = await api.post('/schedule-slots', payload)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/schedule-slots/${id}`)
  },
}

export const bookingsV2Api = {
  create: async (payload: {
    client_id: string
    subscription_id: string
    slot_1_schedule_slot_id: string
    date: string
  }): Promise<BookingV2Result> => {
    const { data } = await api.post('/bookings-v2', payload)
    return data
  },

  cancel: async (id: string): Promise<void> => {
    await api.delete(`/bookings-v2/${id}`)
  },
}
