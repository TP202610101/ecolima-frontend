import { defineStore } from 'pinia'
import { ref } from 'vue'
import { MapRepository } from '@/domains/map/repositories/MapRepository'
import type { CoverageRedundancyItem } from '@/domains/map/repositories/MapRepository'

export type { CoverageRedundancyItem }

export const useCoverageRedundancyStore = defineStore('coverage-redundancy', () => {
  const items = ref<CoverageRedundancyItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchRedundancy() {
    loading.value = true
    error.value = null
    try {
      items.value = await MapRepository.getCoverageRedundancy()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar redundancia de cobertura'
    } finally {
      loading.value = false
    }
  }

  return { items, loading, error, fetchRedundancy }
})
