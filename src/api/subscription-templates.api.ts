import { api } from '../lib/api'
import type { SubscriptionTemplate } from '../types'

export const subscriptionTemplatesApi = {
  getAll: async (): Promise<SubscriptionTemplate[]> => {
    const { data } = await api.get('/subscription-templates')
    return data
  },

  create: async (payload: Omit<SubscriptionTemplate, 'id' | 'branch_id' | 'is_active' | 'created_at'>): Promise<SubscriptionTemplate> => {
    const { data } = await api.post('/subscription-templates', payload)
    return data
  },

  update: async (id: string, payload: Partial<Pick<SubscriptionTemplate, 'name' | 'validity_days' | 'price' | 'is_active'>>): Promise<SubscriptionTemplate> => {
    const { data } = await api.patch(`/subscription-templates/${id}`, payload)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/subscription-templates/${id}`)
  },
}
