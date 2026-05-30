import { api } from '../lib/api'
import type { Badges } from '../types'

export const badgesApi = {
  get: async (): Promise<Badges> => {
    const { data } = await api.get('/badges')
    return data
  },
}
