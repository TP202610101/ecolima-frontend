export interface ModelVersion {
  version_name: string
  training_date: string
  is_active: boolean
  artifact_url?: string
  created_at?: string
  metrics: {
    accuracy: number
    f1: number
    auc_pr: number
    precision: number
    recall: number
  }
}
