import api from '@/shared/api/axios'

export const MapRepository = {
  async getPoints() {
    const res = await api.get('/api/v1/map/points')
    return res.data
  },
  async getDistricts() {
    const res = await api.get('/api/v1/map/districts')
    return res.data
  }
}
