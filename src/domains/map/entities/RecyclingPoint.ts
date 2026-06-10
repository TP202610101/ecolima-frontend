export interface RecyclingPoint {
  point_id: number
  point_type: string | null
  address: string | null
  materials_accepted: string | null
  verified: boolean
  district_id: number
  distance_m?: number
  geometry: GeoJSON.Point
}
