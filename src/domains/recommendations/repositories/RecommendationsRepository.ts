import api from '@/shared/api/axios'

export interface RecommendationFilters {
  priority?: 'Alta' | 'Media' | 'Baja'
  district_id?: number
  limit?: number
}

export const RecommendationsRepository = {
  async getAll(filters: RecommendationFilters = {}): Promise<GeoJSON.FeatureCollection> {
    const params = new URLSearchParams()
    if (filters.priority) params.append('priority', filters.priority)
    if (filters.district_id) params.append('district_id', String(filters.district_id))
    params.append('limit', String(filters.limit ?? 200))
    const res = await api.get(`/api/v1/ml/recommendations?${params}`)
    return res.data
  }
}
