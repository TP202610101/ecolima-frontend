import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Dataset } from '../entities/Dataset'
import { DatasetsRepository } from '../repositories/DatasetsRepository'

export const useDatasetsStore = defineStore('datasets', () => {
  const datasets = ref<Dataset[]>([])
  const loading = ref(false)
  const uploading = ref(false)
  const uploadResult = ref<Dataset | null>(null)
  const uploadError = ref<string | null>(null)

  async function fetchDatasets() {
    loading.value = true
    try {
      datasets.value = await DatasetsRepository.getDatasets()
    } catch {
      // non-critical
    } finally {
      loading.value = false
    }
  }

  async function uploadDataset(file: File) {
    uploading.value = true
    uploadResult.value = null
    uploadError.value = null
    try {
      uploadResult.value = await DatasetsRepository.uploadDataset(file)
      await fetchDatasets()
    } catch (e) {
      uploadError.value = e instanceof Error ? e.message : 'Error al subir el archivo'
    } finally {
      uploading.value = false
    }
  }

  function clearUploadState() {
    uploadResult.value = null
    uploadError.value = null
  }

  return { datasets, loading, uploading, uploadResult, uploadError, fetchDatasets, uploadDataset, clearUploadState }
})
