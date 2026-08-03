<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import * as L from 'leaflet'
import { MapPin, Recycle, Navigation, Search, LogIn, Plus, Minus, RotateCcw, AlertCircle } from '@lucide/vue'
import { PublicRepository, type PublicPoint } from '../repositories/PublicRepository'

const LIMA_CENTER: [number, number] = [-12.0464, -77.0428]
// Bounding box holgado del área metropolitana de Lima.
const LIMA_LAT_MIN = -12.40
const LIMA_LAT_MAX = -11.55
const LIMA_LNG_MIN = -77.30
const LIMA_LNG_MAX = -76.55

const MATERIALS = ['papel', 'plástico', 'vidrio', 'metal', 'cartón'] as const
type Material = typeof MATERIALS[number]

const mapContainer = ref<HTMLElement>()
const loading = ref(false)
const error = ref<string | null>(null)
const geoError = ref(false)
const allPoints = ref<PublicPoint[]>([])
const selectedMaterials = ref<Material[]>([...MATERIALS])
const hasSearched = ref(false)

let map: L.Map | null = null
let pointsLayer: L.LayerGroup | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null

const filteredPoints = computed(() => {
  const allSelected = selectedMaterials.value.length === MATERIALS.length
  if (allSelected) return allPoints.value
  return allPoints.value.filter(p =>
    Array.isArray(p.materiales) && p.materiales.some(m => (selectedMaterials.value as string[]).includes(m))
  )
})

function isWithinLima(lat: number, lng: number): boolean {
  return lat >= LIMA_LAT_MIN && lat <= LIMA_LAT_MAX &&
         lng >= LIMA_LNG_MIN && lng <= LIMA_LNG_MAX
}

function renderPoints() {
  if (!pointsLayer) return
  pointsLayer.clearLayers()
  filteredPoints.value.forEach(p => {
    const dist = p.distancia < 1000
      ? `${Math.round(p.distancia)} m`
      : `${(p.distancia / 1000).toFixed(1)} km`
    const mats = Array.isArray(p.materiales) && p.materiales.length
      ? p.materiales.join(', ')
      : 'No especificado'
    L.circleMarker([p.lat, p.lng], {
      radius: 9,
      color: '#16a34a',
      fillColor: '#16a34a',
      fillOpacity: 0.8,
      weight: 2,
    })
      .bindPopup(
        `<div style="font-size:13px;min-width:180px">
          <strong style="font-size:14px;display:block;margin-bottom:2px">${p.nombre}</strong>
          <span style="color:#6b7280;font-size:12px">📍 ${dist} de distancia</span>
          <hr style="margin:6px 0;border-color:#e5e7eb">
          <span style="font-size:12px"><strong>Acepta:</strong> ${mats}</span>
        </div>`,
        { minWidth: 190 }
      )
      .addTo(pointsLayer!)
  })
}

watch(filteredPoints, renderPoints)

async function fetchPoints(lat: number, lng: number) {
  if (!isWithinLima(lat, lng)) {
    error.value = 'La ubicación está fuera del área de Lima. Mueve el mapa dentro de la ciudad.'
    return
  }
  error.value = null
  loading.value = true
  hasSearched.value = true
  try {
    allPoints.value = await PublicRepository.getNearby(lat, lng)
  } catch (e) {
    allPoints.value = []
    const msg = e instanceof Error ? e.message : ''
    error.value = msg === 'OUT_OF_RANGE'
      ? 'La ubicación está fuera del rango válido. Busca dentro de Lima.'
      : (msg || 'No se pudo cargar los puntos. Intenta de nuevo.')
  } finally {
    loading.value = false
  }
}

function useMyLocation() {
  if (!navigator.geolocation) {
    geoError.value = true
    return
  }
  navigator.geolocation.getCurrentPosition(
    pos => {
      geoError.value = false
      const { latitude: lat, longitude: longitude } = pos.coords
      map?.setView([lat, longitude], 15, { animate: true })
      fetchPoints(lat, longitude)
    },
    () => { geoError.value = true },
    { timeout: 10000 }
  )
}

function searchHere() {
  if (!map) return
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    const c = map!.getCenter()
    fetchPoints(c.lat, c.lng)
  }, 500)
}

function toggleMaterial(m: Material) {
  const idx = selectedMaterials.value.indexOf(m)
  if (idx === -1) {
    selectedMaterials.value = [...selectedMaterials.value, m]
  } else if (selectedMaterials.value.length > 1) {
    selectedMaterials.value = selectedMaterials.value.filter(x => x !== m)
  }
}

function zoomIn() { map?.zoomIn() }
function zoomOut() { map?.zoomOut() }
function resetView() { map?.setView(LIMA_CENTER, 13) }

onMounted(() => {
  if (!mapContainer.value) return
  map = L.map(mapContainer.value, {
    center: LIMA_CENTER,
    zoom: 13,
    zoomControl: false,
    attributionControl: true,
  })
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map)
  pointsLayer = L.layerGroup().addTo(map)
})

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
  map?.remove()
  map = null
  pointsLayer = null
})
</script>

