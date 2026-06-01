import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL ?? 'https://slimway-backend.onrender.com'

export const clientPortalApi = {
  auth: async (phone: string, portalToken: string): Promise<{ token: string; client_id: string; client_name: string }> => {
    const { data } = await axios.post(`${BASE}/api/client/auth`, { phone }, {
      headers: { Authorization: `Bearer ${portalToken}` },
    })
    return data
  },

  getMe: async (token: string) => {
    const { data } = await axios.get(`${BASE}/api/client/me`, { headers: { Authorization: `Bearer ${token}` } })
    return data
  },

  getSubscriptions: async (token: string) => {
    const { data } = await axios.get(`${BASE}/api/client/subscriptions`, { headers: { Authorization: `Bearer ${token}` } })
    return data
  },

  getBookings: async (token: string) => {
    const { data } = await axios.get(`${BASE}/api/client/bookings`, { headers: { Authorization: `Bearer ${token}` } })
    return data
  },

  getSchedule: async (token: string, date: string) => {
    const { data } = await axios.get(`${BASE}/api/client/schedule`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { date },
    })
    return data
  },

  createBooking: async (token: string, payload: { subscription_id: string; slot_1_schedule_slot_id: string; date: string }) => {
    const { data } = await axios.post(`${BASE}/api/client/bookings`, payload, { headers: { Authorization: `Bearer ${token}` } })
    return data
  },

  cancelBooking: async (token: string, id: string) => {
    await axios.delete(`${BASE}/api/client/bookings/${id}`, { headers: { Authorization: `Bearer ${token}` } })
  },

  getMessages: async (token: string) => {
    const { data } = await axios.get(`${BASE}/api/client/messages`, { headers: { Authorization: `Bearer ${token}` } })
    return data
  },

  sendMessage: async (token: string, text: string) => {
    const { data } = await axios.post(`${BASE}/api/client/messages`, { text }, { headers: { Authorization: `Bearer ${token}` } })
    return data
  },

  getActivity: async (token: string) => {
    const { data } = await axios.get(`${BASE}/api/client/activity`, { headers: { Authorization: `Bearer ${token}` } })
    return data
  },
}

export const publicBookingApi = {
  getPage: async (slug: string) => {
    const { data } = await axios.get(`${BASE}/api/public/booking/${slug}`)
    return data
  },

  getSlots: async (slug: string, date: string) => {
    const { data } = await axios.get(`${BASE}/api/public/booking/${slug}/slots`, { params: { date } })
    return data
  },

  book: async (slug: string, token: string, payload: { subscription_id: string; slot_1_schedule_slot_id: string; date: string }) => {
    const { data } = await axios.post(`${BASE}/api/public/booking/${slug}/book`, payload, { headers: { Authorization: `Bearer ${token}` } })
    return data
  },
}
