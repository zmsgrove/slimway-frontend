import { api } from '../lib/api'
import type { DashboardLayoutData } from '../types'

export const dashboardLayoutsApi = {
  get: async (): Promise<DashboardLayoutData> => {
    const { data } = await api.get('/dashboard-layouts')
    return data
  },
  save: async (payload: DashboardLayoutData): Promise<void> => {
    await api.post('/dashboard-layouts', payload)
  },
}
