<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import * as maplibregl from 'maplibre-gl'
import type * as GeoJSON from 'geojson'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Plus, Minus, RotateCcw, AlertTriangle, Ruler } from '@lucide/vue'
import type { Recommendation } from '@/domains/recommendations/entities/Recommendation'
import type { RecyclingPoint } from '../entities/RecyclingPoint'
import { useRecommendationsStore } from '@/domains/recommendations/stores/useRecommendationsStore'
import { useMapStore } from '../stores/useMapStore'

const recStore = useRecommendationsStore()
const mapStore = useMapStore()

const emit = defineEmits<{ 'zone-selected': [zone: Recommendation] }>()

const mapContainer = ref<HTMLElement>()
const LIMA_CENTER: [number, number] = [-77.0428, -12.0464]

let map: maplibregl.Map | null = null
let mapStyleLoaded = false

const measuring = ref(false)
let measurePoints: Array<[number, number]> = []
let measureMarkers: maplibregl.Marker[] = []
let measureLabelMarker: maplibregl.Marker | null = null

// --- GeoJSON builders ---

function buildZonesGeoJSON(zones: Recommendation[]) {
  return {
    type: 'FeatureCollection' as const,
    features: zones.map(z => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [z.centroid_lon, z.centroid_lat] as [number, number] },
      properties: {
        zone_id: z.zone_id,
        district_name: z.district_name,
        priority_label: z.priority_label,
      },
    })),
  }
}

function buildPointsGeoJSON(points: RecyclingPoint[]) {
  return {
    type: 'FeatureCollection' as const,
    features: points.map(p => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [p.geometry.coordinates[0], p.geometry.coordinates[1]] as [number, number],
      },
      properties: {
        address: p.address ?? 'Punto de reciclaje',
        point_type: p.point_type ?? '',
        materials_accepted: p.materials_accepted ?? 'No especificado',
        verified: p.verified,
      },
    })),
  }
}

// --- Haversine (reemplaza L.LatLng.distanceTo(); a y b son [lng, lat]) ---

function haversineMeters(a: [number, number], b: [number, number]): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b[1] - a[1])
  const dLon = toRad(b[0] - a[0])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// --- Heatmap builder (misma fórmula que Leaflet: hsl((1-t)*120, 80%, 45%)) ---

function buildHeatmapGeoJSON(pts: Array<[number, number, number]>) {
  const values = pts.map(p => p[2])
  const min = values.length ? Math.min(...values) : 0
  const max = values.length ? Math.max(...values) : 1
  const range = max - min || 1
  return {
    type: 'FeatureCollection' as const,
    features: pts.map(([lat, lon, val]) => {
      const t = (val - min) / range
      const hue = Math.round((1 - t) * 120)
      return {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [lon, lat] as [number, number] },
        properties: { color: `hsl(${hue}, 80%, 45%)` },
      }
    }),
  }
}

// --- Sync ---

function syncZones() {
  if (!map || !mapStyleLoaded) return
  ;(map.getSource('zones') as maplibregl.GeoJSONSource | undefined)
    ?.setData(buildZonesGeoJSON(recStore.filteredRecommendations))
}

function syncPoints() {
  if (!map || !mapStyleLoaded) return
  ;(map.getSource('points') as maplibregl.GeoJSONSource | undefined)
    ?.setData(buildPointsGeoJSON(mapStore.points))
}

function addHeatmapLayer(pts: Array<[number, number, number]>) {
  if (!map) return
  map.addSource('heatmap', { type: 'geojson', data: buildHeatmapGeoJSON(pts) })
  // beforeId inserta la capa debajo de zonas y puntos (equivalente a heatmapPane zIndex 350)
  map.addLayer({
    id: 'heatmap-circles',
    type: 'circle',
    source: 'heatmap',
    paint: {
      'circle-radius': 14,
      'circle-color': ['get', 'color'],
      'circle-opacity': 0.6,
      'circle-stroke-width': 0,
    },
  }, 'zones-circles')
}

function removeHeatmapLayer() {
  if (!map) return
  if (map.getLayer('heatmap-circles')) map.removeLayer('heatmap-circles')
  if (map.getSource('heatmap')) map.removeSource('heatmap')
}

// --- Measure tool ---

