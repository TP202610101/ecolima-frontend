import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import AnalisisV1View from './AnalisisV1View.vue'
import { useExploracionV1Store } from '../stores/useExploracionV1Store'

vi.mock('../repositories/AnalisisV1Repository', () => ({ AnalisisV1Repository: {} }))

// Se simulan los paneles (MapLibre no corre en jsdom): aquí solo importa el armado responsive de la vista.
const stubs = {
  FiltrosListaV1: { template: '<div data-prueba="lista-stub" />' },
  MapaExploracionV1: { template: '<div data-prueba="mapa-stub" />', methods: { redimensionar() {} } },
  PanelLugarV1: { template: '<div data-prueba="panel-stub" />' },
  AvisoV1: true,
  AyudaFuentesV1: true,
}

function montar(ancho: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: ancho })
  setActivePinia(createPinia())
  const st = useExploracionV1Store()
  st.inicializar = vi.fn() as never
  st.cargado = true
  const w = mount(AnalisisV1View, { global: { stubs } })
  return { st, w }
}
const columnaDetalle = (w: ReturnType<typeof montar>['w']) => w.find('[data-prueba="columna-detalle"]')

beforeEach(() => localStorage.clear())

describe('AnalisisV1View — pantallas angostas', () => {
  it('muestra pestañas Lista y Mapa (sin pestaña de detalle) y abre en el mapa', () => {
    const { w } = montar(390)
    const tabs = w.findAll('nav[aria-label="Paneles"] button')
    expect(tabs.map(t => t.text())).toEqual(['Lista', 'Mapa'])
    expect(w.find('[data-panel="mapa"]').attributes('aria-current')).toBe('true')
  })

  it('al elegir un lugar el detalle ocupa la pantalla y «Volver» lo cierra sin perder la selección', async () => {
    const { w, st } = montar(390)
    expect(columnaDetalle(w).classes()).toContain('hidden')
    st.selId = 'S1'
    await w.vm.$nextTick()
    expect(columnaDetalle(w).classes()).toEqual(expect.arrayContaining(['flex', 'max-lg:fixed', 'max-lg:top-14']))
    expect(w.find('[data-prueba="volver-detalle"]').text()).toContain('Volver al mapa')
    await w.find('[data-prueba="volver-detalle"]').trigger('click')
    expect(columnaDetalle(w).classes()).toContain('hidden')
    expect(st.selId).toBe('S1')
  })

  it('volver a elegir el mismo lugar reabre el detalle', async () => {
    const { w, st } = montar(390)
    st.selId = 'S1'
    await w.vm.$nextTick()
    await w.find('[data-prueba="volver-detalle"]').trigger('click')
    st.cargandoDetalle = true
    await w.vm.$nextTick()
    expect(columnaDetalle(w).classes()).toContain('max-lg:fixed')
  })

  it('en escritorio el detalle es la columna derecha, sin pantalla completa', async () => {
    const { w, st } = montar(1280)
    st.selId = 'S1'
    await w.vm.$nextTick()
    expect(columnaDetalle(w).classes()).not.toContain('max-lg:fixed')
    expect(columnaDetalle(w).classes()).toContain('lg:flex')
  })
})
