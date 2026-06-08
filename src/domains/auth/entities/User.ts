export interface User {
  user_id: number
  email: string
  full_name: string
  role: 'admin' | 'analista' | 'ciudadano'
}
