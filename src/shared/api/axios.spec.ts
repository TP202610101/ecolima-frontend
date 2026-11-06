import { describe, it, expect, beforeEach } from 'vitest'
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { setActivePinia, createPinia } from 'pinia'
import api from './axios'
import { respuestaHttp, sinRespuestaServidor } from '@/domains/auth/utils/respuestaHttp'

// Adaptador falso: la petición termina con la respuesta indicada, sin red.
function responder(status: number, data: unknown) {
  api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const response = { status, data, statusText: '', headers: {}, config } as AxiosResponse
    throw new AxiosError(`HTTP ${status}`, AxiosError.ERR_BAD_REQUEST, config, null, response)
  }
}

beforeEach(() => { setActivePinia(createPinia()); localStorage.clear() })

describe('interceptor de respuesta', () => {
  it('un 429 llega con el detail como mensaje y la respuesta original en cause', async () => {
    const detail = 'Demasiados intentos de acceso. Intenta en 15 minutos.'
    responder(429, { detail })
    const error = await api.post('/api/v1/auth/login', {}).catch((e: unknown) => e) as Error & { cause?: AxiosError }
    expect(error.message).toBe(detail)
    expect(error.cause?.response?.status).toBe(429)
  })

  it('un 403 reemplaza el mensaje y no deja response arriba, pero respuestaHttp lo encuentra', async () => {
    responder(403, { detail: 'Prohibido' })
    const error = await api.get('/x').catch((e: unknown) => e) as Error & { response?: unknown }
    expect(error.message).toBe('No tienes permisos para esta acción.')
    expect(error.response).toBeUndefined()
    expect(respuestaHttp(error)?.status).toBe(403)
    expect(sinRespuestaServidor(error)).toBe(false)
  })

  it('sin respuesta del servidor el mensaje ya no es «Network Error» y sinRespuestaServidor lo detecta', async () => {
    api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config)
    }
    const error = await api.get('/x').catch((e: unknown) => e) as Error
    expect(error.message).toBe('Sin conexión. Verifica tu red.')
    expect(respuestaHttp(error)).toBeNull()
    expect(sinRespuestaServidor(error)).toBe(true)
  })

  it('un error que no viene de axios no cuenta como problema de conexión', () => {
    expect(sinRespuestaServidor(new Error('x'))).toBe(false)
    expect(sinRespuestaServidor(Object.assign(new Error('x'), { cause: new TypeError('y') }))).toBe(false)
  })

  it('un 401 sin sesión (login fallido) se entrega tal cual, con su respuesta', async () => {
    responder(401, { detail: 'Credenciales incorrectas' })
    const error = await api.post('/api/v1/auth/login', {}).catch((e: unknown) => e) as AxiosError
    expect(error.response?.status).toBe(401)
  })
})
