export interface Dataset {
  dataset_id: number
  filename: string
  uploaded_at: string
  row_count: number
  status: 'pending' | 'valid' | 'invalid' | 'committed'
  detected_columns: string[]
}
