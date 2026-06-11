import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { RecyclingPoint } from '../entities/RecyclingPoint'
import type { District } from '../entities/District'
import { GetPointsUseCase } from '../use-cases/GetPointsUseCase'
import { MapRepository } from '../repositories/MapRepository'

export const useMapStore = defineStore('map', () => {
  const points = ref<RecyclingPoint[]>([])
  const districts = ref<District[]>([])
  const loadingPoints = ref(false)
  const loadingDistricts = ref(false)
  const error = ref<string | null>(null)
  const showZones = ref(true)
  const showPoints = ref(true)

  async function fetchPoints() {
    loadingPoints.value = true
    error.value = null
    try {
      points.value = await GetPointsUseCase()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar puntos'
    } finally {
      loadingPoints.value = false
    }
  }

  async function fetchDistricts() {
    loadingDistricts.value = true
    try {
      const geojson = await MapRepository.getDistricts()
      districts.value = geojson.features.map(f => ({
        ...(f.properties as District),
        geometry: f.geometry as GeoJSON.Polygon,
      }))
    } catch (e) {
      // non-critical
    } finally {
      loadingDistricts.value = false
    }
  }

  return { points, districts, loadingPoints, loadingDistricts, error, showZones, showPoints, fetchPoints, fetchDistricts }
})
