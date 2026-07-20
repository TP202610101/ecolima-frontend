<template>
  <div class="h-screen flex flex-col">
    <SharedNavbar v-if="auth.isAuthenticated && !route.meta.hideNavbar" />
    <main class="flex-1 overflow-auto">
      <router-view />
    </main>
    <DatasetUploader
      v-if="auth.isAuthenticated && datasetsStore.isUploaderOpen"
      @close="datasetsStore.closeUploader()"
    />
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import SharedNavbar from '@/shared/components/Navbar.vue'
import DatasetUploader from '@/domains/datasets/components/DatasetUploader.vue'
import { useAuthStore } from '@/domains/auth/stores/useAuthStore'
import { useDatasetsStore } from '@/domains/datasets/stores/useDatasetsStore'

const auth = useAuthStore()
const route = useRoute()
const datasetsStore = useDatasetsStore()
</script>
