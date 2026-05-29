import { api } from '../lib/api'
import type { BranchSubscriptionTemplate } from '../types'

export const branchSubscriptionTemplatesApi = {
  getAll: async (): Promise<BranchSubscriptionTemplate[]> => {
    const { data } = await api.get('/branch-subscription-templates')
    return data
  },

  connect: async (template_id: string, branch_id?: string): Promise<BranchSubscriptionTemplate> => {
    const { data } = await api.post('/branch-subscription-templates', { template_id, branch_id })
    return data
  },

  disconnect: async (id: string): Promise<void> => {
    await api.delete(`/branch-subscription-templates/${id}`)
  },
}
