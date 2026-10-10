<script setup lang="ts">
import { Info, X } from '@lucide/vue'
import { useExploracionV1Store } from '../stores/useExploracionV1Store'
import { fechaLarga } from '../utils/lecturaV1'

// Aviso superior (mismo lugar y estilo que el banner de datos de demostración del original).
// Aparece al abrir la página y se cierra con la X; al recargar vuelve a aparecer.
const store = useExploracionV1Store()
const emit = defineEmits<{ ayuda: [seccion: 'orden' | 'fuentes'] }>()
</script>

<template>
  <div
    v-if="!store.avisoCerrado"
    class="flex items-center gap-2 px-4 py-1.5 bg-amber-50 border-b border-amber-200 flex-shrink-0 print:hidden"
    role="note"
    data-prueba="aviso-v1"
  >
    <Info class="w-4 h-4 text-amber-600 flex-shrink-0" />
    <p class="flex-1 min-w-0 text-xs text-amber-800">
      <strong>Lugares para revisar, no ubicaciones aprobadas.</strong>
      Revisión preliminar con datos públicos{{ store.version ? ` (paquete de resultados ${store.version.paquete_version}, ${fechaLarga(store.version.fecha_paquete)})` : '' }}; falta comprobarlos en campo.
    </p>
    <button
      type="button"
      class="text-xs font-medium text-amber-800 underline underline-offset-2 whitespace-nowrap"
      @click="emit('ayuda', 'orden')"
    >
      Cómo se ordenan
    </button>
    <button
      type="button"
      class="ml-2 text-xs font-medium text-amber-800 underline underline-offset-2 whitespace-nowrap"
      @click="emit('ayuda', 'fuentes')"
    >
      Fuentes y limitaciones
    </button>
    <button
      type="button"
      class="ml-1 p-1 rounded text-amber-800 hover:bg-amber-200"
      aria-label="Cerrar aviso"
      title="Cerrar aviso"
      data-prueba="cerrar-aviso"
      @click="store.avisoCerrado = true"
    >
      <X class="w-3.5 h-3.5" />
    </button>
  </div>
</template>
