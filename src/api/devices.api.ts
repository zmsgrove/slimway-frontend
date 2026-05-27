import { api } from '../lib/api'
import type { Device, DeviceStatus } from '../types'

export const devicesApi = {
  getAll: async (): Promise<Device[]> => {
    const { data } = await api.get('/devices')
    return data
  },

  create: async (payload: {
    type: string
    number: string
    device_group: string
    status?: DeviceStatus
  }): Promise<Device> => {
    const { data } = await api.post('/devices', payload)
    return data
  },

  updateStatus: async (id: string, status: DeviceStatus): Promise<Device> => {
    const { data } = await api.patch(`/devices/${id}`, { status })
    return data
  },

  update: async (id: string, payload: Partial<Device>): Promise<Device> => {
    const { data } = await api.patch(`/devices/${id}`, payload)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/devices/${id}`)
  },
}
