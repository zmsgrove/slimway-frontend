import { api } from '../lib/api'
import type { Subscription, SubscriptionRenewal, DeviceType } from '../types'

export interface CreateSubscriptionPayload {
  client_id: string
  name: string
  slot_1_type: DeviceType
  slot_1_duration_min: number
  slot_1_sessions_total: number
  slot_2_type?: DeviceType | null
  slot_2_duration_min?: number | null
  slot_2_sessions_total?: number | null
  slot_3_type?: DeviceType | null
  slot_3_duration_min?: number | null
  slot_3_sessions_total?: number | null
  slot_4_type?: DeviceType | null
  slot_4_duration_min?: number | null
  slot_4_sessions_total?: number | null
  is_trial?: boolean
  date_start: string
  date_end?: string | null
  price?: number | null
}

export const subscriptionsApi = {
  getAll: async (params?: { client_id?: string; status?: string }): Promise<Subscription[]> => {
    const { data } = await api.get('/subscriptions', { params })
    return data
  },

  getById: async (id: string): Promise<Subscription> => {
    const { data } = await api.get(`/subscriptions/${id}`)
    return data
  },

  create: async (payload: CreateSubscriptionPayload): Promise<Subscription> => {
    const { data } = await api.post('/subscriptions', payload)
    return data
  },

  patch: async (id: string, payload: Partial<Subscription>): Promise<Subscription> => {
    const { data } = await api.patch(`/subscriptions/${id}`, payload)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/subscriptions/${id}`)
  },

  freeze: async (id: string, frozenUntil: string): Promise<Subscription> => {
    const { data } = await api.post(`/subscriptions/${id}/freeze`, { frozen_until: frozenUntil })
    return data
  },

  unfreeze: async (id: string): Promise<Subscription> => {
    const { data } = await api.post(`/subscriptions/${id}/unfreeze`)
    return data
  },

  getRenewals: async (id: string): Promise<SubscriptionRenewal[]> => {
    const { data } = await api.get(`/subscriptions/${id}/renewals`)
    return data
  },
}
