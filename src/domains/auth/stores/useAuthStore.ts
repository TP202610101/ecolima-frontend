import { defineStore } from 'pinia'
import type { User } from '../entities/User'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null
  }),
  getters: {
    isAuthenticated: state => !!state.user || !!localStorage.getItem('access_token')
  },
  actions: {
    setUser(user: User | null) {
      this.user = user
    },
    logout() {
      this.user = null
      localStorage.removeItem('access_token')
      window.location.href = '/'
    }
  }
})
