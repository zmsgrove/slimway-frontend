import { api } from '../lib/api'
import type { PermissionOverride } from '../lib/permissions'

export const permissionsApi = {
  getAll: async (): Promise<PermissionOverride[]> => {
    const { data } = await api.get('/permissions')
    return data
  },

  upsert: async (payload: Omit<PermissionOverride, 'id'>): Promise<PermissionOverride> => {
    const { data } = await api.post('/permissions', payload)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/permissions/${id}`)
  },
}
