import { api } from '../lib/api'
import type { SubscriptionTemplate, DeviceType } from '../types'

export interface SubscriptionTemplatePayload {
  name: string
  validity_days: number
  price: number | null
  is_trial: boolean
  finish_slot: number | null
  slot_1_type: DeviceType
  slot_1_duration_min: number
  slot_1_sessions_total: number
  slot_2_type: DeviceType | null
  slot_2_duration_min: number | null
  slot_2_sessions_total: number | null
  slot_3_type: DeviceType | null
  slot_3_duration_min: number | null
  slot_3_sessions_total: number | null
  slot_4_type: DeviceType | null
  slot_4_duration_min: number | null
  slot_4_sessions_total: number | null
}

export const subscriptionTemplatesApi = {
  getAll: async (): Promise<SubscriptionTemplate[]> => {
    const { data } = await api.get('/subscription-templates')
    return data
  },

  create: async (payload: SubscriptionTemplatePayload): Promise<SubscriptionTemplate> => {
    const { data } = await api.post('/subscription-templates', payload)
    return data
  },

  update: async (id: string, payload: Partial<SubscriptionTemplatePayload> & { is_active?: boolean }): Promise<SubscriptionTemplate> => {
    const { data } = await api.patch(`/subscription-templates/${id}`, payload)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/subscription-templates/${id}`)
  },
}
