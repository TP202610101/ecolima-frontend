import api from '@/shared/api/axios'
import type { Dataset, ValidationResult, CommitResult } from '../entities/Dataset'

export interface DatasetAuditEntry {
  audit_id: number
  action: string
  user_id: number | null
  created_at: string | null
  details: Record<string, unknown> | null
}

export interface DatasetHistoryResponse {
  dataset_id: number
  filename: string
  uploads: DatasetAuditEntry[]
  validations: DatasetAuditEntry[]
  edits: DatasetAuditEntry[]
  commit: DatasetAuditEntry | null
  exported_at: string | null
}

export const DatasetsRepository = {
  async getDatasets(): Promise<Dataset[]> {
    const res = await api.get('/api/v1/datasets')
    return res.data
  },

  async uploadDataset(file: File): Promise<Dataset> {
    const form = new FormData()
    form.append('file', file)
    const res = await api.post('/api/v1/datasets', form)
    return res.data
  },

  async validateDataset(datasetId: number): Promise<ValidationResult> {
    const res = await api.get(`/api/v1/datasets/${datasetId}/validate`)
    return res.data
  },

  async commitDataset(datasetId: number): Promise<CommitResult> {
    const res = await api.patch(`/api/v1/datasets/${datasetId}`, { status: 'committed' })
    return res.data
  },

  async exportDataset(datasetId: number, format: 'csv' | 'xlsx'): Promise<{ blob: Blob; filename: string }> {
    const res = await api.get(`/api/v1/datasets/${datasetId}/export`, {
      params: { format },
      responseType: 'blob',
    })
    const disposition: string = res.headers['content-disposition'] ?? ''
    const match = disposition.match(/filename=([^;"\r\n]+)/)
    const filename = match ? match[1].trim() : `dataset_${datasetId}_limpio.${format}`
    return { blob: res.data as Blob, filename }
  },

  async deleteIncompleteRows(datasetId: number): Promise<{ deleted_count: number; remaining_rows: number }> {
    const res = await api.delete(`/api/v1/datasets/${datasetId}/rows`, {
      params: { status: 'incomplete' },
    })
    return res.data
  },

  async deleteSelectedRows(
    datasetId: number,
    rowIndices: number[],
    reason: string,
    confirmed: boolean,
  ): Promise<{ deleted_count: number; remaining_rows: number }> {
    const res = await api.delete(`/api/v1/datasets/${datasetId}/rows`, {
      params: { confirm: confirmed },
      data: { row_indices: rowIndices, reason },
    })
    return res.data
  },

  async editDatasetCells(
    datasetId: number,
    edits: Array<{ row_index: number; column: string; new_value: unknown }>,
  ): Promise<{ edited_count: number }> {
    const res = await api.patch(`/api/v1/datasets/${datasetId}/cells`, { edits })
    return res.data
  },

  async getDatasetHistory(datasetId: number): Promise<DatasetHistoryResponse> {
    const res = await api.get(`/api/v1/datasets/${datasetId}/history`)
    return res.data
  },

  async deleteDataset(datasetId: number): Promise<void> {
    await api.delete(`/api/v1/datasets/${datasetId}`)
  },
}
