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
    class="flex items-start lg:items-center gap-2 pl-4 pr-1 lg:pr-4 py-1 lg:py-1.5 bg-amber-50 border-b border-amber-200 flex-shrink-0 print:hidden"
    role="note"
    data-prueba="aviso-v1"
  >
    <Info class="w-4 h-4 mt-2.5 lg:mt-0 text-amber-600 flex-shrink-0" />
    <!-- Móvil y tableta: texto a ancho completo y enlaces en una segunda fila; escritorio: una sola fila. -->
    <div class="flex-1 min-w-0 flex flex-col lg:flex-row lg:items-center gap-x-2">
      <p class="flex-1 min-w-0 pt-2 lg:pt-0 text-xs text-amber-800">
        <strong>Lugares para revisar, no ubicaciones aprobadas.</strong>
        Revisión preliminar con datos públicos{{ store.version ? ` (paquete de resultados ${store.version.paquete_version}, ${fechaLarga(store.version.fecha_paquete)})` : '' }}; falta comprobarlos en campo.
      </p>
      <div class="flex flex-wrap gap-x-4 lg:gap-x-2">
        <button
          type="button"
          class="min-h-10 lg:min-h-0 text-xs font-medium text-amber-800 underline underline-offset-2 whitespace-nowrap"
          @click="emit('ayuda', 'orden')"
        >
          Cómo se ordenan
        </button>
        <button
          type="button"
          class="min-h-10 lg:min-h-0 text-xs font-medium text-amber-800 underline underline-offset-2 whitespace-nowrap"
          @click="emit('ayuda', 'fuentes')"
        >
          Fuentes y limitaciones
        </button>
      </div>
    </div>
    <button
      type="button"
      class="w-10 h-10 lg:w-auto lg:h-auto lg:ml-1 lg:p-1 flex items-center justify-center flex-shrink-0 rounded text-amber-800 hover:bg-amber-200"
      aria-label="Cerrar aviso"
      title="Cerrar aviso"
      data-prueba="cerrar-aviso"
      @click="store.avisoCerrado = true"
    >
      <X class="w-3.5 h-3.5" />
    </button>
  </div>
</template>
