export interface ModelVersion {
  version_name: string
  training_date: string
  is_active: boolean
  metrics: {
    accuracy: number
    f1: number
    auc_pr: number
    precision: number
    recall: number
  }
}
