import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Recommendation } from '../entities/Recommendation'
import { GetRecommendationsUseCase } from '../use-cases/GetRecommendationsUseCase'

export const useRecommendationsStore = defineStore('recommendations', () => {
  const recommendations = ref<Recommendation[]>([])
  const selectedZone = ref<Recommendation | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const selectedPriorities = ref<string[]>(['Alta', 'Media', 'Baja'])
  const selectedDistrictId = ref<number | null>(null)

  const filteredRecommendations = computed(() =>
    recommendations.value.filter(r => {
      const matchesPriority = selectedPriorities.value.includes(r.priority_label)
      const matchesDistrict = selectedDistrictId.value === null || true
      return matchesPriority && matchesDistrict
    })
  )

  async function fetchRecommendations(params = {}) {
    loading.value = true
    error.value = null
    try {
      recommendations.value = await GetRecommendationsUseCase.execute(params)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar recomendaciones'
    } finally {
      loading.value = false
    }
  }

  function selectZone(zone: Recommendation | null) {
    selectedZone.value = zone
  }

  function setFilters(priorities: string[], districtId: number | null = null) {
    selectedPriorities.value = priorities
    selectedDistrictId.value = districtId
  }

  return {
    recommendations,
    selectedZone,
    loading,
    error,
    selectedPriorities,
    filteredRecommendations,
    fetchRecommendations,
    selectZone,
    setFilters,
  }
})
