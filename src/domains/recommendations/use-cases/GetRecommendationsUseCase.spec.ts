import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GetRecommendationsUseCase } from './GetRecommendationsUseCase'
import { RecommendationsRepository } from '../repositories/RecommendationsRepository'

vi.mock('../repositories/RecommendationsRepository', () => ({
  RecommendationsRepository: { getAll: vi.fn() },
}))

const mockGeojson = () => ({
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      properties: {
        zone_id: 1,
        priority_label: 'Alta',
        recommendation_reason: 'Alta densidad',
        coverage_gap_m: 1500,
        centroid_lat: -12.05,
        centroid_lon: -77.04,
        district_name: 'Surco',
        ml_score: 0.91,
      },
      geometry: { type: 'Polygon' as const, coordinates: [[]] },
    },
  ],
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GetRecommendationsUseCase', () => {
  it('convierte GeoJSON FeatureCollection a array de Recommendation', async () => {
    vi.mocked(RecommendationsRepository.getAll).mockResolvedValue(mockGeojson())

    const result = await GetRecommendationsUseCase.execute()

    expect(result).toHaveLength(1)
    expect(result[0].zone_id).toBe(1)
    expect(result[0].priority_label).toBe('Alta')
    expect(result[0].geometry.type).toBe('Polygon')
  })

  it('pasa los filtros al repositorio', async () => {
    vi.mocked(RecommendationsRepository.getAll).mockResolvedValue({ type: 'FeatureCollection', features: [] })

    await GetRecommendationsUseCase.execute({ priority: 'Alta', district_id: 150101, limit: 50 })

    expect(RecommendationsRepository.getAll).toHaveBeenCalledWith({
      priority: 'Alta',
      district_id: 150101,
      limit: 50,
    })
  })

  it('propaga el error del repositorio', async () => {
    vi.mocked(RecommendationsRepository.getAll).mockRejectedValue(new Error('Error del servidor'))

    await expect(GetRecommendationsUseCase.execute()).rejects.toThrow('Error del servidor')
  })
})
