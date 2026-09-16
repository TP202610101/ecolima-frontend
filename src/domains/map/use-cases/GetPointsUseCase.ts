import { MapRepository, type PointFilters } from '../repositories/MapRepository'
import type { RecyclingPoint } from '../entities/RecyclingPoint'

export async function GetPointsUseCase(filters: PointFilters = {}): Promise<RecyclingPoint[]> {
  const geojson = await MapRepository.getPoints(filters)
  return geojson.features.map(f => ({
    ...(f.properties as RecyclingPoint),
    geometry: f.geometry as GeoJSON.Point,
  }))
}
