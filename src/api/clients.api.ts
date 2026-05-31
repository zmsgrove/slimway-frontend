import { api } from '../lib/api'
import type { Client, ClientDetail } from '../types'

export const clientsApi = {
  getAll: async (search?: string): Promise<Client[]> => {
    const { data } = await api.get('/clients', { params: { search } })
    return data
  },

  getById: async (id: string): Promise<ClientDetail> => {
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
  },

  freeze: async (id: string, freeze_until: string): Promise<Client> => {
    const { data } = await api.post(`/clients/${id}/freeze`, { freeze_until })
    return data
  },

  unfreeze: async (id: string): Promise<Client> => {
    const { data } = await api.post(`/clients/${id}/unfreeze`)
    return data
  },
}
