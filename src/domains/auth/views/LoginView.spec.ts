import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import LoginView from './LoginView.vue'
import { LoginUseCase } from '../use-cases/LoginUseCase'

vi.mock('../use-cases/LoginUseCase', () => ({ LoginUseCase: vi.fn() }))
const login = vi.mocked(LoginUseCase)

async function montar() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'login', component: LoginView },
      { path: '/recuperar', name: 'recuperar', component: { template: '<div />' } },
      { path: '/analisis', name: 'analisis', component: { template: '<div />' } },
      { path: '/puntos', name: 'puntos', component: { template: '<div />' } },
    ],
  })
  router.push('/')
  await router.isReady()
  return mount(LoginView, { global: { plugins: [router] } })
}
async function enviar(w: Awaited<ReturnType<typeof montar>>) {
  await w.find('#login-email').setValue('analista@ecolima.pe')
  await w.find('#login-password').setValue('una-clave')
  await w.find('form').trigger('submit')
  await flushPromises()
}
// Error tal como lo entrega shared/api/axios.ts para respuestas que no son 401: mensaje legible y respuesta en cause.
const errorHttp = (status: number, data: unknown, mensaje = 'Error inesperado.') =>
  Object.assign(new Error(mensaje), { cause: { response: { status, data } } })

beforeEach(() => { setActivePinia(createPinia()); login.mockReset(); localStorage.clear() })

describe('LoginView', () => {
  it('cada etiqueta está asociada a su campo y los campos declaran autocomplete', async () => {
    const w = await montar()
    for (const [id, texto, auto] of [['login-email', 'Correo electrónico', 'email'], ['login-password', 'Contraseña', 'current-password']]) {
      expect(w.find(`label[for="${id}"]`).text()).toBe(texto)
      expect(w.find(`#${id}`).element.tagName).toBe('INPUT')
      expect(w.find(`#${id}`).attributes('autocomplete')).toBe(auto)
    }
  })

  it('ofrece el enlace «¿Olvidaste tu contraseña?» a /recuperar', async () => {
    const w = await montar()
    const enlace = w.findAll('a').find(a => a.text() === '¿Olvidaste tu contraseña?')
    expect(enlace?.attributes('href')).toBe('/recuperar')
  })

  it('el error se anuncia con role="alert"', async () => {
    const w = await montar()
    expect(w.find('[role="alert"]').exists()).toBe(false)
    await w.find('form').trigger('submit')
    expect(w.find('[role="alert"]').text()).toBe('Completa email y contraseña.')
  })

  it('401: credenciales inválidas', async () => {
    login.mockRejectedValue({ response: { status: 401 } })
    const w = await montar()
    await enviar(w)
    expect(w.find('[role="alert"]').text()).toBe('Credenciales inválidas. Intenta de nuevo.')
  })

  it('429 por bloqueo: muestra el detail del backend', async () => {
    const detail = 'Demasiados intentos de acceso. Intenta en 15 minutos.'
    login.mockRejectedValue(errorHttp(429, { detail }, detail))
    const w = await montar()
    await enviar(w)
    expect(w.find('[role="alert"]').text()).toBe(detail)
  })

  it('429 del límite por minuto (sin detail): mensaje de espera, no el genérico', async () => {
    login.mockRejectedValue(errorHttp(429, { error: 'Rate limit exceeded: 5 per 1 minute' }))
    const w = await montar()
    await enviar(w)
    expect(w.find('[role="alert"]').text()).toBe('Demasiados intentos de inicio de sesión. Espera un momento e intenta de nuevo.')
  })

  it('otros errores: mensaje genérico', async () => {
    login.mockRejectedValue(errorHttp(500, { detail: 'boom' }))
    const w = await montar()
    await enviar(w)
    expect(w.find('[role="alert"]').text()).toBe('No fue posible iniciar sesión. Verifica tus datos.')
  })
})
