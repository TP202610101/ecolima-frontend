import api from '@/shared/api/axios'

export interface TrainingStats {
  total_labeled: number
  positive_labels: number
  districts_covered: number
  features_available: string[]
}

export const ReportsRepository = {
  async getRecommendationsList(limit = 500): Promise<GeoJSON.FeatureCollection> {
    const res = await api.get('/api/v1/ml/recommendations', { params: { limit } })
    return res.data
  },

  async getStats(): Promise<TrainingStats> {
    const res = await api.get('/api/v1/ml/training-set/stats')
    return res.data
  },
}
