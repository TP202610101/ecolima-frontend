import api from '@/shared/api/axios'
import type { RecyclingPoint } from '../entities/RecyclingPoint'
import type { District } from '../entities/District'

export interface CoverageRedundancyItem {
  district_id: number
  district_name: string
  total_recommended: number
  already_covered: number
  redundancy_pct: number
  status: 'verde' | 'amarillo' | 'rojo'
  is_demo: boolean
}

export interface PointFilters {
  verified_only?: boolean
  material?: string
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
  },

  async getHeatmap(metric: string, district_id?: number): Promise<GeoJSON.FeatureCollection> {
    const params: Record<string, unknown> = { metric }
    if (district_id !== undefined) params.district_id = district_id
    const res = await api.get('/api/v1/map/heatmap', { params })
    return res.data
  },

  async getCoverageRedundancy(): Promise<CoverageRedundancyItem[]> {
    const res = await api.get('/api/v1/map/coverage-redundancy')
    return res.data
  },
}
