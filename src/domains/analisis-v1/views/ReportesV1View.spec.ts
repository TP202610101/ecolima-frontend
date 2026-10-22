import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ReportesV1View from './ReportesV1View.vue'
import { useExploracionV1Store } from '../stores/useExploracionV1Store'
import { construirLugares } from '../utils/lecturaV1'
import type { DistritosGeoJSON, SitioResumen, VersionActiva } from '../entities/AnalisisV1'

vi.mock('../repositories/AnalisisV1Repository', () => ({ AnalisisV1Repository: {} }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))

const SI = '150131', CO = '150110', PH = '150126'
const sitio = (id: string, ubigeo: string, rango: number): SitioResumen => ({
  sitio_id: id, lon: -77, lat: -12, ubigeo, distrito: 'X', clase_oportunidad: 'paradero_transporte_publico', rol: 'fondo',
  estado_tamizaje: 'apto_tamizaje', codigo_exclusion: null, propension_percentil: 0.5,
  mcda: { puntaje: 0.5, rango, en_top_k: rango <= 2 }, mc_frecuencia_top_k: null, dist_punto_existente_m: 300, punto_existente_mas_cercano: null,
  criterios_mcda: { K1_demanda: { bruto: 1, norm: 0.5 }, K2_generacion: { bruto: 1, norm: 0.5 }, K3_brecha: { bruto: 1, norm: 0.5 }, K4_accesibilidad: { bruto: 1, norm: 0.5 } },
})
// 3 lugares en San Isidro y 5 en Comas; Punta Hermosa sin lugares.
const items = [...[1, 3, 5].map(r => sitio(`S${r}`, SI, r)), ...[2, 4, 6, 7, 8].map(r => sitio(`C${r}`, CO, r))]
const props = (u: string, n: number) => ({ ubigeo: u, nombre: u, n_sitios: n, n_apto_tamizaje: n, n_excluido_tamizaje: 0, n_punto_existente: 0, n_top_k: 0 })

function montar() {
  setActivePinia(createPinia())
  const st = useExploracionV1Store()
  st.inicializar = vi.fn() as never
  st.version = { paquete_version: '1.0.0', fecha_paquete: '2026-10-03T15:34:38-05:00', mcda: { top_k: 110 } } as unknown as VersionActiva
  st.distritos = { type: 'FeatureCollection', features: [props(SI, 3), props(CO, 5), props(PH, 0)].map(p => ({ type: 'Feature', id: p.ubigeo, geometry: null, properties: p })) } as unknown as DistritosGeoJSON
  st.lugares = construirLugares(items)
  st.cargado = true
  const w = mount(ReportesV1View, { global: { stubs: { AyudaFuentesV1: true, teleport: true } } })
  return { st, w }
}
const subtitulo = (w: ReturnType<typeof montar>['w']) => w.find('[data-prueba="subtitulo"]').text()
const evaluados = (w: ReturnType<typeof montar>['w']) => w.find('[data-prueba="kpis"]').text()

beforeEach(() => localStorage.clear())

// El recálculo del reporte ocurre un cuadro después de la elección (useCambioAmbito).
type W = ReturnType<typeof montar>['w']
const cuadro = async (w: W) => { await new Promise(r => setTimeout(r, 40)); await w.vm.$nextTick() }
const boton = (w: W) => w.find('[data-prueba="selector-reporte"]')
const tocar = async (w: W, v: string) => { await boton(w).trigger('click'); await w.find(`[role="option"][data-valor="${v}"]`).trigger('click') }
const elegir = async (w: W, v: string) => { await tocar(w, v); await cuadro(w) }

describe('ReportesV1View — cambiar de distrito con el selector', () => {
  it('cada opción cambia el reporte: distrito con lugares, distrito sin lugares y vuelta a la provincia', async () => {
    const { w, st } = montar()
    expect(subtitulo(w)).toContain('en la provincia de Lima')
    expect(evaluados(w)).toContain('8')

    await elegir(w, SI)
    expect(st.ambito).toBe(SI)
    expect(subtitulo(w)).toContain('en San Isidro')
    expect(w.findAll('[data-prueba="tarjetas-orden"] li')).toHaveLength(3)

    await elegir(w, CO)
    expect(subtitulo(w)).toContain('en Comas')
    expect(w.findAll('[data-prueba="tarjetas-orden"] li')).toHaveLength(5)

    await elegir(w, PH)
    expect(subtitulo(w)).toContain('en Punta Hermosa')
    expect(w.find('[data-prueba="aviso-sin-lugares"]').exists()).toBe(true)
    expect(w.find('[data-prueba="tabla-sin-lugares"]').exists()).toBe(true)

    await elegir(w, 'lima')
    expect(st.ambito).toBe('lima')
    expect(subtitulo(w)).toContain('en la provincia de Lima')
    expect(w.find('[data-prueba="aviso-sin-lugares"]').exists()).toBe(false)
  })

  it('una sola elección se ve de inmediato en el botón y el reporte termina en el distrito elegido', async () => {
    const { w, st } = montar()
    await tocar(w, CO)
    expect(boton(w).text()).toBe('Comas')
    expect(w.find('[data-prueba="actualizando"]').text()).toContain('Actualizando el reporte')
    await cuadro(w)
    expect(st.ambito).toBe(CO)
    expect(subtitulo(w)).toContain('en Comas')
    expect(w.find('[data-prueba="actualizando"]').text()).toBe('')
  })

  it('dos elecciones seguidas rápidas: gana la última', async () => {
    const { w, st } = montar()
    const cambiar = vi.spyOn(st, 'cambiarAmbito')
    await tocar(w, SI)
    await tocar(w, CO)
    expect(boton(w).text()).toBe('Comas')
    await cuadro(w)
    expect(cambiar).toHaveBeenCalledTimes(1)
    expect(cambiar).toHaveBeenCalledWith(CO)
    expect(subtitulo(w)).toContain('en Comas')
  })

  it('las filas de distrito también cambian el ámbito y el botón lo refleja', async () => {
    const { w, st } = montar()
    await w.find(`[data-distrito="${CO}"]`).trigger('click')
    await cuadro(w)
    expect(st.ambito).toBe(CO)
    expect(boton(w).text()).toBe('Comas')
  })

  it('si el cambio no se acepta, el botón vuelve a mostrar el ámbito real', async () => {
    const { w, st } = montar()
    st.cambiarAmbito = vi.fn() as never
    await elegir(w, SI)
    expect(boton(w).text()).toBe('Provincia de Lima (43 distritos)')
    expect(subtitulo(w)).toContain('en la provincia de Lima')
  })
})
