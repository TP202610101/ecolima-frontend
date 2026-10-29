<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RefreshCw } from '@lucide/vue'
import { useMLStore } from '../stores/useMLStore'
import PanelModelo from '../components/PanelModelo.vue'
import PanelDatos from '../components/PanelDatos.vue'

// Panel ML (solo admin). «Modelo»: lectura del paquete de resultados importado (/api/v1/analisis/*).
// «Datos»: carga y depuración de datasets de puntos de reciclaje (/api/v1/datasets).
const mlStore = useMLStore()
type Pestana = 'modelo' | 'datos'
const pestana = ref<Pestana>('modelo')
const PESTANAS: Array<{ k: Pestana; nombre: string }> = [
  { k: 'modelo', nombre: 'Modelo' },
  { k: 'datos', nombre: 'Datos' },
]

onMounted(() => mlStore.fetchPanel())
</script>

<template>
  <div class="flex-1 overflow-auto bg-gray-50">
    <div class="max-w-7xl mx-auto p-4 sm:p-8 space-y-6">
      <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <div class="flex-1">
          <h1 class="text-2xl font-bold text-foreground">
            Panel ML
          </h1>
          <p class="text-sm text-muted-foreground mt-1">
            Modelo vigente del paquete de resultados y datasets de puntos de reciclaje
          </p>
        </div>
        <button
          v-if="pestana === 'modelo'"
          :disabled="mlStore.loading"
          class="flex items-center justify-center gap-2 w-full sm:w-auto min-h-10 px-4 py-2 border border-border text-sm font-medium rounded-md hover:bg-secondary transition-colors disabled:opacity-60"
          @click="mlStore.fetchPanel()"
        >
          <RefreshCw
            class="w-4 h-4"
            :class="{ 'animate-spin': mlStore.loading }"
          />
          Actualizar
        </button>
      </div>

      <div
        class="flex gap-1 border-b border-border overflow-x-auto overflow-y-hidden"
        role="tablist"
        aria-label="Secciones del Panel ML"
      >
        <button
          v-for="p in PESTANAS"
          :key="p.k"
          type="button"
          role="tab"
          :aria-selected="pestana === p.k"
          :data-pestana="p.k"
          class="flex-shrink-0 min-h-11 px-4 py-2 text-sm -mb-px border-b-2 transition-colors"
          :class="pestana === p.k ? 'border-primary text-primary font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'"
          @click="pestana = p.k"
        >
          {{ p.nombre }}
        </button>
      </div>

      <PanelModelo v-if="pestana === 'modelo'" />
      <PanelDatos v-else />
    </div>
  </div>
</template>
