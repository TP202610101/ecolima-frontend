import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useReportsStore } from './useReportsStore'
import { ReportsRepository } from '../repositories/ReportsRepository'
import type { Recommendation } from '@/domains/recommendations/entities/Recommendation'

vi.mock('../repositories/ReportsRepository', () => ({
  ReportsRepository: {
    getRecommendationsList: vi.fn(),
    getStats: vi.fn(),
  },
}))

const mockFeature = (overrides: Partial<Recommendation> = {}) => ({
  type: 'Feature' as const,
  properties: {
    zone_id: 1,
    priority_label: 'Alta',
    recommendation_reason: 'Razón',
    coverage_gap_m: 2000,
    centroid_lat: -12.05,
    centroid_lon: -77.04,
    district_name: 'Miraflores',
    ...overrides,
  },
  geometry: {
    type: 'Polygon' as const,
    coordinates: [[[-77.04, -12.05], [-77.03, -12.05], [-77.03, -12.04], [-77.04, -12.04], [-77.04, -12.05]]],
  },
})

const mockGeojson = (features = [mockFeature()]) => ({
  type: 'FeatureCollection' as const,
  features,
})

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('useReportsStore — estado inicial', () => {
  it('inicia con arrays vacíos', () => {
    const store = useReportsStore()
    expect(store.recommendations).toHaveLength(0)
    expect(store.stats).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })
})

describe('useReportsStore — fetchAll', () => {
  it('carga recomendaciones y stats en paralelo', async () => {
    const stats = { total_labeled: 100, positive_labels: 40, districts_covered: 12, features_available: ['density', 'gpc', 'dist_nearest', 'fuel'] }
    vi.mocked(ReportsRepository.getRecommendationsList).mockResolvedValue(mockGeojson())
    vi.mocked(ReportsRepository.getStats).mockResolvedValue(stats)

    const store = useReportsStore()
    await store.fetchAll()

    expect(store.recommendations).toHaveLength(1)
    expect(store.stats).toEqual(stats)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('guarda error si falla getRecommendationsList', async () => {
    vi.mocked(ReportsRepository.getRecommendationsList).mockRejectedValue(new Error('Error del servidor'))
    vi.mocked(ReportsRepository.getStats).mockResolvedValue({ total_labeled: 0, positive_labels: 0, districts_covered: 0, features_available: [] })

    const store = useReportsStore()
    await store.fetchAll()

    expect(store.error).toBe('Error del servidor')
    expect(store.loading).toBe(false)
  })

  it('no falla si getStats devuelve error (non-critical)', async () => {
    vi.mocked(ReportsRepository.getRecommendationsList).mockResolvedValue(mockGeojson())
    vi.mocked(ReportsRepository.getStats).mockRejectedValue(new Error('404'))

    const store = useReportsStore()
    await store.fetchAll()

    expect(store.recommendations).toHaveLength(1)
    expect(store.stats).toBeNull()
    expect(store.error).toBeNull()
  })
})
