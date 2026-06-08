<template>
  <div class="min-h-screen bg-background text-foreground">
    <SharedNavbar />
    <main class="p-4">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import SharedNavbar from '@/shared/components/Navbar.vue'
</script>
