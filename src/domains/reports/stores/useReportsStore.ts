import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Recommendation } from '@/domains/recommendations/entities/Recommendation'
import { ReportsRepository, type TrainingStats } from '../repositories/ReportsRepository'

export const useReportsStore = defineStore('reports', () => {
  const recommendations = ref<Recommendation[]>([])
  const stats = ref<TrainingStats | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      const [geojson] = await Promise.all([
        ReportsRepository.getRecommendationsList(),
        ReportsRepository.getStats().then(s => { stats.value = s }).catch(() => {}),
      ])
      recommendations.value = geojson.features.map(f => {
        const polygon = f.geometry as GeoJSON.Polygon
        const ring = polygon.coordinates[0]
        const centroid_lon = ring.reduce((s, c) => s + c[0], 0) / ring.length
        const centroid_lat = ring.reduce((s, c) => s + c[1], 0) / ring.length
        return {
          ...(f.properties as Recommendation),
          geometry: polygon,
          centroid_lat,
          centroid_lon,
        }
      })
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar reporte'
    } finally {
      loading.value = false
    }
  }

  return { recommendations, stats, loading, error, fetchAll }
})
