import { computed } from 'vue'
import { useAuthStore } from '@/domains/auth/stores/useAuthStore'

export function useAuth() {
  const store = useAuthStore()

  const isAdmin = computed(() => store.user?.role === 'admin')
  const isAnalista = computed(() => store.user?.role === 'analista')
  const userName = computed(() => store.user?.full_name || store.user?.email || '')
  const userInitials = computed(() => {
    const name = store.user?.full_name || ''
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'
  })

  return { isAdmin, isAnalista, userName, userInitials }
}
