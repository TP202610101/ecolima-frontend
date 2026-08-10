export interface Dataset {
  dataset_id: number
  filename: string
  uploaded_at: string
  row_count: number
  status: 'pending' | 'valid' | 'invalid' | 'committed' | 'failed'
  detected_columns: string[]
}

export interface ValidationResult {
  dataset_id: number
  valid: boolean
  missing_columns: string[]
  type_errors: Array<{ row_index: number; column: string; value: unknown; error: string }>
  row_count: number
  valid_rows: number
  error_rows: number
}

export interface CommitResult {
  inserted: number
  skipped_duplicates: number
  errors: Array<{ row_index?: number; error: string }>
}
