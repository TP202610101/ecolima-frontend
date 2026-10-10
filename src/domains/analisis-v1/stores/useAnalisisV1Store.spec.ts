import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAnalisisV1Store, TAMANO_PAGINA } from './useAnalisisV1Store'
import { AnalisisV1Repository, paramsFiltros } from '../repositories/AnalisisV1Repository'
import type { PaginaSitios, SitiosGeoJSON, VersionActiva } from '../entities/AnalisisV1'

vi.mock('../repositories/AnalisisV1Repository', async importOriginal => {
  const real = await importOriginal<typeof import('../repositories/AnalisisV1Repository')>()
  return {
    paramsFiltros: real.paramsFiltros,
    AnalisisV1Repository: {
      getVersionActiva: vi.fn(),
      getSitios: vi.fn(),
      getSitiosGeoJSON: vi.fn(),
      getSitio: vi.fn(),
      getDistritos: vi.fn(),
      getFuentes: vi.fn(),
      getModelo: vi.fn(),
      getMcda: vi.fn(),
    },
  }
})

const repo = vi.mocked(AnalisisV1Repository)

const version = { paquete_version: '1.0.0', conteos: { sitios: 2242 } } as unknown as VersionActiva
const pagina = (total: number, offset = 0): PaginaSitios =>
  ({ total, offset, limit: TAMANO_PAGINA, items: [] }) as unknown as PaginaSitios
const geo = (n: number): SitiosGeoJSON =>
  ({ type: 'FeatureCollection', features: Array.from({ length: n }, () => ({})) }) as unknown as SitiosGeoJSON

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  repo.getModelo.mockResolvedValue({} as never)
  repo.getMcda.mockResolvedValue({} as never)
  repo.getDistritos.mockResolvedValue({ type: 'FeatureCollection', features: [] })
})

describe('paramsFiltros', () => {
  it('solo envía los filtros activos y traduce solo_top_k a en_top_k', () => {
    expect(paramsFiltros({ ubigeo: null, estado_tamizaje: null, solo_top_k: false })).toEqual({})
    expect(paramsFiltros({ ubigeo: '150131', estado_tamizaje: 'apto_tamizaje', solo_top_k: true }))
      .toEqual({ ubigeo: '150131', estado_tamizaje: 'apto_tamizaje', en_top_k: true })
  })
})

describe('useAnalisisV1Store — inicializar', () => {
  it('carga versión, catálogos, mapa y primera página con los mismos filtros', async () => {
    repo.getVersionActiva.mockResolvedValue(version)
    repo.getSitiosGeoJSON.mockResolvedValue(geo(3))
    repo.getSitios.mockResolvedValue(pagina(3))
    const store = useAnalisisV1Store()
    await store.inicializar()
    expect(store.version).toEqual(version)
    expect(store.totalMapa).toBe(3)
    expect(store.totalTabla).toBe(3)
    expect(repo.getSitios).toHaveBeenCalledWith(store.filtros, TAMANO_PAGINA, 0)
    expect(repo.getSitiosGeoJSON).toHaveBeenCalledWith(store.filtros)
    expect(store.error).toBeNull()
  })

  it('marca sinVersion cuando el backend no tiene versión activa', async () => {
    repo.getVersionActiva.mockResolvedValue(null)
    const store = useAnalisisV1Store()
    await store.inicializar()
    expect(store.sinVersion).toBe(true)
    expect(repo.getSitios).not.toHaveBeenCalled()
  })

  it('guarda el error HTTP sin romper la vista', async () => {
    repo.getVersionActiva.mockRejectedValue(new Error('No tienes permisos para esta acción.'))
    const store = useAnalisisV1Store()
    await store.inicializar()
    expect(store.error).toBe('No tienes permisos para esta acción.')
    expect(store.loadingInicial).toBe(false)
  })
})

describe('useAnalisisV1Store — filtros y paginación', () => {
  it('al cambiar filtros vuelve a la primera página y recarga mapa y tabla', async () => {
    repo.getSitiosGeoJSON.mockResolvedValue(geo(2))
    repo.getSitios.mockResolvedValue(pagina(2))
    const store = useAnalisisV1Store()
    store.offset = 50
    await store.setFiltros({ ubigeo: '150131' })
    expect(store.filtros.ubigeo).toBe('150131')
    expect(repo.getSitios).toHaveBeenLastCalledWith(expect.objectContaining({ ubigeo: '150131' }), TAMANO_PAGINA, 0)
    expect(store.offset).toBe(0)
  })

  it('descarta una respuesta vieja si llegó después de la nueva', async () => {
    let resolverVieja: (v: PaginaSitios) => void = () => {}
    repo.getSitios
      .mockImplementationOnce(() => new Promise(r => { resolverVieja = r }))
      .mockResolvedValueOnce(pagina(7))
    const store = useAnalisisV1Store()
    const vieja = store.cargarTabla(0)
    await store.cargarTabla(25)
    resolverVieja(pagina(999))
    await vieja
    expect(store.totalTabla).toBe(7)
    expect(store.offset).toBe(25)
  })
})

describe('useAnalisisV1Store — selección', () => {
  it('carga el detalle del sitio y lo limpia al deseleccionar', async () => {
    repo.getSitio.mockResolvedValue({ sitio_id: 'S1' } as never)
    const store = useAnalisisV1Store()
    await store.seleccionar('S1')
    expect(store.seleccionadoId).toBe('S1')
    expect(store.detalle?.sitio_id).toBe('S1')
    await store.seleccionar(null)
    expect(store.detalle).toBeNull()
  })

  it('muestra error si el sitio no existe', async () => {
    repo.getSitio.mockRejectedValue(new Error('Recurso no encontrado.'))
    const store = useAnalisisV1Store()
    await store.seleccionar('NO-EXISTE')
    expect(store.errorDetalle).toBe('Recurso no encontrado.')
    expect(store.detalle).toBeNull()
  })
})
