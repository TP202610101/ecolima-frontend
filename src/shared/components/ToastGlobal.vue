<script setup lang="ts">
import { mensajeToast } from '@/shared/composables/useToast'
</script>

<template>
  <!-- La región viva queda siempre montada para que los lectores de pantalla anuncien cada aviso. -->
  <div
    role="status"
    class="print:hidden"
  >
    <div
      v-if="mensajeToast"
      class="fixed left-1/2 bottom-6 -translate-x-1/2 bg-gray-800 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg z-[2100]"
      data-prueba="toast"
    >
      {{ mensajeToast }}
    </div>
  </div>
</template>
