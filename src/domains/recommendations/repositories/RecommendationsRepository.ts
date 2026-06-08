import api from '@/shared/api/axios'

export const RecommendationsRepository = {
  async getRecommendations(params = {}) {
    const res = await api.get('/api/v1/ml/recommendations', { params })
    return res.data
  }
}
