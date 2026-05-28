import { api } from '../lib/api'
import type { Lead, LeadComment, LeadStatus } from '../types'

export const leadsApi = {
  getAll: async (params?: { status?: LeadStatus; archived?: boolean }): Promise<Lead[]> => {
    const { data } = await api.get('/leads', { params })
    return data
  },

  getById: async (id: string): Promise<Lead> => {
    const { data } = await api.get(`/leads/${id}`)
    return data
  },

  create: async (payload: {
    full_name: string
    phone?: string
    source?: string
    notes?: string
    assigned_to?: string
  }): Promise<Lead> => {
    const { data } = await api.post('/leads', payload)
    return data
  },

  update: async (id: string, payload: Partial<{
    full_name: string
    phone: string | null
    source: string
    notes: string | null
    assigned_to: string | null
    status: LeadStatus
    client_id: string | null
  }>): Promise<Lead> => {
    const { data } = await api.patch(`/leads/${id}`, payload)
    return data
  },

  updateStatus: async (id: string, status: LeadStatus): Promise<Lead> => {
    const { data } = await api.patch(`/leads/${id}/status`, { status })
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/leads/${id}`)
  },

  addComment: async (id: string, text: string): Promise<LeadComment> => {
    const { data } = await api.post(`/leads/${id}/comments`, { text })
    return data
  },
}
