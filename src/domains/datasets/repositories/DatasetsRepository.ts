import api from '@/shared/api/axios'

export const DatasetsRepository = {
  async list() {
    const res = await api.get('/api/v1/datasets')
    return res.data
  }
}
