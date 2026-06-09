import api from '@/shared/api/axios'
import type { User } from '../entities/User'

const devUsers: Record<string, { password: string; user: User }> = {
  'admin@ecolima.pe': {
    password: 'AdminSeguro2026!',
    user: {
      user_id: 1,
      email: 'admin@ecolima.pe',
      full_name: 'Admin EcoLima',
      role: 'admin'
    }
  },
  'analista@ecolima.pe': {
    password: 'AnalistaSeguro2026!',
    user: {
      user_id: 2,
      email: 'analista@ecolima.pe',
      full_name: 'Analista EcoLima',
      role: 'analista'
    }
  }
}

export const AuthRepository = {
  async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
    try {
      const res = await api.post('/api/v1/auth/login', { email, password })
      return res.data
    } catch (error: any) {
      if (!error.response) {
        const candidate = devUsers[email.toLowerCase()]
        if (candidate && candidate.password === password) {
          return {
            access_token: 'ecolima-dev-token',
            user: candidate.user
          }
        }
      }
      throw error
    }
  },
  async logout() {
    try {
      await api.post('/api/v1/auth/logout')
    } catch {
      // ignore logout errors in dev fallback
    }
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
  }
}