<template>
  <div class="h-full flex flex-col">

    <!-- Cabecera pública -->
    <header class="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0">
          <Recycle class="w-5 h-5 text-white" />
        </div>
        <div>
          <span class="font-semibold text-gray-900 text-sm">EcoLima</span>
          <span class="hidden sm:inline text-gray-400 text-sm"> — Encuentra dónde reciclar</span>
        </div>
      </div>
      <router-link
        :to="{ name: 'login' }"
        class="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <LogIn class="w-4 h-4" />
        <span class="hidden sm:inline">Acceso municipal</span>
        <span class="sm:hidden">Ingresar</span>
      </router-link>
    </header>

    <!-- Área del mapa -->
    <div class="flex-1 relative overflow-hidden">
      <div ref="mapContainer" class="w-full h-full" />

      <!-- Alerta geolocalización denegada — encima de los filtros -->
      <div
        v-if="geoError"
        class="absolute top-3 left-3 right-14 z-[1000]"
      >
        <div class="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 shadow-sm">
          <AlertCircle class="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p class="text-xs text-amber-800">
            Geolocalización no disponible. Mueve el mapa y pulsa <strong>Buscar en esta zona</strong>.
          </p>
        </div>
      </div>

      <!-- Filtro por material -->
      <div
        class="absolute left-3 z-[1000] flex flex-wrap gap-1.5 max-w-[calc(100%-5rem)]"
        :class="geoError ? 'top-14' : 'top-3'"
      >
        <button
          v-for="m in MATERIALS"
          :key="m"
          @click="toggleMaterial(m)"
          :class="[
            'px-3 py-1 rounded-full text-xs font-medium border shadow-sm transition-colors',
            selectedMaterials.includes(m)
              ? 'bg-green-600 text-white border-green-600'
              : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400',
          ]"
        >
          {{ m.charAt(0).toUpperCase() + m.slice(1) }}
        </button>
      </div>

      <!-- Controles de zoom -->
      <div class="absolute right-3 top-3 z-[1000] flex items-center gap-1">
        <button
          @click="zoomIn"
          class="w-8 h-8 bg-white border border-gray-200 rounded-md shadow text-gray-700 hover:bg-gray-50 flex items-center justify-center transition-colors"
          aria-label="Acercar"
        >
          <Plus class="w-4 h-4" />
        </button>
        <button
          @click="zoomOut"
          class="w-8 h-8 bg-white border border-gray-200 rounded-md shadow text-gray-700 hover:bg-gray-50 flex items-center justify-center transition-colors"
          aria-label="Alejar"
        >
          <Minus class="w-4 h-4" />
        </button>
        <button
          @click="resetView"
          class="w-8 h-8 bg-white border border-gray-200 rounded-md shadow text-gray-700 hover:bg-gray-50 flex items-center justify-center transition-colors"
          aria-label="Restablecer vista"
        >
          <RotateCcw class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Alerta error API -->
      <div
        v-if="error"
        class="absolute z-[1000] left-3 right-14"
        :class="geoError ? 'top-[88px]' : 'top-3'"
      >
        <div class="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 shadow-sm">
          <AlertCircle class="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
          <p class="text-xs text-red-700">{{ error }}</p>
        </div>
      </div>

      <!-- Loading overlay -->
      <div
        v-if="loading"
        class="absolute inset-0 z-[999] bg-white/60 flex items-center justify-center"
      >
        <div class="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>

      <!-- Empty state -->
      <div
        v-else-if="hasSearched && !error && filteredPoints.length === 0"
        class="absolute bottom-40 left-1/2 -translate-x-1/2 z-[1000] w-80 max-w-[90vw]"
      >
        <div class="bg-white border border-gray-200 rounded-xl shadow-lg px-5 py-5 text-center">
          <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <MapPin class="w-5 h-5 text-gray-400" />
          </div>
          <p class="text-sm font-medium text-gray-800">
            Aún no hay puntos de reciclaje registrados en esta zona
          </p>
          <p class="text-xs text-gray-500 mt-1.5">
            Intenta mover el mapa o buscar en otra zona de Lima
          </p>
        </div>
      </div>

      <!-- Botones de acción -->
      <div class="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] flex flex-col items-center gap-2">
        <button
          @click="searchHere"
          :disabled="loading"
          class="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 rounded-full text-sm font-medium text-gray-700 shadow-md hover:shadow-lg hover:bg-gray-50 transition-all disabled:opacity-50"
        >
          <Search class="w-4 h-4" />
          Buscar en esta zona
        </button>
        <button
          @click="useMyLocation"
          :disabled="loading"
          class="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-full text-sm font-medium shadow-md hover:bg-green-700 transition-all disabled:opacity-50"
        >
          <Navigation class="w-4 h-4" />
          Usar mi ubicación
        </button>
      </div>

    </div>
  </div>
</template>
