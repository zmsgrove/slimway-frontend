import { api } from '../lib/api'

export interface BranchRaw {
  id: string
  name: string
  city: string | null
  is_franchise: boolean
  owner_id: string | null
  created_at: string
}

export const branchesApi = {
  getAll: async (): Promise<BranchRaw[]> => {
    const { data } = await api.get('/branches', { params: {} })
    return data
  },

  create: async (payload: { name: string; city?: string; is_franchise?: boolean }): Promise<BranchRaw> => {
    const { data } = await api.post('/branches', payload)
    return data
  },
}
