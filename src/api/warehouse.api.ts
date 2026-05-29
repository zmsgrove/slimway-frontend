import { api } from '../lib/api'
import type { WarehouseItem, WarehouseMovement, WarehouseCategory } from '../types'

export interface CreateWarehouseItemPayload {
  name: string
  category: WarehouseCategory
  quantity?: number
  min_quantity?: number | null
  price?: number | null
}

export const warehouseApi = {
  getAll: async (branchIds?: string[]): Promise<WarehouseItem[]> => {
    const params = branchIds && branchIds.length > 0 ? { branch_ids: branchIds.join(',') } : undefined
    const { data } = await api.get('/warehouse', { params })
    return data
  },

  getById: async (id: string): Promise<WarehouseItem> => {
    const { data } = await api.get(`/warehouse/${id}`)
    return data
  },

  create: async (payload: CreateWarehouseItemPayload): Promise<WarehouseItem> => {
    const { data } = await api.post('/warehouse', payload)
    return data
  },

  patch: async (id: string, payload: Partial<WarehouseItem>): Promise<WarehouseItem> => {
    const { data } = await api.patch(`/warehouse/${id}`, payload)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/warehouse/${id}`)
  },

  addMovement: async (
    id: string,
    payload: { type: 'in' | 'out'; quantity: number; notes?: string }
  ): Promise<WarehouseMovement> => {
    const { data } = await api.post(`/warehouse/${id}/movement`, payload)
    return data
  },

  getMovements: async (id: string): Promise<WarehouseMovement[]> => {
    const { data } = await api.get(`/warehouse/${id}/movements`)
    return data
  },

  export: async (params?: { from?: string; to?: string; branch_id?: string }): Promise<WarehouseMovement[]> => {
    const { data } = await api.get('/warehouse/export', { params })
    return data
  },

  intake: async (payload: { catalog_item_id: string; quantity: number; supplier?: string; notes?: string }): Promise<WarehouseMovement> => {
    const { data } = await api.post('/warehouse/intake', payload)
    return data
  },
}
