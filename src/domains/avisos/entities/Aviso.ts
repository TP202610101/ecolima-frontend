import type { User } from '@/domains/auth/entities/User'

// GET /api/v1/me/avisos?clave=&version=
export interface EstadoAviso {
  clave: string
  version: string
  confirmado: boolean
  confirmado_en: string | null
}

// Una fila de GET /api/v1/admin/avisos/confirmaciones?clave=&version=
export interface ConfirmacionUsuario {
  user_id: number
  email: string
  full_name: string | null
  role: User['role']
  confirmado: boolean
  confirmado_en: string | null
}
