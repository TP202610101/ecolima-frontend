<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight, AlertTriangle } from '@lucide/vue'
import { useAnalisisV1Store, TAMANO_PAGINA } from '../stores/useAnalisisV1Store'
import type { SitioResumen } from '../entities/AnalisisV1'
import {
  ETIQUETA_CLASE,
  ETIQUETA_TAMIZAJE,
  formatoDecimal,
  formatoEntero,
  formatoPercentil,
  textoSinMcda,
} from '../utils/etiquetas'

const store = useAnalisisV1Store()
const emit = defineEmits<{ 'sitio-seleccionado': [sitio: SitioResumen] }>()

const items = computed(() => store.pagina?.items ?? [])
const desde = computed(() => (store.totalTabla === 0 ? 0 : store.offset + 1))
const hasta = computed(() => Math.min(store.offset + TAMANO_PAGINA, store.totalTabla))
const hayAnterior = computed(() => store.offset > 0)
const haySiguiente = computed(() => store.offset + TAMANO_PAGINA < store.totalTabla)

const CLASE_ESTADO: Record<string, string> = {
  apto_tamizaje: 'bg-emerald-50 text-emerald-800',
  excluido_tamizaje: 'bg-orange-50 text-orange-800',
  punto_existente: 'bg-blue-50 text-blue-800',
}
</script>

<template>
  <div class="flex flex-col h-full min-h-0 bg-white">
    <div class="px-4 py-3 border-b border-border">
      <h2 class="text-sm font-semibold text-foreground">
        Priorización MCDA
      </h2>
      <p class="text-xs text-muted-foreground">
        Ordenado por rango MCDA (pesos iguales). Los sitios sin MCDA aparecen al final.
      </p>
    </div>

    <div
      v-if="store.errorTabla"
      class="p-4 flex flex-col items-center gap-2 text-center"
    >
      <AlertTriangle class="w-5 h-5 text-red-600" />
      <p class="text-sm">
        {{ store.errorTabla }}
      </p>
      <button
        class="px-3 py-1.5 bg-primary text-white text-xs rounded-md"
        @click="store.cargarTabla(store.offset)"
      >
        Reintentar
      </button>
    </div>

    <div
      v-else
      class="flex-1 min-h-0 overflow-auto relative"
    >
      <table class="w-full text-xs">
        <thead class="sticky top-0 bg-secondary text-muted-foreground z-10">
          <tr>
            <th class="text-left font-medium px-3 py-2">
              Rango
            </th>
            <th class="text-left font-medium px-2 py-2">
              Distrito · clase
            </th>
            <th class="text-right font-medium px-2 py-2">
              Puntaje
            </th>
            <th class="text-right font-medium px-3 py-2">
              Propensión
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="s in items"
            :key="s.sitio_id"
            :class="['border-b border-border cursor-pointer hover:bg-accent',
                     store.seleccionadoId === s.sitio_id ? 'bg-accent' : '']"
            :data-sitio="s.sitio_id"
            @click="emit('sitio-seleccionado', s)"
          >
            <td class="px-3 py-2 align-top whitespace-nowrap">
              <template v-if="s.mcda">
                <span class="font-semibold text-foreground">{{ formatoEntero(s.mcda.rango) }}</span>
                <span
                  v-if="s.mcda.en_top_k"
                  class="ml-1 inline-block px-1.5 rounded bg-green-700 text-white text-[10px]"
                >top-{{ store.mcda?.top_k ?? 'k' }}</span>
              </template>
              <span
                v-else
                class="text-muted-foreground"
              >—</span>
            </td>
            <td class="px-2 py-2 align-top">
              <p class="font-medium text-foreground">
                {{ s.distrito }}
              </p>
              <p class="text-muted-foreground">
                {{ ETIQUETA_CLASE[s.clase_oportunidad] ?? s.clase_oportunidad }}
              </p>
              <span :class="['inline-block mt-0.5 px-1.5 rounded text-[10px]', CLASE_ESTADO[s.estado_tamizaje]]">
                {{ ETIQUETA_TAMIZAJE[s.estado_tamizaje] }}
              </span>
            </td>
            <td class="px-2 py-2 align-top text-right whitespace-nowrap">
              <span
                v-if="s.mcda"
                class="font-mono"
              >{{ formatoDecimal(s.mcda.puntaje, 3) }}</span>
              <span
                v-else
                class="text-muted-foreground italic"
              >{{ textoSinMcda(s.estado_tamizaje) }}</span>
            </td>
            <td
              class="px-3 py-2 align-top text-right text-muted-foreground whitespace-nowrap"
              title="Percentil de propensión ML (contexto; no es probabilidad de éxito)"
            >
              {{ formatoPercentil(s.propension_percentil) }}
            </td>
          </tr>
          <tr v-if="!store.loadingTabla && store.pagina && items.length === 0">
            <td
              colspan="4"
              class="px-4 py-6 text-center text-muted-foreground"
            >
              Ningún sitio cumple los filtros seleccionados.
            </td>
          </tr>
        </tbody>
      </table>
      <div
        v-if="store.loadingTabla"
        class="absolute inset-0 bg-white/60 flex items-center justify-center"
      >
        <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    </div>

    <div class="px-4 py-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
      <span>{{ formatoEntero(desde) }}–{{ formatoEntero(hasta) }} de {{ formatoEntero(store.totalTabla) }} sitios</span>
      <div class="flex gap-1">
        <button
          class="p-1 rounded border border-border disabled:opacity-40 hover:bg-secondary"
          :disabled="!hayAnterior || store.loadingTabla"
          aria-label="Página anterior"
          @click="store.cargarTabla(Math.max(0, store.offset - TAMANO_PAGINA))"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>
        <button
          class="p-1 rounded border border-border disabled:opacity-40 hover:bg-secondary"
          :disabled="!haySiguiente || store.loadingTabla"
          aria-label="Página siguiente"
          @click="store.cargarTabla(store.offset + TAMANO_PAGINA)"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>
