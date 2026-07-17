import axios from 'axios'
import { useAuthStore } from '@/domains/auth/stores/useAuthStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 30000,
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

function buildApiError(error: unknown): Error {
  if (!axios.isAxiosError(error)) return new Error('Error inesperado.')

  if (error.code === 'ECONNABORTED') {
    return new Error('La solicitud tardó demasiado, intenta de nuevo.')
  }
  if (!error.response) {
    return new Error('Sin conexión. Verifica tu red.')
  }

  const { status, data } = error.response
  switch (status) {
    case 403:
      return new Error('No tienes permisos para esta acción.')
    case 404:
      return new Error('Recurso no encontrado.')
    case 422: {
      const detail = data?.detail
      const msg = Array.isArray(detail)
        ? detail[0]?.msg
        : typeof detail === 'string' ? detail : detail?.message
      return new Error(msg || 'Datos inválidos.')
    }
    case 500:
      return new Error('Error del servidor, intenta más tarde.')
    default: {
      const msg = data?.detail || data?.message
      return new Error(typeof msg === 'string' ? msg : 'Error inesperado.')
    }
  }
}

api.interceptors.response.use(
  res => res,
  async (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      // Solo redirigir si había una sesión activa (token expirado).
      // Si no hay token, el 401 es de un intento de login fallido — dejarlo pasar.
      if (localStorage.getItem('access_token')) {
        try {
          useAuthStore().clearSession()
        } catch {
          localStorage.removeItem('access_token')
          localStorage.removeItem('user')
        }
        const { default: router } = await import('@/router/index')
        router.push({ name: 'login', query: { expired: 'true' } })
      }
      return Promise.reject(error)
    }

    return Promise.reject(buildApiError(error))
  }
)

export default api
