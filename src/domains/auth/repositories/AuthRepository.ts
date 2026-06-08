import api from '@/shared/api/axios'
import type { User } from '../entities/User'

export const AuthRepository = {
  async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
    const res = await api.post('/api/v1/auth/login', { email, password })
    return res.data
  },
  async logout() {
    await api.post('/api/v1/auth/logout')
    localStorage.removeItem('access_token')
  }
}
