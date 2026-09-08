import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Dataset, ValidationResult, CommitResult } from '../entities/Dataset'
import { FetchDatasetsUseCase } from '../use-cases/FetchDatasetsUseCase'
import { UploadDatasetUseCase } from '../use-cases/UploadDatasetUseCase'
import { DatasetsRepository } from '../repositories/DatasetsRepository'

export const useDatasetsStore = defineStore('datasets', () => {
  const datasets = ref<Dataset[]>([])
  const loading = ref(false)
  const uploading = ref(false)
  const uploadResult = ref<Dataset | null>(null)
  const uploadError = ref<string | null>(null)
  const isUploaderOpen = ref(false)

  const validatingId = ref<number | null>(null)
  const committingId = ref<number | null>(null)
  const lastValidation = ref<{ datasetId: number; filename: string; result: ValidationResult } | null>(null)
  const lastCommit = ref<{ datasetId: number; filename: string; result: CommitResult } | null>(null)
  const actionError = ref<string | null>(null)

  const deletingRows = ref<number | null>(null)
  const deleteRowsResult = ref<{ deleted_count: number; remaining_rows: number; filename: string } | null>(null)
  const deleteRowsError = ref<string | null>(null)

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

  async function validateDataset(id: number, filename: string) {
    validatingId.value = id
    lastValidation.value = null
    lastCommit.value = null
    actionError.value = null
    try {
      const result = await DatasetsRepository.validateDataset(id)
      lastValidation.value = { datasetId: id, filename, result }
      await fetchDatasets()
    } catch (e) {
      actionError.value = e instanceof Error ? e.message : 'Error al validar el dataset'
    } finally {
      validatingId.value = null
    }
  }

  async function commitDataset(id: number, filename: string) {
    committingId.value = id
    lastValidation.value = null
    lastCommit.value = null
    actionError.value = null
    try {
      const result = await DatasetsRepository.commitDataset(id)
      lastCommit.value = { datasetId: id, filename, result }
      await fetchDatasets()
    } catch (e) {
      actionError.value = e instanceof Error ? e.message : 'Error al confirmar el dataset'
    } finally {
      committingId.value = null
    }
  }

  async function deleteIncompleteRows(id: number, filename: string) {
    deletingRows.value = id
    deleteRowsResult.value = null
    deleteRowsError.value = null
    try {
      const result = await DatasetsRepository.deleteIncompleteRows(id)
      deleteRowsResult.value = { ...result, filename }
      lastValidation.value = null
      await fetchDatasets()
    } catch (e) {
      deleteRowsError.value = e instanceof Error ? e.message : 'Error al eliminar filas incompletas'
    } finally {
      deletingRows.value = null
    }
  }

  async function deleteSelectedRows(id: number, filename: string, rowIndices: number[], reason: string) {
    deletingRows.value = id
    deleteRowsResult.value = null
    deleteRowsError.value = null
    try {
      const result = await DatasetsRepository.deleteSelectedRows(id, rowIndices, reason, true)
      deleteRowsResult.value = { ...result, filename }
      lastValidation.value = null
      await fetchDatasets()
    } catch (e) {
      deleteRowsError.value = e instanceof Error ? e.message : 'Error al eliminar filas seleccionadas'
    } finally {
      deletingRows.value = null
    }
  }

  function clearDeleteResult() {
    deleteRowsResult.value = null
    deleteRowsError.value = null
  }

  function clearLastResult() {
    lastValidation.value = null
    lastCommit.value = null
    actionError.value = null
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
    validatingId,
    committingId,
    lastValidation,
    lastCommit,
    actionError,
    deletingRows,
    deleteRowsResult,
    deleteRowsError,
    fetchDatasets,
    uploadDataset,
    validateDataset,
    commitDataset,
    deleteIncompleteRows,
    deleteSelectedRows,
    clearDeleteResult,
    clearLastResult,
    clearUploadState,
    openUploader,
    closeUploader,
  }
})
