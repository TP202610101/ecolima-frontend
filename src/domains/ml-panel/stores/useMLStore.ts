import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ModelVersion, ModelVersionMetrics } from '../entities/ModelVersion'
import { MLRepository } from '../repositories/MLRepository'
import type { RecalculateResult } from '../repositories/MLRepository'
import { GetRecommendationsUseCase } from '@/domains/recommendations/use-cases/GetRecommendationsUseCase'

export interface ZoneSnapshot {
  zoneId: number
  districtName: string
  priorityLabel: string
}

export interface UpdateRecommendationsResult {
  newZones: ZoneSnapshot[]
  retiredZones: ZoneSnapshot[]
  unchangedCount: number
}

export const useMLStore = defineStore('ml', () => {
  const models = ref<ModelVersion[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const inferenceTaskId = ref<string | null>(null)
  const inferring = ref(false)
  const inferenceProgress = ref(0)
  const inferenceError = ref<string | null>(null)
  const zonesProcessed = ref(0)
  const estimatedZones = ref(0)
  const activatingVersion = ref<string | null>(null)
  const recalculating = ref(false)
  const recalculateResult = ref<RecalculateResult | null>(null)
  const recalculateError = ref<string | null>(null)
  const updating = ref(false)
  const updateResult = ref<UpdateRecommendationsResult | null>(null)
  const updateError = ref<string | null>(null)

  const compareFetching = ref(false)
  const compareResult = ref<{ a: ModelVersionMetrics; b: ModelVersionMetrics } | null>(null)
  const compareError = ref<string | null>(null)

  const activeModel = computed(() => models.value.find(m => m.is_active) ?? null)

  let pollTimer: ReturnType<typeof setInterval> | null = null

  async function fetchModels() {
    loading.value = true
    error.value = null
    try {
      models.value = await MLRepository.getModels()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar modelos'
    } finally {
      loading.value = false
    }
  }

  async function activateModel(version: string) {
    activatingVersion.value = version
    error.value = null
    try {
      await MLRepository.activateModel(version)
      await fetchModels()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al activar modelo'
    } finally {
      activatingVersion.value = null
    }
  }

  // Retorna una Promise que resuelve cuando el polling termina (done) o rechaza (error).
  // startPolling() la llama silenciando el rechazo para el botón individual de inferencia.
  function _pollUntilDone(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (pollTimer) clearInterval(pollTimer)
      pollTimer = setInterval(async () => {
        if (!inferenceTaskId.value) return
        try {
          const status = await MLRepository.getInferenceStatus(inferenceTaskId.value)
          inferenceProgress.value = status.progress_pct ?? 0
          zonesProcessed.value = status.zones_processed ?? 0
          if (status.status === 'done') {
            stopPolling()
            inferring.value = false
            await fetchModels()
            resolve()
          } else if (status.status === 'error') {
            stopPolling()
            inferring.value = false
            inferenceError.value = 'El proceso de inferencia terminó con error'
            reject(new Error(inferenceError.value))
          }
        } catch (e) {
          stopPolling()
          inferring.value = false
          reject(e)
        }
      }, 2000)
    })
  }

  function startPolling() {
    _pollUntilDone().catch(() => {})
  }

  async function runInference() {
    inferring.value = true
    inferenceError.value = null
    inferenceProgress.value = 0
    zonesProcessed.value = 0
    estimatedZones.value = 0
    try {
      const result = await MLRepository.runInference({ model_version: 'latest', threshold: 0.5 })
      inferenceTaskId.value = result.task_id
      estimatedZones.value = result.estimated_zones ?? 0
      startPolling()
    } catch (e) {
      inferring.value = false
      inferenceError.value = e instanceof Error ? e.message : 'Error al ejecutar inferencia'
    }
  }

  async function recalculateCoverage() {
    recalculating.value = true
    recalculateResult.value = null
    recalculateError.value = null
    try {
      recalculateResult.value = await MLRepository.recalculateCoverage()
    } catch (e) {
      recalculateError.value = e instanceof Error ? e.message : 'Error al recalcular cobertura'
    } finally {
      recalculating.value = false
    }
  }

  async function updateRecommendations() {
    updating.value = true
    updateResult.value = null
    updateError.value = null
    try {
      // a. Snapshot ANTES — conjunto de zone_id presentes
      const beforeRecs = await GetRecommendationsUseCase.execute({ limit: 1000 })
      const beforeMap = new Map<number, ZoneSnapshot>(
        beforeRecs.map(r => [r.zone_id, { zoneId: r.zone_id, districtName: r.district_name, priorityLabel: r.priority_label }])
      )

      // b. Recalcular cobertura
      await recalculateCoverage()
      if (recalculateError.value) throw new Error(recalculateError.value)

      // c. Ejecutar inferencia y esperar a que el polling termine
      inferring.value = true
      inferenceError.value = null
      inferenceProgress.value = 0
      zonesProcessed.value = 0
      estimatedZones.value = 0
      const inferResult = await MLRepository.runInference({ model_version: 'latest', threshold: 0.5 })
      inferenceTaskId.value = inferResult.task_id
      estimatedZones.value = inferResult.estimated_zones ?? 0
      await _pollUntilDone()

      // d. Snapshot DESPUÉS
      const afterRecs = await GetRecommendationsUseCase.execute({ limit: 1000 })
      const afterMap = new Map<number, ZoneSnapshot>(
        afterRecs.map(r => [r.zone_id, { zoneId: r.zone_id, districtName: r.district_name, priorityLabel: r.priority_label }])
      )

      // e. Diff por teoría de conjuntos (presencia/ausencia de zone_id)
      const newZones: ZoneSnapshot[] = []
      const retiredZones: ZoneSnapshot[] = []
      let unchangedCount = 0
      for (const [id, snap] of afterMap) {
        if (beforeMap.has(id)) unchangedCount++
        else newZones.push(snap)
      }
      for (const [id, snap] of beforeMap) {
        if (!afterMap.has(id)) retiredZones.push(snap)
      }

      updateResult.value = { newZones, retiredZones, unchangedCount }
    } catch (e) {
      updateError.value = e instanceof Error ? e.message : 'Error al actualizar recomendaciones'
    } finally {
      updating.value = false
    }
  }

  async function fetchCompare(vA: string, vB: string) {
    compareFetching.value = true
    compareError.value = null
    compareResult.value = null
    try {
      const [a, b] = await Promise.all([
        MLRepository.getModelMetrics(vA),
        MLRepository.getModelMetrics(vB),
      ])
      compareResult.value = { a, b }
    } catch (e) {
      compareError.value = e instanceof Error ? e.message : 'Error al obtener métricas para comparar'
    } finally {
      compareFetching.value = false
    }
  }

  function clearCompare() {
    compareResult.value = null
    compareError.value = null
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  return {
    models,
    activeModel,
    loading,
    error,
    inferenceTaskId,
    inferring,
    inferenceProgress,
    inferenceError,
    zonesProcessed,
    estimatedZones,
    activatingVersion,
    recalculating,
    recalculateResult,
    recalculateError,
    updating,
    updateResult,
    updateError,
    recalculateCoverage,
    fetchModels,
    activateModel,
    runInference,
    updateRecommendations,
    stopPolling,
    compareFetching,
    compareResult,
    compareError,
    fetchCompare,
    clearCompare,
  }
})
