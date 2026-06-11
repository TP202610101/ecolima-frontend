import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ModelVersion } from '../entities/ModelVersion'
import { MLRepository } from '../repositories/MLRepository'

export const useMLStore = defineStore('ml', () => {
  const models = ref<ModelVersion[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const inferenceTaskId = ref<string | null>(null)
  const inferring = ref(false)
  const inferenceProgress = ref(0)
  const inferenceError = ref<string | null>(null)

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
    try {
      await MLRepository.activateModel(version)
      await fetchModels()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al activar modelo'
    }
  }

  async function runInference() {
    inferring.value = true
    inferenceError.value = null
    inferenceProgress.value = 0
    try {
      const result = await MLRepository.runInference({ model_version: 'latest', threshold: 0.5 })
      inferenceTaskId.value = result.task_id
      startPolling()
    } catch (e) {
      inferring.value = false
      inferenceError.value = e instanceof Error ? e.message : 'Error al ejecutar inferencia'
    }
  }

  function startPolling() {
    if (pollTimer) clearInterval(pollTimer)
    pollTimer = setInterval(async () => {
      if (!inferenceTaskId.value) return
      try {
        const status = await MLRepository.getInferenceStatus(inferenceTaskId.value)
        inferenceProgress.value = status.progress_pct ?? 0
        if (status.status === 'done') {
          stopPolling()
          inferring.value = false
          await fetchModels()
        } else if (status.status === 'error') {
          stopPolling()
          inferring.value = false
          inferenceError.value = 'El proceso de inferencia terminó con error'
        }
      } catch {
        stopPolling()
        inferring.value = false
      }
    }, 2000)
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
    fetchModels,
    activateModel,
    runInference,
    stopPolling,
  }
})
