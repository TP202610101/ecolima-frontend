import api from '@/shared/api/axios'
import type { RecyclingPoint } from '../entities/RecyclingPoint'
import type { District } from '../entities/District'

export interface PointFilters {
  verified_only?: boolean
}

export const MapRepository = {
  async getPoints(filters: PointFilters = {}): Promise<GeoJSON.FeatureCollection> {
    const res = await api.get('/api/v1/map/points', { params: filters })
    return res.data
  },

  async getDistricts(): Promise<GeoJSON.FeatureCollection> {
    const res = await api.get('/api/v1/map/districts')
    return res.data
  },

  async getNearby(lat: number, lon: number, radius_m = 2000): Promise<GeoJSON.FeatureCollection> {
    const res = await api.get('/api/v1/map/points', {
      params: { lat, lon, radius_m }
    })
    return res.data
  }
}