function addMeasureDot(lngLat: [number, number]) {
  const el = document.createElement('div')
  el.style.cssText = 'width:14px;height:14px;border-radius:50%;background:#7c3aed;box-shadow:0 0 0 2px white,0 0 0 3px #7c3aed;'
  measureMarkers.push(new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(lngLat).addTo(map!))
}

function clearMeasureVisuals() {
  measureMarkers.forEach(m => m.remove())
  measureMarkers = []
  measureLabelMarker?.remove()
  measureLabelMarker = null
  if (map) {
    ;(map.getSource('measure-line') as maplibregl.GeoJSONSource | undefined)
      ?.setData({ type: 'FeatureCollection', features: [] })
  }
}

function onMapClick(e: maplibregl.MapMouseEvent) {
  if (!measuring.value) return
  const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat]

  if (measurePoints.length === 0) {
    clearMeasureVisuals()
    measurePoints.push(lngLat)
    addMeasureDot(lngLat)
  } else {
    const [a] = measurePoints
    const b = lngLat
    const distMeters = haversineMeters(a, b)
    const distLabel = distMeters >= 1000
      ? `${(distMeters / 1000).toFixed(2)} km`
      : `${Math.round(distMeters)} m`

    ;(map!.getSource('measure-line') as maplibregl.GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: [a, b] }, properties: {} }],
    })
    addMeasureDot(b)

    const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
    const labelEl = document.createElement('div')
    labelEl.style.cssText = 'display:inline-block;background:white;border:1.5px solid #7c3aed;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:600;color:#7c3aed;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.15);transform:translate(-50%,-50%)'
    labelEl.textContent = distLabel
    measureLabelMarker = new maplibregl.Marker({ element: labelEl, anchor: 'center' }).setLngLat(mid).addTo(map!)

    measurePoints = []
  }
}

watch(() => recStore.filteredRecommendations, syncZones, { deep: true })
watch(() => mapStore.points, syncPoints, { deep: true })
watch(() => recStore.selectedZone, zone => { if (zone) flyTo(zone.centroid_lat, zone.centroid_lon) })

watch(() => mapStore.showZones, show => {
  if (!map || !mapStyleLoaded) return
  map.setLayoutProperty('zones-circles', 'visibility', show ? 'visible' : 'none')
})
watch(() => mapStore.showPoints, show => {
  if (!map || !mapStyleLoaded) return
  map.setLayoutProperty('points-circles', 'visibility', show ? 'visible' : 'none')
})

watch(() => mapStore.showHeatmap, show => {
  if (!map || !mapStyleLoaded) return
  if (show) {
    addHeatmapLayer(mapStore.heatmapPoints)
  } else {
    removeHeatmapLayer()
  }
})

watch(() => mapStore.heatmapPoints, pts => {
  if (!map || !mapStyleLoaded || !mapStore.showHeatmap) return
  const src = map.getSource('heatmap') as maplibregl.GeoJSONSource | undefined
  if (src) {
    src.setData(buildHeatmapGeoJSON(pts))
  } else {
    addHeatmapLayer(pts)
  }
}, { deep: true })

// --- Controls (mismas firmas que antes para compatibilidad con AnalysisView) ---

function zoomIn() { map?.zoomIn() }
function zoomOut() { map?.zoomOut() }
function resetView() { map?.flyTo({ center: LIMA_CENTER, zoom: 12 }) }

function flyTo(lat: number, lon: number) {
  if (!map) return
  const targetZoom = Math.max(15, map.getZoom())
  map.flyTo({ center: [lon, lat], zoom: targetZoom })
}

function invalidateSize() { map?.resize() }

function toggleMeasure() {
  measuring.value = !measuring.value
  clearMeasureVisuals()
  measurePoints = []
  if (!map) return
  map.getCanvas().style.cursor = measuring.value ? 'crosshair' : ''
}

// --- Lifecycle ---

