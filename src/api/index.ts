import { api } from '../lib/api'
import type { Membership, ScheduleItem, Booking } from '../types'

export const membershipsApi = {
  getByClient: async (clientId: string): Promise<Membership[]> => {
    const { data } = await api.get('/memberships', { params: { client_id: clientId } })
    return data
  },

  create: async (payload: Partial<Membership>): Promise<Membership> => {
    const { data } = await api.post('/memberships', payload)
    return data
  },

  update: async (id: string, payload: Partial<Membership>): Promise<Membership> => {
    const { data } = await api.patch(`/memberships/${id}`, payload)
    return data
  }
}

export const scheduleApi = {
  getAll: async (from?: string, to?: string): Promise<ScheduleItem[]> => {
    const { data } = await api.get('/schedule', { params: { from, to } })
    return data
  },

  create: async (payload: Partial<ScheduleItem>): Promise<ScheduleItem> => {
    const { data } = await api.post('/schedule', payload)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/schedule/${id}`)
  }
}

export const bookingsApi = {
  create: async (payload: { scheduleId: string; clientId: string; membershipId?: string }): Promise<Booking> => {
    const { data } = await api.post('/bookings', {
      schedule_id: payload.scheduleId,
      client_id: payload.clientId,
      membership_id: payload.membershipId
    })
    return data
  },

  attend: async (id: string): Promise<void> => {
    await api.patch(`/bookings/${id}/attend`)
  },

  cancel: async (id: string): Promise<void> => {
    await api.delete(`/bookings/${id}`)
  }
}
