import { api } from '../lib/api'
import type { AnalyticsOverview } from '../types'

export const analyticsApi = {
  getOverview: async (branchId?: string): Promise<AnalyticsOverview> => {
    const params = branchId ? { branch_id: branchId } : undefined
    const { data } = await api.get('/analytics/overview', { params })
    return data
  },
}
