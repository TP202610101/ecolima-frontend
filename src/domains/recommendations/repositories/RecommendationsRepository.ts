import api from '@/shared/api/axios'

export interface RecommendationFilters {
  priority?: 'Alta' | 'Media' | 'Baja'
  district_id?: number
  limit?: number
  // Enteros 1–5 (A=5, B=4, C=3, D=2, E=1). Ausente = sin filtro (todos los estratos).
  income_stratum?: number[]
}

export const RecommendationsRepository = {
  async getAll(filters: RecommendationFilters = {}): Promise<GeoJSON.FeatureCollection> {
    const params = new URLSearchParams()
    if (filters.priority) params.append('priority', filters.priority)
    if (filters.district_id) params.append('district_id', String(filters.district_id))
    params.append('limit', String(filters.limit ?? 500))
    if (filters.income_stratum?.length) {
      filters.income_stratum.forEach(s => params.append('income_stratum', String(s)))
    }
    const res = await api.get(`/api/v1/ml/recommendations?${params}`)
    return res.data
  }
}
