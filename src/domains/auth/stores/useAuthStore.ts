import { defineStore } from 'pinia'
import type { User } from '../entities/User'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    token: null as string | null,
    error: null as string | null
  }),
  getters: {
    isAuthenticated: state => !!state.user,
    isAdmin: state => state.user?.role === 'admin'
  },
  actions: {
    initFromStorage() {
      const token = localStorage.getItem('access_token')
      const userJson = localStorage.getItem('user')
      if (token && userJson) {
        try {
          this.token = token
          this.user = JSON.parse(userJson) as User
        } catch {
          localStorage.removeItem('access_token')
          localStorage.removeItem('user')
          this.token = null
          this.user = null
        }
      }
    },
    setSession(user: User, token: string) {
      this.user = user
      this.token = token
      this.error = null
      localStorage.setItem('access_token', token)
      localStorage.setItem('user', JSON.stringify(user))
    },
    clearSession() {
      this.user = null
      this.token = null
      this.error = null
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
    },
    logout() {
      this.clearSession()
    },
    setError(message: string) {
      this.error = message
    }
  }
})
