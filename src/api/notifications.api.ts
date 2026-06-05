import { api } from '../lib/api'

export interface AppNotification {
  id: string
  branch_id: string | null
  profile_id: string
  type: string
  title: string
  body: string | null
  related_type: string | null
  related_id: string | null
  is_read: boolean
  created_at: string
}

export const notificationsApi = {
  getAll: async (params?: {
    limit?: number
    offset?: number
    unread_only?: boolean
  }): Promise<AppNotification[]> => {
    const { data } = await api.get('/notifications', { params })
    return data
  },

  getUnreadCount: async (): Promise<number> => {
    const { data } = await api.get<{ count: number }>('/notifications/unread-count')
    return data.count
  },

  markRead: async (id: string): Promise<void> => {
    await api.patch(`/notifications/${id}/read`)
  },

  markAllRead: async (): Promise<void> => {
    await api.patch('/notifications/read-all')
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/notifications/${id}`)
  },
}
