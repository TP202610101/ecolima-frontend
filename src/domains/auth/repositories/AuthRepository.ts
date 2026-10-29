import api from '@/shared/api/axios'
import type { User } from '../entities/User'

export const AuthRepository = {
  async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
    const res = await api.post('/api/v1/auth/login', { email, password })
    return res.data
  },
  async logout() {
    try {
      await api.post('/api/v1/auth/logout')
    } catch {
      // ignorar errores de logout: la sesión local se limpia igualmente
    }
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
  }
}
