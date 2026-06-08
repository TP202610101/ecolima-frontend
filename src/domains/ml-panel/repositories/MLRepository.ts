import api from '@/shared/api/axios'

export const MLRepository = {
  async getModels() {
    const res = await api.get('/api/v1/ml/models')
    return res.data
  }
}