onMounted(() => {
  if (!mapContainer.value) return

  map = new maplibregl.Map({
    container: mapContainer.value,
    style: 'https://tiles.openfreemap.org/styles/liberty',
    center: LIMA_CENTER,
    zoom: 12,
  })

  map.on('load', () => {
    mapStyleLoaded = true

    map!.addSource('zones', {
      type: 'geojson',
      data: buildZonesGeoJSON(recStore.filteredRecommendations),
    })
    map!.addSource('points', {
      type: 'geojson',
      data: buildPointsGeoJSON(mapStore.points),
    })

    map!.addLayer({
      id: 'zones-circles',
      type: 'circle',
      source: 'zones',
      layout: { visibility: mapStore.showZones ? 'visible' : 'none' },
      paint: {
        'circle-radius': 8,
        'circle-color': [
          'match', ['get', 'priority_label'],
          'Alta', '#16a34a',
          'Media', '#eab308',
          '#9ca3af',
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.75,
      },
    })

    map!.addLayer({
      id: 'points-circles',
      type: 'circle',
      source: 'points',
      layout: { visibility: mapStore.showPoints ? 'visible' : 'none' },
      paint: {
        'circle-radius': 8,
        'circle-color': '#3b82f6',
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.8,
      },
    })

    // Línea de medición — fuente siempre presente, empieza vacía
    map!.addSource('measure-line', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })
    map!.addLayer({
      id: 'measure-line-layer',
      type: 'line',
      source: 'measure-line',
      paint: {
        'line-color': '#7c3aed',
        'line-width': 3,
        'line-dasharray': [2, 1.5],
      },
    })

    // Popup compartido para tooltips hover
    const hoverPopup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 10,
    })

    // Tooltip zonas — desactivado durante medición para no cambiar el cursor
    map!.on('mouseenter', 'zones-circles', e => {
      if (measuring.value) return
      map!.getCanvas().style.cursor = 'pointer'
      const f = e.features?.[0]
      if (!f) return
      const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number]
      const p = f.properties ?? {}
      hoverPopup
        .setLngLat(coords)
        .setHTML(`<div style="font-size:12px"><strong>Zona ${p['zone_id'] as number} — ${p['district_name'] as string}</strong><br>Prioridad ${p['priority_label'] as string}</div>`)
        .addTo(map!)
    })
    map!.on('mouseleave', 'zones-circles', () => {
      if (measuring.value) return
      map!.getCanvas().style.cursor = ''
      hoverPopup.remove()
    })

    // Tooltip puntos — desactivado durante medición
    map!.on('mouseenter', 'points-circles', e => {
      if (measuring.value) return
      map!.getCanvas().style.cursor = 'pointer'
      const f = e.features?.[0]
      if (!f) return
      const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number]
      const p = f.properties ?? {}
      hoverPopup
        .setLngLat(coords)
        .setHTML(`<span style="font-size:12px">${p['address'] as string}</span>`)
        .addTo(map!)
    })
    map!.on('mouseleave', 'points-circles', () => {
      if (measuring.value) return
      map!.getCanvas().style.cursor = ''
      hoverPopup.remove()
    })

    // Click zona — guard: si medición activa, el clic va a onMapClick
    map!.on('click', 'zones-circles', e => {
      if (measuring.value) return
      const f = e.features?.[0]
      if (!f) return
      const zoneId = Number((f.properties ?? {})['zone_id'])
      const zone = recStore.filteredRecommendations.find(z => z.zone_id === zoneId)
      if (zone) emit('zone-selected', zone)
    })

    // Click punto — guard: si medición activa, el clic va a onMapClick
    map!.on('click', 'points-circles', e => {
      if (measuring.value) return
      const f = e.features?.[0]
      if (!f) return
      const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number]
      const p = f.properties ?? {}
      const mats = p['materials_accepted'] as string
      new maplibregl.Popup({ minWidth: '200px' })
        .setLngLat(coords)
        .setHTML(`<div style="font-size:13px;min-width:190px">
          <strong style="font-size:14px;display:block;margin-bottom:4px">${p['address'] as string}</strong>
          ${p['point_type'] ? `<span style="color:#6b7280;font-size:12px;display:block;margin-bottom:4px">Tipo: ${p['point_type'] as string}</span>` : ''}
          <hr style="margin:6px 0;border-color:#e5e7eb">
          <span style="font-size:12px"><strong>Acepta:</strong> ${mats}</span>
          ${p['verified'] ? '<br><span style="color:#16a34a;font-size:11px;margin-top:4px;display:inline-block">✓ Verificado</span>' : ''}
        </div>`)
        .addTo(map!)
    })

    // Handler global de clic para medición — solo actúa si measuring.value es true
    map!.on('click', onMapClick)

    // Fix: restaurar heatmap si el store lo tenía activo al remontar el componente
    if (mapStore.showHeatmap) {
      if (mapStore.heatmapPoints.length > 0) {
        addHeatmapLayer(mapStore.heatmapPoints)
      } else {
        mapStore.fetchHeatmap()
      }
    }
  })
})

