import { api } from '../lib/api'
import type { Client } from '../types'

export const clientsApi = {
  getAll: async (search?: string): Promise<Client[]> => {
    const { data } = await api.get('/clients', { params: { search } })
    return data
  },

  getById: async (id: string): Promise<Client> => {
    const { data } = await api.get(`/clients/${id}`)
    return data
  },

  create: async (payload: Partial<Client>): Promise<Client> => {
    const { data } = await api.post('/clients', payload)
    return data
  },

  update: async (id: string, payload: Partial<Client>): Promise<Client> => {
    const { data } = await api.patch(`/clients/${id}`, payload)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/clients/${id}`)
  }
}
