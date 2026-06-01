import { api } from '../lib/api'

export interface SaleItem {
  type: 'subscription' | 'warehouse'
  id: string
  qty: number
}

export interface CheckoutPayload {
  client_id: string
  items: SaleItem[]
  payment_method: 'cash' | 'card'
  promo_code?: string
  date_start?: string
}

export interface CheckoutResult {
  success: boolean
  total: number
  subtotal: number
  discount: number
  payment_method: string
  client: { id: string; full_name: string }
  items_created: { type: string; id: string; name: string }[]
}

export const saleApi = {
  checkout: async (payload: CheckoutPayload): Promise<CheckoutResult> => {
    const { data } = await api.post('/sale/checkout', payload)
    return data
  },
}
