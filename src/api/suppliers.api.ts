import { api } from '../lib/api'
import type { Supplier } from '../types'

export const suppliersApi = {
  getAll: async (): Promise<Supplier[]> => {
    const { data } = await api.get('/suppliers')
    return data
  },

  create: async (payload: { name: string; phone?: string | null; email?: string | null; notes?: string | null }): Promise<Supplier> => {
    const { data } = await api.post('/suppliers', payload)
    return data
  },

  patch: async (id: string, payload: Partial<Omit<Supplier, 'id' | 'branch_id' | 'created_at'>>): Promise<Supplier> => {
    const { data } = await api.patch(`/suppliers/${id}`, payload)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/suppliers/${id}`)
  },
}
