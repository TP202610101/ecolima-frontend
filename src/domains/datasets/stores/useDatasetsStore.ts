import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Dataset } from '../entities/Dataset'
import { FetchDatasetsUseCase } from '../use-cases/FetchDatasetsUseCase'
import { UploadDatasetUseCase } from '../use-cases/UploadDatasetUseCase'

export const useDatasetsStore = defineStore('datasets', () => {
  const datasets = ref<Dataset[]>([])
  const loading = ref(false)
  const uploading = ref(false)
  const uploadResult = ref<Dataset | null>(null)
  const uploadError = ref<string | null>(null)
  const isUploaderOpen = ref(false)

  async function fetchDatasets() {
    loading.value = true
    try {
      datasets.value = await FetchDatasetsUseCase.execute()
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
      uploadResult.value = await UploadDatasetUseCase.execute(file)
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

  function openUploader() {
    clearUploadState()
    isUploaderOpen.value = true
  }

  function closeUploader() {
    clearUploadState()
    isUploaderOpen.value = false
    fetchDatasets()
  }

  return {
    datasets,
    loading,
    uploading,
    uploadResult,
    uploadError,
    isUploaderOpen,
    fetchDatasets,
    uploadDataset,
    clearUploadState,
    openUploader,
    closeUploader,
  }
})
