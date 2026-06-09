import { api } from '../lib/api'

export interface WebhookEndpoint {
  id: string
  name: string
  url: string
  events: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface WebhookLog {
  id: string
  event_type: string
  response_status: number | null
  delivered: boolean
  attempt: number
  created_at: string
}

export interface CreateWebhookPayload {
  name: string
  url: string
  events: string[]
  secret?: string
}

export interface UpdateWebhookPayload {
  name?: string
  url?: string
  events?: string[]
  secret?: string
  is_active?: boolean
}

export const webhooksApi = {
  getAll: async (): Promise<WebhookEndpoint[]> => {
    const { data } = await api.get<WebhookEndpoint[]>('/webhooks')
    return data
  },

  create: async (payload: CreateWebhookPayload): Promise<WebhookEndpoint> => {
    const { data } = await api.post<WebhookEndpoint>('/webhooks', payload)
    return data
  },

  update: async (id: string, payload: UpdateWebhookPayload): Promise<WebhookEndpoint> => {
    const { data } = await api.patch<WebhookEndpoint>(`/webhooks/${id}`, payload)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/webhooks/${id}`)
  },

  getLogs: async (id: string): Promise<WebhookLog[]> => {
    const { data } = await api.get<WebhookLog[]>(`/webhooks/${id}/logs`)
    return data
  },

  test: async (id: string): Promise<{ ok: boolean; message: string }> => {
    const { data } = await api.post<{ ok: boolean; message: string }>(`/webhooks/${id}/test`, {})
    return data
  },
}
