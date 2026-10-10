<script setup lang="ts">
import { onMounted } from 'vue'
import { X, ExternalLink, AlertTriangle } from '@lucide/vue'
import { useAnalisisV1Store } from '../stores/useAnalisisV1Store'

const store = useAnalisisV1Store()
const emit = defineEmits<{ cerrar: [] }>()

onMounted(() => store.cargarFuentes())
</script>

<template>
  <div
    class="fixed inset-0 z-[2000] bg-black/40 flex items-center justify-center p-4"
    @click.self="emit('cerrar')"
  >
    <div
      class="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col"
      role="dialog"
      aria-label="Fuentes y atribución"
    >
      <div class="px-5 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h2 class="text-base font-semibold">
            Fuentes y atribución
          </h2>
          <p class="text-xs text-muted-foreground">
            Paquete de resultados V{{ store.version?.paquete_version }} · licencia de los datos
            <a
              v-if="store.version?.atribucion.licencia_url"
              :href="store.version.atribucion.licencia_url"
              target="_blank"
              rel="noopener"
              class="underline"
            >{{ store.version?.atribucion.licencia }}</a>
            <span v-else>{{ store.version?.atribucion.licencia }}</span>
          </p>
        </div>
        <button
          class="p-1.5 rounded hover:bg-secondary"
          aria-label="Cerrar"
          @click="emit('cerrar')"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="px-5 py-3 bg-secondary text-xs text-foreground">
        {{ store.version?.atribucion.aviso }}
      </div>

      <div class="flex-1 overflow-y-auto px-5 py-3">
        <div
          v-if="store.loadingFuentes"
          class="py-8 flex justify-center"
        >
          <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
        <div
          v-else-if="store.errorFuentes"
          class="py-6 flex flex-col items-center gap-2 text-sm"
        >
          <AlertTriangle class="w-5 h-5 text-red-600" />
          {{ store.errorFuentes }}
        </div>
        <ul
          v-else
          class="divide-y divide-border"
        >
          <li
            v-for="f in store.fuentes"
            :key="f.codigo"
            class="py-3 text-xs space-y-1"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm font-medium text-foreground">
                  {{ f.nombre }}
                </p>
                <p class="text-muted-foreground">
                  {{ f.institucion }} · <span class="font-mono">{{ f.codigo }}</span> · uso en V1: {{ f.uso_en_v1 }}
                </p>
              </div>
              <a
                v-if="f.url_pagina || f.url_descarga"
                :href="(f.url_pagina || f.url_descarga)!"
                target="_blank"
                rel="noopener"
                class="flex-shrink-0 inline-flex items-center gap-1 text-primary hover:underline"
              >
                Fuente <ExternalLink class="w-3 h-3" />
              </a>
            </div>
            <p>
              <span class="font-medium">Licencia:</span>{{ ' ' }}
              <a
                v-if="f.licencia_url"
                :href="f.licencia_url"
                target="_blank"
                rel="noopener"
                class="underline"
              >{{ f.licencia }}</a>
              <span v-else>{{ f.licencia }}</span>
              <span class="text-muted-foreground"> ({{ f.licencia_estado.replace(/_/g, ' ') }}, revisada {{ f.licencia_verificada_en }})</span>
            </p>
            <p class="text-muted-foreground">
              <span class="font-medium text-foreground">Atribución:</span> {{ f.atribucion }}
            </p>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
