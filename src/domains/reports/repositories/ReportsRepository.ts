import api from '@/shared/api/axios'

export const ReportsRepository = {
  async getRecommendationsReport() {
    const res = await api.get('/api/v1/ml/recommendations', { params: { limit: 500 } })
    return res.data
  }
}
