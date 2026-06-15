<template>
  <div class="h-screen flex flex-col">
    <SharedNavbar v-if="auth.isAuthenticated && route.path !== '/'" />
    <main class="flex-1 overflow-auto">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import SharedNavbar from '@/shared/components/Navbar.vue'
import { useAuthStore } from '@/domains/auth/stores/useAuthStore'

const auth = useAuthStore()
const route = useRoute()
</script>
