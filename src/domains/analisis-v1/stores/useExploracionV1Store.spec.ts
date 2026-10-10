import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useExploracionV1Store } from './useExploracionV1Store'
import { AnalisisV1Repository } from '../repositories/AnalisisV1Repository'
import type { DistritosGeoJSON, SitioResumen, VersionActiva } from '../entities/AnalisisV1'
import { PROVINCIA } from '../utils/lecturaV1'

vi.mock('../repositories/AnalisisV1Repository', () => ({
  AnalisisV1Repository: {
    getVersionActiva: vi.fn(), getDistritos: vi.fn(), getTodosLosSitios: vi.fn(), getTamizaje: vi.fn(),
    getSitio: vi.fn(), getFuentes: vi.fn(),
  },
}))
const repo = vi.mocked(AnalisisV1Repository)

const SI = '150131', MI = '150122'
const sitio = (id: string, ubigeo: string, rango: number | null): SitioResumen => ({
  sitio_id: id, lon: -77, lat: -12, ubigeo, distrito: 'X', clase_oportunidad: 'paradero_transporte_publico', rol: 'fondo',
  estado_tamizaje: rango == null ? 'excluido_tamizaje' : 'apto_tamizaje', codigo_exclusion: null, propension_percentil: 0.5,
  mcda: rango == null ? null : { puntaje: 0.5, rango, en_top_k: rango <= 3 }, mc_frecuencia_top_k: null,
  dist_punto_existente_m: 100, punto_existente_mas_cercano: null,
  criterios_mcda: rango == null ? null : {
    K1_demanda: { bruto: 100 - rango, norm: 0.5 }, K2_generacion: { bruto: 100 - rango, norm: 0.5 },
    K3_brecha: { bruto: rango, norm: 0.5 }, K4_accesibilidad: { bruto: 10, norm: 0.5 },
  },
})
// 25 lugares en San Isidro (rangos 1..49 impares) y 24 en Miraflores (pares).
const items = Array.from({ length: 49 }, (_, i) => sitio(`S${i + 1}`, (i + 1) % 2 ? SI : MI, i + 1))
const distritos = {
  type: 'FeatureCollection',
  features: [SI, MI, '150126'].map(u => ({
    type: 'Feature', id: u, geometry: null,
    properties: { ubigeo: u, nombre: u, n_sitios: u === '150126' ? 0 : 25, n_apto_tamizaje: u === SI ? 25 : u === MI ? 24 : 0, n_excluido_tamizaje: 0, n_punto_existente: 0, n_top_k: 0 },
  })),
} as unknown as DistritosGeoJSON

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  vi.clearAllMocks()
  repo.getVersionActiva.mockResolvedValue({ paquete_version: '1.0.0', mcda: { top_k: 110 } } as unknown as VersionActiva)
  repo.getDistritos.mockResolvedValue(distritos)
  repo.getTodosLosSitios.mockResolvedValue({ total: items.length, items, version: '1.0.0' })
  repo.getTamizaje.mockResolvedValue({ estado_tamizaje: {}, reglas: {}, exclusiones: [], estado_verificacion_campo: { pendiente_campo: 49 }, aviso: '' })
  repo.getSitio.mockImplementation(async id => ({ sitio_id: id } as never))
})

describe('useExploracionV1Store', () => {
  it('sin distrito asociado a la cuenta abre la provincia; con uno fijado abre ese distrito', async () => {
    const s = useExploracionV1Store()
    await s.inicializar('7')
    expect(s.ambito).toBe(PROVINCIA)
    expect(s.distritosConDatos).toEqual([SI, MI])
    s.fijarMiDistrito(SI)
    setActivePinia(createPinia())
    const s2 = useExploracionV1Store()
    await s2.inicializar('7')
    expect(s2.ambito).toBe(SI)
    expect(s2.esMiDistrito).toBe(true)
  })

  it('pagina de 10 en 10 y vuelve a la página 1 al filtrar o cambiar de distrito', async () => {
    const s = useExploracionV1Store()
    await s.inicializar('7')
    s.cambiarAmbito(SI)
    expect(s.paginaLista.total).toBe(3)
    s.cambiarPagina(1)
    expect(s.paginaLista.p).toBe(2)
    expect(s.paginaLista.items[0].rangoDist).toBe(11)
    s.setFiltros({ buscar: 'paradero' })
    expect(s.pag).toBe(1)
    s.cambiarPagina(2)
    s.cambiarAmbito(MI)
    expect(s.pag).toBe(1)
    s.cambiarPorPagina(20)
    expect(s.paginaLista.items).toHaveLength(20)
  })

  it('al elegir un lugar de otra página la lista salta a esa página y pide el detalle a la API', async () => {
    const s = useExploracionV1Store()
    await s.inicializar('7')
    s.cambiarAmbito(SI)
    await s.elegir('S47') // 24.º de San Isidro
    expect(s.pag).toBe(3)
    expect(repo.getSitio).toHaveBeenCalledWith('S47')
    expect(s.masDetalles).toBe(false)
  })

  it('elegir un lugar de otro distrito cambia el ámbito; un filtro que lo excluye lo deselecciona', async () => {
    const s = useExploracionV1Store()
    await s.inicializar('7')
    s.cambiarAmbito(SI)
    await s.elegir('S2')
    expect(s.ambito).toBe(MI)
    s.setFiltros({ tipos: ['parque'] })
    expect(s.selId).toBeNull()
  })

  it('las cifras y los puntos existentes son del ámbito elegido', async () => {
    const s = useExploracionV1Store()
    await s.inicializar('7')
    s.cambiarAmbito(MI)
    expect(s.cifrasAmbito.ev).toBe(24)
    expect(s.cifrasAmbito.top).toBe(1)
    expect(s.verificacionCampo(s.seleccion[0])).toBe('pendiente_campo (C02–C09)')
  })

  it('error de red: mensaje comprensible y sin datos a medias', async () => {
    repo.getTodosLosSitios.mockRejectedValueOnce({ message: 'Network Error' })
    const s = useExploracionV1Store()
    await s.inicializar('7')
    expect(s.error).toMatch(/No se pudo conectar/)
    expect(s.cargado).toBe(false)
  })
})
