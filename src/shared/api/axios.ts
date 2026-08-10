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

function readableDetail(detail: unknown): string {
  if (typeof detail === 'string') return detail

  if (Array.isArray(detail)) {
    const first = (detail as Record<string, unknown>[])[0]
    return typeof first?.msg === 'string' ? first.msg : 'Los datos enviados no son válidos.'
  }

  if (detail !== null && typeof detail === 'object') {
    const d = detail as Record<string, unknown>
    if (typeof d.message === 'string') return d.message
    if (typeof d.error === 'string') {
      const parts: string[] = []
      if (d.row_index != null) parts.push(`Fila ${d.row_index}`)
      if (typeof d.column === 'string') parts.push(`columna ${d.column}`)
      return parts.length > 0 ? `${parts.join(', ')}: ${d.error}` : d.error
    }
    if (Array.isArray(d.invalid_row_indices))
      return `Filas inválidas: ${(d.invalid_row_indices as unknown[]).join(', ')}`
    if (Array.isArray(d.missing_columns))
      return `Faltan columnas: ${(d.missing_columns as unknown[]).join(', ')}`
    return 'Ocurrió un error procesando la solicitud.'
  }

  return 'Error inesperado.'
}

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
    case 409: {
      const code = data?.detail?.code
      const CODE_MESSAGES: Record<string, string> = {
        NOT_VALIDATED:      'Debes validar el dataset antes de confirmarlo.',
        ALREADY_COMMITTED:  'Este dataset ya fue confirmado.',
        DATASET_COMMITTED:  'Este dataset ya fue confirmado y no se puede modificar.',
      }
      if (code && CODE_MESSAGES[code]) return new Error(CODE_MESSAGES[code])
      return new Error(data?.detail != null ? readableDetail(data.detail) : 'Conflicto al procesar la solicitud.')
    }
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
      const detail = data?.detail ?? data?.message
      return new Error(detail != null ? readableDetail(detail) : 'Error inesperado.')
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
