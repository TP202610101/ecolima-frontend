import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ToastGlobal from './ToastGlobal.vue'
import { mostrarToast } from '@/shared/composables/useToast'

const toast = (w: ReturnType<typeof mount>) => w.find('[data-prueba="toast"]')

describe('ToastGlobal', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('muestra el aviso dentro de una región viva que ya estaba montada y lo quita solo', async () => {
    const w = mount(ToastGlobal)
    expect(w.find('[role="status"]').exists()).toBe(true)
    expect(toast(w).exists()).toBe(false)

    mostrarToast('Usuario creado.')
    await w.vm.$nextTick()
    expect(w.find('[role="status"]').text()).toBe('Usuario creado.')

    vi.advanceTimersByTime(3500)
    await w.vm.$nextTick()
    expect(toast(w).exists()).toBe(false)
  })

  it('se ajusta a su texto sin salirse de la pantalla y deja pasar los toques', async () => {
    const w = mount(ToastGlobal)
    mostrarToast('Usuario creado.')
    await w.vm.$nextTick()
    expect(toast(w).classes()).toEqual(expect.arrayContaining(['w-max', 'max-w-[calc(100vw-2rem)]', 'text-center', 'pointer-events-none']))
  })

  it('un aviso nuevo reemplaza al anterior y reinicia el tiempo', async () => {
    const w = mount(ToastGlobal)
    mostrarToast('Primero')
    vi.advanceTimersByTime(3000)
    mostrarToast('Segundo')
    await w.vm.$nextTick()
    expect(toast(w).text()).toBe('Segundo')

    vi.advanceTimersByTime(3000)
    await w.vm.$nextTick()
    expect(toast(w).text()).toBe('Segundo')

    vi.advanceTimersByTime(500)
    await w.vm.$nextTick()
    expect(toast(w).exists()).toBe(false)
  })
})
