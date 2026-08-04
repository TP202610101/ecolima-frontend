<template>
  <nav class="sticky top-0 z-50 h-14 bg-white border-b border-border px-4 flex items-center justify-between print:hidden">

    <!-- Logo -->
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
        <Recycle class="w-5 h-5 text-white" />
      </div>
      <div>
        <p class="text-sm font-semibold text-foreground">EcoLima ML</p>
        <p class="hidden sm:block text-xs text-muted-foreground">Municipalidad de Lima</p>
      </div>
    </div>

    <!-- Desktop: tabs de navegación -->
    <div v-if="auth.isAuthenticated" class="hidden sm:flex items-center gap-1">
      <router-link :class="linkClass('/analisis')" to="/analisis">Análisis</router-link>
      <router-link :class="linkClass('/reportes')" to="/reportes">Reportes</router-link>
      <router-link v-if="auth.isAdmin" :class="linkClass('/panel-ml')" to="/panel-ml">Panel ML</router-link>
    </div>

    <!-- Zona derecha -->
    <div v-if="auth.isAuthenticated" class="flex items-center gap-2 sm:gap-3">
      <!-- Nombre y rol (solo desktop) -->
      <div class="hidden sm:block text-right">
        <p class="text-sm font-semibold text-foreground">{{ auth.user?.full_name }}</p>
        <p class="text-xs text-muted-foreground capitalize">{{ auth.user?.role }}</p>
      </div>
      <!-- Avatar (siempre visible) -->
      <div class="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-sm font-semibold text-white">
        {{ initials }}
      </div>
      <!-- Logout (solo desktop) -->
      <button
        type="button"
        @click="onLogout"
        class="hidden sm:flex p-2 rounded hover:bg-secondary transition-colors"
        aria-label="Cerrar sesión"
      >
        <LogOut class="w-4 h-4 text-muted-foreground hover:text-foreground" />
      </button>
      <!-- Hamburger (solo móvil) -->
      <button
        type="button"
        @click="menuOpen = !menuOpen"
        class="sm:hidden p-2 rounded hover:bg-secondary transition-colors"
        :aria-label="menuOpen ? 'Cerrar menú' : 'Abrir menú'"
        :aria-expanded="menuOpen"
      >
        <X v-if="menuOpen" class="w-5 h-5 text-muted-foreground" />
        <Menu v-else class="w-5 h-5 text-muted-foreground" />
      </button>
    </div>

    <!-- Menú desplegable móvil -->
    <div
      v-if="menuOpen && auth.isAuthenticated"
      class="sm:hidden absolute top-full left-0 right-0 bg-white border-b border-border shadow-lg"
    >
      <!-- Info del usuario -->
      <div class="px-4 py-3 border-b border-border">
        <p class="text-sm font-semibold text-foreground">{{ auth.user?.full_name }}</p>
        <p class="text-xs text-muted-foreground capitalize">{{ auth.user?.role }}</p>
      </div>
      <!-- Links de navegación -->
      <div class="py-1">
        <router-link
          to="/analisis"
          class="flex items-center px-4 py-3 text-sm hover:bg-secondary transition-colors"
          :class="route.path === '/analisis' ? 'text-primary font-medium bg-accent' : 'text-foreground'"
          @click="closeMenu"
        >Análisis</router-link>
        <router-link
          to="/reportes"
          class="flex items-center px-4 py-3 text-sm hover:bg-secondary transition-colors"
          :class="route.path === '/reportes' ? 'text-primary font-medium bg-accent' : 'text-foreground'"
          @click="closeMenu"
        >Reportes</router-link>
        <router-link
          v-if="auth.isAdmin"
          to="/panel-ml"
          class="flex items-center px-4 py-3 text-sm hover:bg-secondary transition-colors"
          :class="route.path === '/panel-ml' ? 'text-primary font-medium bg-accent' : 'text-foreground'"
          @click="closeMenu"
        >Panel ML</router-link>
      </div>
      <!-- Cerrar sesión -->
      <div class="border-t border-border py-1">
        <button
          type="button"
          @click="onLogout"
          class="flex items-center gap-2 w-full px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors"
        >
          <LogOut class="w-4 h-4 text-muted-foreground" />
          Cerrar sesión
        </button>
      </div>
    </div>

  </nav>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Recycle, LogOut, Menu, X } from '@lucide/vue'
import { useAuthStore } from '@/domains/auth/stores/useAuthStore'
import { LogoutUseCase } from '@/domains/auth/use-cases/LogoutUseCase'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const menuOpen = ref(false)

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

function closeMenu() {
  menuOpen.value = false
}

async function onLogout() {
  await LogoutUseCase()
  router.push('/')
}
</script>