onUnmounted(() => {
  measureMarkers.forEach(m => m.remove())
  measureLabelMarker?.remove()
  measurePoints = []
  removeHeatmapLayer()
  map?.remove()
  map = null
  mapStyleLoaded = false
})

defineExpose({ flyTo, invalidateSize })
</script>

<template>
  <div class="flex-1 relative overflow-hidden">
    <div
      ref="mapContainer"
      class="w-full h-full"
    />

    <!-- Controles de zoom + medición -->
    <div class="absolute right-3 top-3 z-[1000] flex flex-col gap-1">
      <button
        class="w-8 h-8 bg-white border border-border rounded-md shadow text-foreground hover:bg-secondary flex items-center justify-center transition-colors"
        aria-label="Acercar"
        @click="zoomIn"
      >
        <Plus class="w-4 h-4" />
      </button>
      <button
        class="w-8 h-8 bg-white border border-border rounded-md shadow text-foreground hover:bg-secondary flex items-center justify-center transition-colors"
        aria-label="Alejar"
        @click="zoomOut"
      >
        <Minus class="w-4 h-4" />
      </button>
      <button
        class="w-8 h-8 bg-white border border-border rounded-md shadow text-foreground hover:bg-secondary flex items-center justify-center transition-colors"
        aria-label="Restablecer vista"
        @click="resetView"
      >
        <RotateCcw class="w-3.5 h-3.5" />
      </button>
      <!-- Separador -->
      <div class="h-px bg-border mx-1 my-0.5" />
      <button
        :class="[
          'w-8 h-8 border rounded-md shadow flex items-center justify-center transition-colors',
          measuring
            ? 'bg-violet-600 border-violet-600 text-white hover:bg-violet-700'
            : 'bg-white border-border text-foreground hover:bg-secondary',
        ]"
        :title="measuring ? 'Desactivar medición (activo: haz clic en dos puntos)' : 'Medir distancia entre dos puntos'"
        aria-label="Medir distancia"
        @click="toggleMeasure"
      >
        <Ruler class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- Leyenda -->
    <div class="absolute bottom-6 right-3 z-[1000] bg-white border border-border rounded-lg shadow p-3">
      <h4 class="text-xs font-semibold text-foreground mb-2">
        Leyenda
      </h4>
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
        <template v-if="mapStore.showHeatmap">
          <div class="pt-1.5 border-t border-border">
            <p class="text-xs font-semibold text-foreground mb-1">
              Calor —
              {{ mapStore.heatmapMetric === 'density' ? 'Densidad' : mapStore.heatmapMetric === 'priority' ? 'Prioridad ML' : 'Brecha' }}
            </p>
            <div class="flex items-center gap-1.5">
              <span class="text-xs text-muted-foreground">Bajo</span>
              <div
                class="flex-1 h-2 rounded-sm"
                style="background: linear-gradient(to right, #16a34a, #eab308, #dc2626)"
              />
              <span class="text-xs text-muted-foreground">Alto</span>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Loading overlay -->
    <div
      v-if="recStore.loading || mapStore.loadingPoints || mapStore.loadingHeatmap"
      class="absolute inset-0 z-[999] bg-white/70 flex items-center justify-center"
    >
      <div class="flex flex-col items-center gap-2">
        <div class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p class="text-sm text-muted-foreground">
          Cargando datos…
        </p>
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
        <p class="text-sm font-medium text-foreground">
          {{ recStore.error || mapStore.error }}
        </p>
        <button
          class="px-4 py-2 bg-primary text-white text-sm rounded-md hover:bg-primary-hover transition-colors"
          @click="recStore.fetchRecommendations(); mapStore.fetchPoints()"
        >
          Reintentar
        </button>
      </div>
    </div>
  </div>
</template>
