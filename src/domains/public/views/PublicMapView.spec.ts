import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import PublicMapView from './PublicMapView.vue'
import { PublicRepository } from '../repositories/PublicRepository'

vi.mock('maplibre-gl', () => ({
  Map: class {
    on() {}
    getCenter() { return { lat: -12.12, lng: -77.03 } }
    flyTo() {}
    zoomIn() {}
    zoomOut() {}
    remove() {}
    getSource() { return undefined }
  },
  Popup: class {},
}))
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))
vi.mock('../repositories/PublicRepository', () => ({ PublicRepository: { getNearby: vi.fn() } }))

const getNearby = vi.mocked(PublicRepository.getNearby)
let w: VueWrapper

async function montar() {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', name: 'login', component: { template: '<div />' } }] })
  w = mount(PublicMapView, { global: { plugins: [router] } })
  await router.isReady()
  return w
}
function boton(texto: string) {
  const b = w.findAll('button').find(x => x.text().trim() === texto)
  if (!b) throw new Error(`no hay botón «${texto}»`)
  return b
}
async function buscarEnEstaZona() {
  await boton('Buscar en esta zona').trigger('click')
  await vi.advanceTimersByTimeAsync(600)
  await w.vm.$nextTick()
}

beforeEach(() => { vi.useFakeTimers(); getNearby.mockReset() })
afterEach(() => { w?.unmount(); vi.useRealTimers() })

describe('PublicMapView', () => {
  it('muestra la nota de origen de los puntos, accesible y sin lenguaje del análisis interno', async () => {
    await montar()
    const nota = w.find('[data-prueba="nota-origen"]')
    expect(nota.exists()).toBe(true)
    expect(nota.attributes('role')).toBe('note')
    expect(nota.text()).toBe('Puntos limpios de registros municipales y de prensa. Puede haber otros sin registrar. No es el conjunto de puntos que usa el análisis interno.')
    expect(w.text()).not.toMatch(/recomendaci|probabilidad|idoneidad|\b(Alta|Media|Baja)\b|SHAP|\bML\b/i)
  })

  it('ya no bloquea la vista en móvil vertical', async () => {
    await montar()
    expect(w.text()).not.toContain('Gira el teléfono')
  })

  it('sin puntos en la zona muestra un mensaje claro', async () => {
    getNearby.mockResolvedValue([])
    await montar()
    expect(w.find('[data-prueba="sin-puntos"]').exists()).toBe(false)
    await buscarEnEstaZona()
    const vacio = w.find('[data-prueba="sin-puntos"]')
    expect(vacio.exists()).toBe(true)
    expect(vacio.attributes('role')).toBe('status')
    expect(vacio.text()).toContain('Sin puntos de reciclaje en esta zona')
  })

  it('si el backend no responde muestra el error y no el estado vacío', async () => {
    getNearby.mockRejectedValue(new Error('No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.'))
    await montar()
    await buscarEnEstaZona()
    const error = w.find('[data-prueba="error-puntos"]')
    expect(error.attributes('role')).toBe('alert')
    expect(error.text()).toContain('No se pudo conectar con el servidor')
    expect(w.find('[data-prueba="sin-puntos"]').exists()).toBe(false)
  })

  it('el filtro por material reconoce materiales sin tildes', async () => {
    getNearby.mockResolvedValue([
      { id: 1, nombre: 'A', lat: -12.12, lng: -77.03, materiales: ['plastico', 'vidrio'], distancia: 10 },
      { id: 2, nombre: 'B', lat: -12.12, lng: -77.03, materiales: ['Papel'], distancia: 20 },
    ])
    await montar()
    await buscarEnEstaZona()
    // Dejar solo «Plástico»: se desmarcan los demás.
    for (const m of ['Papel', 'Vidrio', 'Metal', 'Cartón']) await boton(m).trigger('click')
    expect(w.findAll('button[aria-pressed="true"]').map(b => b.text())).toEqual(['Plástico'])
    expect(w.find('[data-prueba="sin-puntos"]').exists()).toBe(false)
    await boton('Papel').trigger('click')
    await boton('Plástico').trigger('click')
    expect(w.find('[data-prueba="sin-puntos"]').exists()).toBe(false)
  })
})
