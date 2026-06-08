<template>
  <nav class="bg-white border-b p-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <svg class="w-8 h-8 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 12l2-2 4 4 8-8 4 4"></path></svg>
      <span class="font-bold">EcoLima ML</span>
    </div>
    <div>
      <router-link to="/analisis" class="mr-4">Análisis</router-link>
      <router-link to="/reportes" class="mr-4">Reportes</router-link>
      <router-link to="/panel-ml" class="mr-4">Panel ML</router-link>
    </div>
  </nav>
</template>

<script setup lang="ts">
</script>
