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
  const selectedMaterial = ref('')
  const showHeatmap = ref(false)
  const heatmapMetric = ref<'density' | 'priority' | 'gap'>('density')
  const heatmapPoints = ref<Array<[number, number, number]>>([])
  const loadingHeatmap = ref(false)
  const heatmapError = ref<string | null>(null)
  const selectedDistrictId = ref<number | undefined>(undefined)

  async function fetchPoints() {
    loadingPoints.value = true
    error.value = null
    try {
      points.value = await GetPointsUseCase(
        selectedMaterial.value ? { material: selectedMaterial.value } : {}
      )
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar puntos'
    } finally {
      loadingPoints.value = false
    }
  }

  async function fetchHeatmap() {
    loadingHeatmap.value = true
    heatmapError.value = null
    try {
      const geojson = await MapRepository.getHeatmap(heatmapMetric.value, selectedDistrictId.value)
      heatmapPoints.value = (geojson.features ?? []).map(f => {
        const coords = (f.geometry as GeoJSON.Point).coordinates
        const value = ((f.properties ?? {}) as { value: number }).value ?? 0
        return [coords[1], coords[0], value] as [number, number, number]
      })
    } catch (e) {
      heatmapError.value = e instanceof Error ? e.message : 'Error al cargar mapa de calor'
    } finally {
      loadingHeatmap.value = false
    }
  }

  async function setMaterial(material: string) {
    selectedMaterial.value = material
    await fetchPoints()
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

  return {
    points, districts, loadingPoints, loadingDistricts, error,
    showZones, showPoints, selectedMaterial,
    showHeatmap, heatmapMetric, heatmapPoints, loadingHeatmap, heatmapError, selectedDistrictId,
    fetchPoints, fetchDistricts, setMaterial, fetchHeatmap,
  }
})
