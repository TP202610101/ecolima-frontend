export interface AdminUser {
  user_id: number
  email: string
  full_name: string
  role: 'admin' | 'analista'
  is_active: boolean
  created_at: string
}

export interface CreateUserPayload {
  email: string
  password: string
  full_name?: string
  role: 'admin' | 'analista'
}
