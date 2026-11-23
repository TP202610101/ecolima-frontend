import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import RestablecerContrasenaView from './RestablecerContrasenaView.vue'
import { AuthRepository } from '../repositories/AuthRepository'

vi.mock('../repositories/AuthRepository', () => ({ AuthRepository: { resetPassword: vi.fn() } }))
const reset = vi.mocked(AuthRepository.resetPassword)

// Errores tal como los entrega shared/api/axios.ts: mensaje legible y la respuesta original en cause.
const errorHttp = (status: number, mensaje = 'x') => Object.assign(new Error(mensaje), { cause: { response: { status, data: {} } } })

let router: Router
async function montar(ruta = '/restablecer?token=tok-123') {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'login', component: { template: '<div />' } },
      { path: '/recuperar', name: 'recuperar', component: { template: '<div />' } },
      { path: '/restablecer', name: 'restablecer', component: RestablecerContrasenaView },
    ],
  })
  router.push(ruta)
  await router.isReady()
  return mount(RestablecerContrasenaView, { global: { plugins: [router] } })
}
async function enviar(w: Awaited<ReturnType<typeof montar>>, clave = 'Nueva1234', confirmacion = clave) {
  await w.find('#restablecer-password').setValue(clave)
  await w.find('#restablecer-confirmar').setValue(confirmacion)
  await w.find('form').trigger('submit')
  await flushPromises()
}
const enlace = (w: Awaited<ReturnType<typeof montar>>, texto: string) => w.findAll('a').find(a => a.text() === texto)

beforeEach(() => { reset.mockReset() })
afterEach(() => vi.useRealTimers())

describe('RestablecerContrasenaView', () => {
  it('etiquetas asociadas, autocomplete="new-password" y requisitos visibles', async () => {
    const w = await montar()
    for (const [id, texto] of [['restablecer-password', 'Nueva contraseña'], ['restablecer-confirmar', 'Confirmar contraseña']]) {
      expect(w.find(`label[for="${id}"]`).text()).toBe(texto)
      expect(w.find(`#${id}`).attributes('autocomplete')).toBe('new-password')
    }
    expect(w.find('[data-prueba="requisitos"]').text()).toContain('8 caracteres mínimo')
    expect(w.find('#restablecer-password').attributes('aria-describedby')).toBe('restablecer-requisitos')
  })

  it('sin token en la URL: mensaje claro, sin formulario y acceso a pedir un enlace nuevo', async () => {
    const w = await montar('/restablecer')
    expect(w.find('[data-prueba="sin-token"]').attributes('role')).toBe('alert')
    expect(w.find('form').exists()).toBe(false)
    expect(enlace(w, 'Pedir un enlace nuevo')?.attributes('href')).toBe('/recuperar')
  })

  it('200: mensaje de éxito y redirección al login', async () => {
    vi.useFakeTimers()
    reset.mockResolvedValue()
    const w = await montar()
    await enviar(w)
    expect(reset).toHaveBeenCalledWith('tok-123', 'Nueva1234')
    expect(w.find('[data-prueba="exito"]').text()).toContain('Tu contraseña se cambió correctamente')
    await vi.advanceTimersByTimeAsync(3000)
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('400: enlace inválido o vencido, con acceso a pedir uno nuevo', async () => {
    reset.mockImplementation(() => Promise.reject(errorHttp(400, 'Token inválido')))
    const w = await montar()
    await enviar(w)
    expect(w.find('[data-prueba="enlace-invalido"]').attributes('role')).toBe('alert')
    expect(w.find('form').exists()).toBe(false)
    expect(enlace(w, 'Pedir un enlace nuevo')?.attributes('href')).toBe('/recuperar')
  })

  it('422: muestra el motivo del backend (sin el prefijo de Pydantic)', async () => {
    reset.mockImplementation(() => Promise.reject(errorHttp(422, 'Value error, La contraseña debe tener al menos un número.')))
    const w = await montar()
    await enviar(w)
    expect(w.find('[role="alert"]').text()).toBe('La contraseña debe tener al menos un número.')
    expect(w.find('form').exists()).toBe(true)
  })

  it('contraseña débil o confirmación distinta: avisa sin llamar al servidor', async () => {
    const w = await montar()
    await enviar(w, 'debil')
    expect(w.find('[role="alert"]').text()).toBe('La contraseña no cumple los requisitos de seguridad.')
    await enviar(w, 'Nueva1234', 'Nueva12345')
    expect(w.find('[role="alert"]').text()).toBe('Las contraseñas no coinciden.')
    expect(reset).not.toHaveBeenCalled()
  })

  it('sin conexión: avisa y deja reintentar', async () => {
    reset.mockImplementation(() => Promise.reject(new Error('Sin conexión. Verifica tu red.')))
    const w = await montar()
    await enviar(w)
    expect(w.find('[role="alert"]').text()).toBe('No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.')
    expect(w.find('form').exists()).toBe(true)
  })
})
