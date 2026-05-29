import { api } from '../lib/api'
import type { AnalyticsOverview } from '../types'

export const analyticsApi = {
  getOverview: async (params?: { branch_id?: string; branch_ids?: string[] }): Promise<AnalyticsOverview> => {
    const query: Record<string, string> = {}
    if (params?.branch_ids && params.branch_ids.length > 0) {
      query.branch_ids = params.branch_ids.join(',')
    } else if (params?.branch_id) {
      query.branch_id = params.branch_id
    }
    const { data } = await api.get('/analytics/overview', { params: Object.keys(query).length ? query : undefined })
    return data
  },
}
