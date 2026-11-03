import { describe, it, expect, beforeEach } from 'vitest'
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { setActivePinia, createPinia } from 'pinia'
import api from './axios'

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

  it('un 401 sin sesión (login fallido) se entrega tal cual, con su respuesta', async () => {
    responder(401, { detail: 'Credenciales incorrectas' })
    const error = await api.post('/api/v1/auth/login', {}).catch((e: unknown) => e) as AxiosError
    expect(error.response?.status).toBe(401)
  })
})
