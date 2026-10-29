<script setup lang="ts">
import { Info } from '@lucide/vue'
import { useExploracionV1Store } from '../stores/useExploracionV1Store'
import { nombreDistrito } from '../utils/lecturaV1'

// Distritos sin lugares evaluados en el paquete (Punta Hermosa, San Bartolo y Santa María del Mar en V1.0.0):
// se pueden elegir, pero no hay orden de revisión que mostrar.
const emit = defineEmits<{ fuentes: [] }>()
const store = useExploracionV1Store()
</script>

<template>
  <div
    class="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 flex gap-2"
    role="status"
    data-prueba="aviso-sin-lugares"
  >
    <Info class="w-4 h-4 mt-0.5 flex-shrink-0" />
    <div>
      <p class="font-semibold">
        {{ nombreDistrito(store.ambito) }} no tiene lugares evaluados en la versión {{ store.version?.paquete_version ?? 'V1' }}.
      </p>
      <p class="mt-1">
        La lista de lugares del paquete (paraderos, mercados, centros comerciales y parques) no incluye ninguno en este distrito,
        así que no hay un orden de revisión que mostrar.{{ store.existentesAmbito.length ? '' : ' Tampoco hay puntos de reciclaje registrados en él.' }}
        <button
          type="button"
          class="inline-flex items-center min-h-10 lg:min-h-0 text-primary underline underline-offset-2"
          data-prueba="ir-fuentes"
          @click="emit('fuentes')"
        >
          Ver Fuentes y limitaciones
        </button>
      </p>
    </div>
  </div>
</template>
