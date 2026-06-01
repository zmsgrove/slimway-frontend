import { api } from '../lib/api'

export interface SaleItem {
  type: 'subscription' | 'warehouse'
  template_id?: string
  item_id?: string
  quantity: number
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

export interface PromoValidateResult {
  valid: boolean
  discount_type: 'percent' | 'fixed'
  discount_value: number
  id: string
}

export const saleApi = {
  checkout: async (payload: CheckoutPayload): Promise<CheckoutResult> => {
    const { data } = await api.post('/sale/checkout', payload)
    return data
  },
}

export const promoCodesApi = {
  validate: async (code: string): Promise<PromoValidateResult> => {
    const { data } = await api.get(`/promo-codes/validate/${encodeURIComponent(code)}`)
    return data
  },
}
