import { RecommendationsRepository, type RecommendationFilters } from '../repositories/RecommendationsRepository'
import type { Recommendation } from '../entities/Recommendation'

export const GetRecommendationsUseCase = {
  async execute(filters: RecommendationFilters = {}): Promise<Recommendation[]> {
    const geojson = await RecommendationsRepository.getAll(filters)
    return geojson.features.map(f => {
      const polygon = f.geometry as GeoJSON.Polygon
      const ring = polygon.coordinates[0]
      const centroid_lon = ring.reduce((s, c) => s + c[0], 0) / ring.length
      const centroid_lat = ring.reduce((s, c) => s + c[1], 0) / ring.length
      return {
        ...(f.properties as Recommendation),
        geometry: polygon,
        centroid_lat,
        centroid_lon,
      }
    })
  }
}
