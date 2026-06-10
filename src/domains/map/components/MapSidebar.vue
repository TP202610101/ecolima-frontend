<script setup lang="ts">
import { computed } from 'vue'
import { SlidersHorizontal } from '@lucide/vue'
import { useRecommendationsStore } from '@/domains/recommendations/stores/useRecommendationsStore'
import { useMapStore } from '../stores/useMapStore'
import ZoneCard from '@/domains/recommendations/components/ZoneCard.vue'
import type { Recommendation } from '@/domains/recommendations/entities/Recommendation'

const recStore = useRecommendationsStore()
const mapStore = useMapStore()

const ALL_PRIORITIES = ['Alta', 'Media', 'Baja']

function togglePriority(p: string) {
  const current = [...recStore.selectedPriorities]
  const idx = current.indexOf(p)
  if (idx === -1) current.push(p)
  else current.splice(idx, 1)
  recStore.setFilters(current.length ? current : ALL_PRIORITIES)
}

function clearFilters() {
  recStore.setFilters([...ALL_PRIORITIES])
}

function onZoneSelect(zone: Recommendation) {
  recStore.selectZone(zone)
}
</script>

<template>
  <aside class="w-72 border-r border-border overflow-y-auto bg-white flex flex-col">
    <!-- Header -->
    <div class="px-4 py-3 border-b border-border flex items-center gap-2 flex-shrink-0">
      <SlidersHorizontal class="w-4 h-4 text-muted-foreground" />
      <h2 class="text-sm font-semibold text-foreground">Filtros</h2>
    </div>

    <!-- Filtros -->
    <div class="px-4 py-3 border-b border-border flex-shrink-0 space-y-3">
      <!-- Prioridad -->
      <div>
        <p class="text-xs font-medium text-muted-foreground mb-2">Prioridad</p>
        <div class="space-y-1">
          <label
            v-for="p in ALL_PRIORITIES"
            :key="p"
            class="flex items-center gap-2 cursor-pointer"
          >
            <input
              type="checkbox"
              :checked="recStore.selectedPriorities.includes(p)"
              @change="togglePriority(p)"
              class="accent-primary"
            />
            <span
              class="w-2 h-2 rounded-full flex-shrink-0"
              :class="p === 'Alta' ? 'bg-green-600' : p === 'Media' ? 'bg-yellow-500' : 'bg-gray-400'"
            />
            <span class="text-sm text-foreground">{{ p }}</span>
          </label>
        </div>
      </div>

      <!-- Distrito -->
      <div v-if="mapStore.districts.length">
        <p class="text-xs font-medium text-muted-foreground mb-1">Distrito</p>
        <select class="w-full border border-border rounded-md px-2 py-1.5 text-sm text-foreground bg-white focus:outline-none focus:border-primary">
          <option value="">Todos los distritos</option>
          <option
            v-for="d in mapStore.districts"
            :key="d.district_id"
            :value="d.district_id"
          >{{ d.district_name }}</option>
        </select>
      </div>

      <!-- Acciones -->
      <div class="flex gap-2">
        <button
          class="flex-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover transition-colors"
        >
          Aplicar filtros
        </button>
        <button
          @click="clearFilters"
          class="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Limpiar
        </button>
      </div>
    </div>

    <!-- Contador -->
    <div class="px-4 py-2 border-b border-border flex-shrink-0">
      <p class="text-xs text-muted-foreground">
        Mostrando
        <span class="font-semibold text-foreground">{{ recStore.filteredRecommendations.length }}</span>
        zonas
      </p>
    </div>

    <!-- Lista -->
    <div class="flex-1 overflow-y-auto">
      <!-- Loading -->
      <div v-if="recStore.loading" class="space-y-2 p-3">
        <div v-for="i in 5" :key="i" class="h-16 bg-gray-100 rounded animate-pulse" />
      </div>

      <!-- Empty -->
      <div
        v-else-if="!recStore.filteredRecommendations.length"
        class="flex flex-col items-center justify-center h-32 text-center p-4"
      >
        <p class="text-sm text-muted-foreground">No hay zonas con los filtros seleccionados</p>
      </div>

      <!-- Lista de zonas -->
      <template v-else>
        <ZoneCard
          v-for="zone in recStore.filteredRecommendations"
          :key="zone.zone_id"
          :zone="zone"
          :is-selected="recStore.selectedZone?.zone_id === zone.zone_id"
          @select="onZoneSelect"
        />
      </template>
    </div>
  </aside>
</template>
