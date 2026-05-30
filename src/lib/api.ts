import axios from 'axios'
import { supabase } from './supabase'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

// Автоматически добавляем токен и active branch_id в каждый запрос
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  const activeBranchId = localStorage.getItem('activeBranchId')
  if (activeBranchId) {
    config.params = { ...config.params, branch_id: activeBranchId }
  }
  return config
})

// Глобальная обработка ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      supabase.auth.signOut()
      window.location.href = '/login'
    }
    if (error.response?.status === 403 && error.response?.data?.code === 'MFA_REQUIRED') {
      // Не разлогиниваем — сохраняем aal1 сессию, чтобы LoginPage показал шаг MFA
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
