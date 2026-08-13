import api from '@/shared/api/axios'
import type { Dataset, ValidationResult, CommitResult } from '../entities/Dataset'

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
}
