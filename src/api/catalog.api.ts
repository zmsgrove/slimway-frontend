import { api } from '../lib/api'
import type { CatalogItem } from '../types'

export const catalogApi = {
  getAll: async (): Promise<CatalogItem[]> => {
    const { data } = await api.get('/catalog')
    return data
  },

  create: async (payload: {
    name: string
    sku?: string | null
    category?: string
    unit?: string | null
    description?: string | null
    price?: number | null
  }): Promise<CatalogItem> => {
    const { data } = await api.post('/catalog', payload)
    return data
  },

  update: async (id: string, payload: Partial<Omit<CatalogItem, 'id' | 'created_at'>>): Promise<CatalogItem> => {
    const { data } = await api.patch(`/catalog/${id}`, payload)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/catalog/${id}`)
  },
}
