export interface Recommendation {
  zone_id: number
  priority_label: 'Alta' | 'Media' | 'Baja'
  recommendation_reason: string
  coverage_gap_m: number | null
  centroid_lat: number
  centroid_lon: number
  district_name: string
  income_stratum?: number
  ml_score?: number
  model_version?: string
  inference_date?: string
  geometry: GeoJSON.Polygon
}
