import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRecommendationsStore } from './useRecommendationsStore'
import { GetRecommendationsUseCase } from '../use-cases/GetRecommendationsUseCase'
import type { Recommendation } from '../entities/Recommendation'

vi.mock('../use-cases/GetRecommendationsUseCase', () => ({
  GetRecommendationsUseCase: { execute: vi.fn() },
}))

const mockRec = (overrides: Partial<Recommendation> = {}): Recommendation => ({
  zone_id: 1,
  priority_label: 'Alta',
  recommendation_reason: 'Alta densidad poblacional',
  coverage_gap_m: 3000,
  centroid_lat: -12.05,
  centroid_lon: -77.04,
  district_name: 'Miraflores',
  income_stratum: 5,
  geometry: { type: 'Polygon', coordinates: [[]] },
  ...overrides,
})

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('useRecommendationsStore — estado inicial', () => {
  it('inicia sin recomendaciones', () => {
    const store = useRecommendationsStore()
    expect(store.recommendations).toHaveLength(0)
    expect(store.selectedZone).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('filteredRecommendations devuelve todas las recomendaciones por defecto', () => {
    const store = useRecommendationsStore()
    store.recommendations = [mockRec(), mockRec({ zone_id: 2, priority_label: 'Media' })]
    expect(store.filteredRecommendations).toHaveLength(2)
  })
})

describe('useRecommendationsStore — fetchRecommendations', () => {
  it('carga recomendaciones correctamente', async () => {
    const recs = [mockRec()]
    vi.mocked(GetRecommendationsUseCase.execute).mockResolvedValue(recs)
    const store = useRecommendationsStore()
    await store.fetchRecommendations()
    expect(store.recommendations).toEqual(recs)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('captura error y lo guarda en state', async () => {
    vi.mocked(GetRecommendationsUseCase.execute).mockRejectedValue(new Error('Error de red'))
    const store = useRecommendationsStore()
    await store.fetchRecommendations()
    expect(store.recommendations).toHaveLength(0)
    expect(store.error).toBe('Error de red')
  })
})

describe('useRecommendationsStore — selectZone', () => {
  it('selecciona una zona', () => {
    const store = useRecommendationsStore()
    const zone = mockRec()
    store.selectZone(zone)
    expect(store.selectedZone).toEqual(zone)
  })

  it('deselecciona con null', () => {
    const store = useRecommendationsStore()
    store.selectZone(mockRec())
    store.selectZone(null)
    expect(store.selectedZone).toBeNull()
  })
})

describe('useRecommendationsStore — setFilters', () => {
  it('filtra por prioridad', () => {
    const store = useRecommendationsStore()
    store.recommendations = [
      mockRec({ zone_id: 1, priority_label: 'Alta' }),
      mockRec({ zone_id: 2, priority_label: 'Baja' }),
    ]
    store.setFilters(['Alta'], null)
    expect(store.filteredRecommendations).toHaveLength(1)
    expect(store.filteredRecommendations[0].zone_id).toBe(1)
  })

  it('filtra por nombre de distrito', () => {
    const store = useRecommendationsStore()
    store.recommendations = [
      mockRec({ zone_id: 1, district_name: 'Miraflores' }),
      mockRec({ zone_id: 2, district_name: 'San Isidro' }),
    ]
    store.setFilters(['Alta', 'Media', 'Baja'], 'Miraflores')
    expect(store.filteredRecommendations).toHaveLength(1)
    expect(store.filteredRecommendations[0].district_name).toBe('Miraflores')
  })

  it('filtra por NSE usando income_stratum', () => {
    const store = useRecommendationsStore()
    store.recommendations = [
      mockRec({ zone_id: 1, income_stratum: 5 }),  // NSE A
      mockRec({ zone_id: 2, income_stratum: 2 }),  // NSE D
    ]
    store.setFilters(['Alta', 'Media', 'Baja'], null, ['A'])
    expect(store.filteredRecommendations).toHaveLength(1)
    expect(store.filteredRecommendations[0].zone_id).toBe(1)
  })
})
