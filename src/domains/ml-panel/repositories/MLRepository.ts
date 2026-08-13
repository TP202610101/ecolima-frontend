import api from '@/shared/api/axios'

export interface InferenceStatus {
  status: 'running' | 'done' | 'error'
  progress_pct: number
  zones_processed: number
}

export interface RecalculateResult {
  is_suitable: { updated_zones: number; positive_labels: number; negative_labels: number; null_zones: number }
  coverage_gaps: { updated_zones: number }
  existing_points_500m: { updated_zones: number }
}

export const MLRepository = {
  async getModels() {
    const res = await api.get('/api/v1/ml/models')
    return res.data
  },

  async activateModel(version: string) {
    const res = await api.patch(`/api/v1/ml/models/${version}`, { is_active: true })
    return res.data
  },

  async runInference(payload: { model_version: string; threshold: number }) {
    const res = await api.post('/api/v1/ml/run-inference', payload)
    return res.data
  },

  async getInferenceStatus(taskId: string): Promise<InferenceStatus> {
    const res = await api.get(`/api/v1/ml/inference-status/${taskId}`)
    return res.data
  },

  async recalculateCoverage(): Promise<RecalculateResult> {
    const res = await api.post('/api/v1/geo/recalculate')
    return res.data
  },
}
