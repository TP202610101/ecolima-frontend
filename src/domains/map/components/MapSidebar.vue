<script setup lang="ts">
import { ref, watch } from 'vue'
import { Filter, ChevronDown, ChevronUp, X } from '@lucide/vue'
import { useRecommendationsStore } from '@/domains/recommendations/stores/useRecommendationsStore'
import { useMapStore } from '../stores/useMapStore'
import ZoneCard from '@/domains/recommendations/components/ZoneCard.vue'
import type { Recommendation } from '@/domains/recommendations/entities/Recommendation'

const recStore = useRecommendationsStore()
const mapStore = useMapStore()

const ALL_PRIORITIES = ['Alta', 'Media', 'Baja']
const NSE_OPTIONS = ['A', 'B', 'C', 'D', 'E']

const localPriorities = ref<string[]>([...ALL_PRIORITIES])
const localDistrict = ref<string>('')
const showMoreFilters = ref(false)
const localNSE = ref<string[]>([...NSE_OPTIONS])

function applyNow() {
  recStore.setFilters(localPriorities.value, localDistrict.value || null, localNSE.value)
}

function togglePriority(p: string) {
  const idx = localPriorities.value.indexOf(p)
  if (idx === -1) {
    localPriorities.value.push(p)
  } else if (localPriorities.value.length > 1) {
    localPriorities.value.splice(idx, 1)
  }
  applyNow()
}

function toggleNSE(n: string) {
  const idx = localNSE.value.indexOf(n)
  if (idx === -1) {
    localNSE.value.push(n)
  } else if (localNSE.value.length > 1) {
    localNSE.value.splice(idx, 1)
  }
  applyNow()
}

let districtTimer: ReturnType<typeof setTimeout> | null = null
watch(localDistrict, val => {
  if (districtTimer) clearTimeout(districtTimer)
  districtTimer = setTimeout(() => {
    recStore.setFilters(localPriorities.value, val || null, localNSE.value)
  }, 300)
})

function clearFilters() {
  localPriorities.value = [...ALL_PRIORITIES]
  localDistrict.value = ''
  localNSE.value = [...NSE_OPTIONS]
  mapStore.showZones = true
  mapStore.showPoints = true
  recStore.setFilters([...ALL_PRIORITIES], null, [...NSE_OPTIONS])
}

function onZoneSelect(zone: Recommendation) {
  recStore.selectZone(zone)
}
</script>

<template>
  <aside class="w-full h-full border-r border-border overflow-y-auto bg-white flex flex-col">

    <!-- Header -->
    <div class="px-4 py-3 border-b border-border flex items-center gap-2 flex-shrink-0">
      <Filter class="w-4 h-4 text-muted-foreground" />
      <h2 class="text-sm font-semibold text-foreground">Filtros</h2>
    </div>

    <!-- Sección filtros -->
    <div class="px-4 py-3 border-b border-border flex-shrink-0 space-y-4">

      <!-- Distrito -->
      <div>
        <p class="text-xs font-medium text-muted-foreground mb-1.5">Distrito</p>
        <select
          v-model="localDistrict"
          class="w-full border border-border rounded-md px-2 py-1.5 text-sm text-foreground bg-white focus:outline-none focus:border-primary"
        >
          <option value="">Todos los distritos</option>
          <option
            v-for="d in mapStore.districts"
            :key="d.district_id"
            :value="d.district_name"
          >{{ d.district_name }}</option>
        </select>
      </div>

      <!-- Prioridad -->
      <div>
        <p class="text-xs font-medium text-muted-foreground mb-1.5">Prioridad</p>
        <div class="space-y-1.5">
          <label
            v-for="p in ALL_PRIORITIES"
            :key="p"
            class="flex items-center gap-2 cursor-pointer"
          >
            <input
              type="checkbox"
              :checked="localPriorities.includes(p)"
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

      <!-- Más filtros (NSE + Capas) -->
      <div>
        <button
          @click="showMoreFilters = !showMoreFilters"
          class="flex items-center gap-1 text-xs text-primary hover:underline transition-colors"
        >
          <component :is="showMoreFilters ? ChevronUp : ChevronDown" class="w-3.5 h-3.5" />
          Más filtros
        </button>

        <div v-if="showMoreFilters" class="mt-2.5 space-y-4">

          <!-- NSE -->
          <div>
            <p class="text-xs font-medium text-muted-foreground mb-1.5">NSE</p>
            <div class="flex gap-3">
              <label
                v-for="n in NSE_OPTIONS"
                :key="n"
                class="flex items-center gap-1 cursor-pointer"
              >
                <input
                  type="checkbox"
                  :checked="localNSE.includes(n)"
                  @change="toggleNSE(n)"
                  class="accent-primary"
                />
                <span class="text-sm text-foreground">{{ n }}</span>
              </label>
            </div>
          </div>

          <!-- Capas del mapa -->
          <div>
            <p class="text-xs font-medium text-muted-foreground mb-1.5">Capas del mapa</p>
            <div class="space-y-1.5">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" v-model="mapStore.showZones" class="accent-primary" />
                <span class="w-2 h-2 rounded-full flex-shrink-0 bg-green-600" />
                <span class="text-sm text-foreground">Zonas recomendadas</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" v-model="mapStore.showPoints" class="accent-primary" />
                <span class="w-2 h-2 rounded-full flex-shrink-0 bg-blue-500" />
                <span class="text-sm text-foreground">Puntos existentes</span>
              </label>
            </div>
          </div>

        </div>
      </div>

      <!-- Acción limpiar -->
      <div>
        <button
          @click="clearFilters"
          class="flex items-center gap-1.5 border border-border rounded px-3 py-1 text-sm text-foreground hover:bg-secondary transition-colors"
        >
          <X class="w-3.5 h-3.5" />
          Limpiar filtros
        </button>
      </div>
    </div>

    <!-- Contador -->
    <div class="px-4 py-2 border-b border-border flex-shrink-0">
      <p class="text-xs text-muted-foreground">
        Mostrando
        <span class="font-semibold text-foreground">{{ recStore.filteredRecommendations.length }}</span>
        zonas recomendadas
      </p>
    </div>

    <!-- Lista de zonas -->
    <div class="flex-1 overflow-y-auto">
      <div v-if="recStore.loading" class="space-y-2 p-3">
        <div v-for="i in 5" :key="i" class="h-16 bg-gray-100 rounded animate-pulse" />
      </div>
      <div
        v-else-if="!recStore.filteredRecommendations.length"
        class="flex flex-col items-center justify-center h-32 text-center p-4"
      >
        <p class="text-sm text-muted-foreground">No hay zonas con los filtros seleccionados</p>
      </div>
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
