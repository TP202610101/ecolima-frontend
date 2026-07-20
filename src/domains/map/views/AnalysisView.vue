<script setup lang="ts">
import { onMounted, ref, watch, nextTick } from 'vue'
import { Filter, MapPin, Info } from '@lucide/vue'
import MapSidebar from '../components/MapSidebar.vue'
import MapView from '../components/MapView.vue'
import ZoneDetailPanel from '../components/ZoneDetailPanel.vue'
import { useRecommendationsStore } from '@/domains/recommendations/stores/useRecommendationsStore'
import { useMapStore } from '../stores/useMapStore'
import type { Recommendation } from '@/domains/recommendations/entities/Recommendation'

const recStore = useRecommendationsStore()
const mapStore = useMapStore()

type Tab = 'filtros' | 'mapa' | 'detalle'
const activeTab = ref<Tab>('mapa')
const mapViewRef = ref<InstanceType<typeof MapView>>()

function onZoneSelected(zone: Recommendation) {
  recStore.selectZone(zone)
  activeTab.value = 'detalle'
}

watch(activeTab, async tab => {
  if (tab === 'mapa') {
    await nextTick()
    mapViewRef.value?.invalidateSize()
  }
})

// Al seleccionar zona desde la lista del sidebar, cambiar al tab de detalle en móvil
watch(() => recStore.selectedZone, zone => {
  if (zone) activeTab.value = 'detalle'
})

onMounted(() => {
  recStore.fetchRecommendations()
  mapStore.fetchPoints()
  mapStore.fetchDistricts()
})
</script>

<template>
  <div class="flex flex-col h-[calc(100vh-56px)]">

    <!-- Tab bar (solo móvil) -->
    <nav class="lg:hidden flex border-b border-border bg-white flex-shrink-0">
      <button
        @click="activeTab = 'filtros'"
        :class="['flex-1 py-2.5 flex flex-col items-center gap-0.5 text-xs font-medium transition-colors',
          activeTab === 'filtros' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground']"
      >
        <Filter class="w-4 h-4" />
        Filtros
      </button>
      <button
        @click="activeTab = 'mapa'"
        :class="['flex-1 py-2.5 flex flex-col items-center gap-0.5 text-xs font-medium transition-colors',
          activeTab === 'mapa' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground']"
      >
        <MapPin class="w-4 h-4" />
        Mapa
      </button>
      <button
        @click="activeTab = 'detalle'"
        :class="['flex-1 py-2.5 flex flex-col items-center gap-0.5 text-xs font-medium transition-colors',
          activeTab === 'detalle' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground']"
      >
        <Info class="w-4 h-4" />
        Detalle
      </button>
    </nav>

    <!-- Columnas -->
    <div class="flex flex-1 overflow-hidden">

      <!-- Sidebar filtros -->
      <div
        class="lg:w-72 lg:flex-shrink-0 h-full overflow-hidden"
        :class="activeTab === 'filtros' ? 'flex-1' : 'hidden lg:block'"
      >
        <MapSidebar />
      </div>

      <!-- Mapa -->
      <div
        class="flex-1 min-w-0 h-full"
        :class="activeTab === 'mapa' ? 'flex' : 'hidden lg:flex'"
      >
        <MapView ref="mapViewRef" class="flex-1" @zone-selected="onZoneSelected" />
      </div>

      <!-- Panel detalle -->
      <div
        class="lg:w-96 lg:flex-shrink-0 h-full overflow-hidden"
        :class="activeTab === 'detalle' ? 'flex-1' : 'hidden lg:block'"
      >
        <ZoneDetailPanel />
      </div>

    </div>
  </div>
</template>
