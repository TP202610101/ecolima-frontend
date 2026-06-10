<script setup lang="ts">
import { onMounted } from 'vue'
import MapSidebar from '../components/MapSidebar.vue'
import MapView from '../components/MapView.vue'
import ZoneDetailPanel from '../components/ZoneDetailPanel.vue'
import { useRecommendationsStore } from '@/domains/recommendations/stores/useRecommendationsStore'
import { useMapStore } from '../stores/useMapStore'
import type { Recommendation } from '@/domains/recommendations/entities/Recommendation'

const recStore = useRecommendationsStore()
const mapStore = useMapStore()

function onZoneSelected(zone: Recommendation) {
  recStore.selectZone(zone)
}

onMounted(() => {
  recStore.fetchRecommendations()
  mapStore.fetchPoints()
  mapStore.fetchDistricts()
})
</script>

<template>
  <div class="flex h-[calc(100vh-56px)]">
    <MapSidebar />
    <MapView class="flex-1" @zone-selected="onZoneSelected" />
    <ZoneDetailPanel />
  </div>
</template>
