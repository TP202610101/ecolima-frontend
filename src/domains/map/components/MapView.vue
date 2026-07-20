<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import * as L from 'leaflet'
import { Plus, Minus, RotateCcw, AlertTriangle } from '@lucide/vue'
import type { Recommendation } from '@/domains/recommendations/entities/Recommendation'
import type { RecyclingPoint } from '../entities/RecyclingPoint'
import { useRecommendationsStore } from '@/domains/recommendations/stores/useRecommendationsStore'
import { useMapStore } from '../stores/useMapStore'

const recStore = useRecommendationsStore()
const mapStore = useMapStore()

const emit = defineEmits<{ 'zone-selected': [zone: Recommendation] }>()

const mapContainer = ref<HTMLElement>()
const LIMA_CENTER: [number, number] = [-12.0464, -77.0428]

let map: L.Map | null = null
let zonesLayer: L.LayerGroup | null = null
let pointsLayer: L.LayerGroup | null = null

function getZoneColor(zone: Recommendation): string {
  if (zone.priority_label === 'Alta') return '#16a34a'
  if (zone.priority_label === 'Media') return '#eab308'
  return '#9ca3af'
}

function renderZones(zones: Recommendation[]) {
  if (!zonesLayer) return
  zonesLayer.clearLayers()
  zones.forEach(zone => {
    const color = getZoneColor(zone)
    L.circleMarker([zone.centroid_lat, zone.centroid_lon], {
      radius: 8,
      color,
      fillColor: color,
      fillOpacity: 0.75,
      weight: 2
    })
      .bindTooltip(
        `<div style="font-size:12px"><strong>Zona ${zone.zone_id} — ${zone.district_name}</strong><br>Prioridad ${zone.priority_label}</div>`,
        { sticky: true }
      )
      .on('click', () => emit('zone-selected', zone))
      .addTo(zonesLayer!)
  })
}

function renderPoints(points: RecyclingPoint[]) {
  if (!pointsLayer) return
  pointsLayer.clearLayers()
  points.forEach(point => {
    L.circleMarker([point.geometry.coordinates[1], point.geometry.coordinates[0]], {
      radius: 8,
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillOpacity: 0.8,
      weight: 1.5
    })
      .bindTooltip(`<span style="font-size:12px">${point.address || 'Punto de reciclaje'}</span>`, { sticky: true })
      .addTo(pointsLayer!)
  })
}

function zoomIn() { map?.zoomIn() }
function zoomOut() { map?.zoomOut() }
function resetView() { map?.setView(LIMA_CENTER, 12) }
function flyTo(lat: number, lon: number) { map?.flyTo([lat, lon], 15) }
function invalidateSize() { map?.invalidateSize() }

watch(() => recStore.filteredRecommendations, zones => renderZones(zones), { deep: true })
watch(() => mapStore.points, points => renderPoints(points), { deep: true })
watch(() => recStore.selectedZone, zone => { if (zone) flyTo(zone.centroid_lat, zone.centroid_lon) })

watch(() => mapStore.showZones, show => {
  if (!map || !zonesLayer) return
  show ? map.addLayer(zonesLayer) : map.removeLayer(zonesLayer)
})
watch(() => mapStore.showPoints, show => {
  if (!map || !pointsLayer) return
  show ? map.addLayer(pointsLayer) : map.removeLayer(pointsLayer)
})

onMounted(() => {
  if (!mapContainer.value) return

  map = L.map(mapContainer.value, {
    center: LIMA_CENTER,
    zoom: 12,
    zoomControl: false,
    attributionControl: true
  })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map)

  zonesLayer = L.layerGroup().addTo(map)
  pointsLayer = L.layerGroup().addTo(map)

  renderZones(recStore.filteredRecommendations)
  renderPoints(mapStore.points)
})

onUnmounted(() => {
  map?.remove()
  map = null
  zonesLayer = null
  pointsLayer = null
})

defineExpose({ flyTo, invalidateSize })
</script>

<template>
  <div class="flex-1 relative overflow-hidden">
    <div ref="mapContainer" class="w-full h-full" />

    <!-- Controles de zoom -->
    <div class="absolute right-3 top-3 z-[1000] flex flex-col gap-1">
      <button
        @click="zoomIn"
        class="w-8 h-8 bg-white border border-border rounded-md shadow text-foreground hover:bg-secondary flex items-center justify-center transition-colors"
        aria-label="Acercar"
      >
        <Plus class="w-4 h-4" />
      </button>
      <button
        @click="zoomOut"
        class="w-8 h-8 bg-white border border-border rounded-md shadow text-foreground hover:bg-secondary flex items-center justify-center transition-colors"
        aria-label="Alejar"
      >
        <Minus class="w-4 h-4" />
      </button>
      <button
        @click="resetView"
        class="w-8 h-8 bg-white border border-border rounded-md shadow text-foreground hover:bg-secondary flex items-center justify-center transition-colors"
        aria-label="Restablecer vista"
      >
        <RotateCcw class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- Leyenda -->
    <div class="absolute bottom-6 right-3 z-[1000] bg-white border border-border rounded-lg shadow p-3">
      <h4 class="text-xs font-semibold text-foreground mb-2">Leyenda</h4>
      <div class="space-y-1.5">
        <div class="flex items-center gap-2 text-xs text-foreground">
          <span class="w-3 h-3 rounded-full bg-green-600 flex-shrink-0" />
          Alta prioridad (≥85%)
        </div>
        <div class="flex items-center gap-2 text-xs text-foreground">
          <span class="w-3 h-3 rounded-full bg-yellow-500 flex-shrink-0" />
          Media (70–84%)
        </div>
        <div class="flex items-center gap-2 text-xs text-foreground">
          <span class="w-3 h-3 rounded-full bg-gray-400 flex-shrink-0" />
          Baja (&lt;70%)
        </div>
        <div class="flex items-center gap-2 text-xs text-foreground pt-1.5 border-t border-border">
          <span class="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
          Punto existente
        </div>
      </div>
    </div>

    <!-- Loading overlay -->
    <div
      v-if="recStore.loading || mapStore.loadingPoints"
      class="absolute inset-0 z-[999] bg-white/70 flex items-center justify-center"
    >
      <div class="flex flex-col items-center gap-2">
        <div class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p class="text-sm text-muted-foreground">Cargando datos…</p>
      </div>
    </div>

    <!-- Error overlay -->
    <div
      v-else-if="recStore.error || mapStore.error"
      class="absolute inset-0 z-[999] bg-white/90 flex items-center justify-center"
    >
      <div class="flex flex-col items-center gap-3 text-center p-6 max-w-xs">
        <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
          <AlertTriangle class="w-5 h-5 text-red-600" />
        </div>
        <p class="text-sm font-medium text-foreground">{{ recStore.error || mapStore.error }}</p>
        <button
          @click="recStore.fetchRecommendations(); mapStore.fetchPoints()"
          class="px-4 py-2 bg-primary text-white text-sm rounded-md hover:bg-primary-hover transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>
  </div>
</template>
