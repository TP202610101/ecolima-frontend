import { MapRepository } from '../repositories/MapRepository'
import type { RecyclingPoint } from '../entities/RecyclingPoint'

export async function GetNearbyUseCase(lat: number, lon: number, radius_m = 2000): Promise<RecyclingPoint[]> {
  const geojson = await MapRepository.getNearby(lat, lon, radius_m)
  return geojson.features.map(f => ({
    ...(f.properties as RecyclingPoint),
    geometry: f.geometry as GeoJSON.Point,
  }))
}
