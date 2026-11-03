import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import RecuperarContrasenaView from './RecuperarContrasenaView.vue'
import { AuthRepository } from '../repositories/AuthRepository'

vi.mock('../repositories/AuthRepository', () => ({ AuthRepository: { forgotPassword: vi.fn() } }))
const forgot = vi.mocked(AuthRepository.forgotPassword)

const NEUTRO = 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña. Revisa también la carpeta de spam.'
// Error tal como lo entrega shared/api/axios.ts para respuestas que no son 401.
const errorHttp = (status: number) => Object.assign(new Error('x'), { cause: { response: { status, data: {} } } })

async function montar() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'login', component: { template: '<div />' } },
      { path: '/recuperar', name: 'recuperar', component: RecuperarContrasenaView },
    ],
  })
  router.push('/recuperar')
  await router.isReady()
  return mount(RecuperarContrasenaView, { global: { plugins: [router] } })
}
async function enviar(w: Awaited<ReturnType<typeof montar>>, correo = 'alguien@ecolima.pe') {
  await w.find('#recuperar-email').setValue(correo)
  await w.find('form').trigger('submit')
  await flushPromises()
}

beforeEach(() => { forgot.mockReset() })

describe('RecuperarContrasenaView', () => {
  it('etiqueta asociada, autocomplete="email" y enlace de vuelta al login', async () => {
    const w = await montar()
    expect(w.find('label[for="recuperar-email"]').text()).toBe('Correo electrónico')
    expect(w.find('#recuperar-email').attributes('autocomplete')).toBe('email')
    expect(w.findAll('a').find(a => a.text() === 'Volver al inicio de sesión')?.attributes('href')).toBe('/')
  })

  it('tras enviar muestra el mensaje neutro y oculta el formulario', async () => {
    forgot.mockResolvedValue()
    const w = await montar()
    await enviar(w)
    expect(forgot).toHaveBeenCalledWith('alguien@ecolima.pe')
    expect(w.find('[data-prueba="mensaje-neutro"]').text()).toBe(NEUTRO)
    expect(w.find('form').exists()).toBe(false)
  })

  it.each([404, 422, 429, 500])('con respuesta %i del servidor muestra el mismo mensaje neutro', async status => {
    forgot.mockImplementation(() => Promise.reject(errorHttp(status)))
    const w = await montar()
    await enviar(w)
    expect(w.find('[data-prueba="mensaje-neutro"]').text()).toBe(NEUTRO)
    expect(w.find('[role="alert"]').exists()).toBe(false)
  })

  it('sin conexión avisa con role="alert" y deja el formulario para reintentar', async () => {
    forgot.mockImplementation(() => Promise.reject(new Error('Sin conexión. Verifica tu red.')))
    const w = await montar()
    await enviar(w)
    expect(w.find('[role="alert"]').text()).toBe('No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.')
    expect(w.find('form').exists()).toBe(true)
    expect(w.find('[data-prueba="mensaje-neutro"]').exists()).toBe(false)
  })

  it('valida el correo antes de llamar al servidor', async () => {
    const w = await montar()
    await w.find('form').trigger('submit')
    expect(w.find('[role="alert"]').text()).toBe('Ingresa tu correo electrónico.')
    await enviar(w, 'no-es-correo')
    expect(w.find('[role="alert"]').text()).toBe('Ingresa un correo electrónico válido.')
    expect(forgot).not.toHaveBeenCalled()
  })
})
