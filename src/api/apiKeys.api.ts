import { api } from '../lib/api'

export interface ApiKey {
  id: string
  name: string
  key_prefix: string
  scopes: string[]
  is_active: boolean
  last_used_at: string | null
  expires_at: string | null
  created_at: string
}

export interface CreateApiKeyPayload {
  name: string
  scopes: string[]
  expires_at?: string
}

export interface ApiKeyCreated extends ApiKey {
  raw_key: string
}

export const apiKeysApi = {
  getAll: async (): Promise<ApiKey[]> => {
    const { data } = await api.get<ApiKey[]>('/api-keys')
    return data
  },

  create: async (payload: CreateApiKeyPayload): Promise<ApiKeyCreated> => {
    const { data } = await api.post<ApiKeyCreated>('/api-keys', payload)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api-keys/${id}`)
  },
}
