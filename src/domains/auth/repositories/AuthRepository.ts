import api from '@/shared/api/axios'
import type { User } from '../entities/User'

export const AuthRepository = {
  async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
    const res = await api.post('/api/v1/auth/login', { email, password })
    return res.data
  },
  /** Pide el enlace de restablecimiento. El backend responde igual exista o no la cuenta. */
  async forgotPassword(email: string): Promise<void> {
    await api.post('/api/v1/auth/forgot-password', { email })
  },
  /** Cambia la contraseña con el token del enlace: 400 si el token no sirve, 422 si la contraseña no cumple la política. */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    await api.post('/api/v1/auth/reset-password', { token, new_password: newPassword })
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
