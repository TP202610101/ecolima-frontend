<template>
  <div class="min-h-screen bg-background text-foreground flex flex-col">
    <SharedNavbar v-if="auth.isAuthenticated" />
    <router-view />
  </div>
</template>

<script setup lang="ts">
import SharedNavbar from '@/shared/components/Navbar.vue'
import { useAuthStore } from '@/domains/auth/stores/useAuthStore'

const auth = useAuthStore()
</script>
