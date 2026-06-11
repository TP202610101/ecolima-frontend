import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Recommendation } from '../entities/Recommendation'
import { GetRecommendationsUseCase } from '../use-cases/GetRecommendationsUseCase'

const ALL_NSE = ['A', 'B', 'C', 'D', 'E']
const NSE_TO_STRATUM: Record<string, number> = { A: 5, B: 4, C: 3, D: 2, E: 1 }

export const useRecommendationsStore = defineStore('recommendations', () => {
  const recommendations = ref<Recommendation[]>([])
  const selectedZone = ref<Recommendation | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const selectedPriorities = ref<string[]>(['Alta', 'Media', 'Baja'])
  const selectedDistrictName = ref<string | null>(null)
  const selectedNSE = ref<string[]>([...ALL_NSE])

  const filteredRecommendations = computed(() =>
    recommendations.value.filter(r => {
      const matchesPriority = selectedPriorities.value.includes(r.priority_label)
      const matchesDistrict = selectedDistrictName.value === null || r.district_name === selectedDistrictName.value
      const allNSESelected = selectedNSE.value.length === ALL_NSE.length
      const matchesNSE = allNSESelected
        || r.income_stratum === undefined
        || selectedNSE.value.some(nse => NSE_TO_STRATUM[nse] === r.income_stratum)
      return matchesPriority && matchesDistrict && matchesNSE
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

  function setFilters(
    priorities: string[],
    districtName: string | null = null,
    nse: string[] = [...ALL_NSE],
  ) {
    selectedPriorities.value = priorities
    selectedDistrictName.value = districtName
    selectedNSE.value = nse
  }

  return {
    recommendations,
    selectedZone,
    loading,
    error,
    selectedPriorities,
    selectedDistrictName,
    selectedNSE,
    filteredRecommendations,
    fetchRecommendations,
    selectZone,
    setFilters,
  }
})
