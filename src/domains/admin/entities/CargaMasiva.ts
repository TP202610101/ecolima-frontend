// Creación de usuarios en bloque (POST /api/v1/admin/users/bulk/validate y /bulk/confirm).
export interface ErrorFila {
  code: string
  message: string
}

export interface FilaCarga {
  line: number
  email: string
  full_name: string
  role: string
  status: 'ok' | 'error'
  errors: ErrorFila[]
}

/** 200 de /bulk/validate y cuerpo del 409 de /bulk/confirm. */
export interface ResultadoValidacion {
  valid: boolean
  total: number
  rows: FilaCarga[]
}

/** 201 de /bulk/confirm. */
export interface ResultadoCreacion {
  created: number
  invitations_sent: number
  invitations_failed: Array<{ email: string; line: number }>
}

export const LIMITE_BYTES = 1024 * 1024
export const LIMITE_FILAS = 200
