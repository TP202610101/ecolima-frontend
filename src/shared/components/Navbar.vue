<template>
  <nav class="h-14 bg-white border-b border-border px-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
        <Recycle class="w-5 h-5 text-white" />
      </div>
      <div>
        <p class="text-sm font-semibold text-foreground">EcoLima ML</p>
        <p class="text-xs text-muted-foreground">Municipalidad de Lima</p>
      </div>
    </div>

    <div class="flex items-center gap-4">
      <div v-if="auth.isAuthenticated" class="flex items-center gap-1">
        <router-link :class="linkClass('/analisis')" to="/analisis">Análisis</router-link>
        <router-link :class="linkClass('/reportes')" to="/reportes">Reportes</router-link>
        <router-link
          v-if="auth.isAdmin"
          :class="linkClass('/panel-ml')"
          to="/panel-ml"
        >
          Panel ML
        </router-link>
      </div>
    </div>

    <div v-if="auth.isAuthenticated" class="flex items-center gap-3">
      <div class="hidden sm:block text-right">
        <p class="text-sm font-semibold text-foreground">{{ auth.user?.full_name }}</p>
        <p class="text-xs text-muted-foreground capitalize">{{ auth.user?.role }}</p>
      </div>
      <div class="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-sm font-semibold text-white">
        {{ initials }}
      </div>
      <button
        type="button"
        @click="onLogout"
        class="p-2 rounded hover:bg-secondary transition-colors"
        aria-label="Cerrar sesión"
      >
        <LogOut class="w-4 h-4 text-muted-foreground hover:text-foreground" />
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Recycle, LogOut } from '@lucide/vue'
import { useAuthStore } from '@/domains/auth/stores/useAuthStore'
import { LogoutUseCase } from '@/domains/auth/use-cases/LogoutUseCase'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const initials = computed(() => {
  const name = auth.user?.full_name || auth.user?.email || ''
  const parts = name.split(' ').filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
})

function linkClass(path: string) {
  return route.path === path
    ? 'px-4 py-1.5 text-sm text-white rounded-md bg-primary font-medium'
    : 'px-4 py-1.5 text-sm text-foreground rounded-md hover:bg-secondary transition-colors'
}

async function onLogout() {
  await LogoutUseCase()
  router.push('/')
}
</script>
