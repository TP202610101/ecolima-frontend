<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MapPin, Recycle, Navigation, Search, LogIn, Plus, Minus, RotateCcw, AlertCircle } from '@lucide/vue'
import { PublicRepository, type PublicPoint } from '../repositories/PublicRepository'

// MapLibre usa orden [lng, lat] (inverso a Leaflet)
const LIMA_CENTER: [number, number] = [-77.0428, -12.0464]
const LIMA_LAT_MIN = -12.40
const LIMA_LAT_MAX = -11.55
const LIMA_LNG_MIN = -77.30
const LIMA_LNG_MAX = -76.55

const MATERIALS = ['papel', 'plástico', 'vidrio', 'metal', 'cartón'] as const
type Material = typeof MATERIALS[number]

const MATERIAL_ACTIVE_CLASS: Record<string, string> = {
  'papel':    'bg-blue-500    border-blue-500    text-white',
  'plástico': 'bg-yellow-500  border-yellow-500  text-gray-900',
  'vidrio':   'bg-emerald-500 border-emerald-500 text-white',
  'metal':    'bg-zinc-500    border-zinc-500    text-white',
  'cartón':   'bg-orange-500  border-orange-500  text-white',
}

const mapContainer = ref<HTMLElement>()
const loading = ref(false)
const error = ref<string | null>(null)
const geoError = ref(false)
const allPoints = ref<PublicPoint[]>([])
const selectedMaterials = ref<Material[]>([...MATERIALS])
const hasSearched = ref(false)

let map: maplibregl.Map | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let mapStyleLoaded = false

const filteredPoints = computed(() => {
  const allSelected = selectedMaterials.value.length === MATERIALS.length
  if (allSelected) return allPoints.value
  return allPoints.value.filter(p =>
    Array.isArray(p.materiales) && p.materiales.some(m =>
      (selectedMaterials.value as string[]).includes(m.toLowerCase())
    )
  )
})

function isWithinLima(lat: number, lng: number): boolean {
  return lat >= LIMA_LAT_MIN && lat <= LIMA_LAT_MAX &&
         lng >= LIMA_LNG_MIN && lng <= LIMA_LNG_MAX
}

function buildGeoJSON(points: PublicPoint[]) {
  return {
    type: 'FeatureCollection' as const,
    features: points.map(p => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] as [number, number] },
      properties: {
        nombre: p.nombre,
        distancia: p.distancia,
        materiales: JSON.stringify(p.materiales ?? []),
      },
    })),
  }
}

function syncPoints() {
  if (!map || !mapStyleLoaded) return
  const src = map.getSource('recycling') as maplibregl.GeoJSONSource | undefined
  src?.setData(buildGeoJSON(filteredPoints.value))
}

watch(filteredPoints, syncPoints)

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
      const { latitude: lat, longitude: lng } = pos.coords
      map?.flyTo({ center: [lng, lat], zoom: 15 })
      fetchPoints(lat, lng)
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
function resetView() { map?.flyTo({ center: LIMA_CENTER, zoom: 13 }) }

onMounted(() => {
  if (!mapContainer.value) return

  map = new maplibregl.Map({
    container: mapContainer.value,
    style: 'https://tiles.openfreemap.org/styles/liberty',
    center: LIMA_CENTER,
    zoom: 13,
  })

  map.on('load', () => {
    mapStyleLoaded = true

    map!.addSource('recycling', {
      type: 'geojson',
      data: buildGeoJSON(filteredPoints.value),
    })

    map!.addLayer({
      id: 'recycling-circles',
      type: 'circle',
      source: 'recycling',
      paint: {
        'circle-radius': 9,
        'circle-color': '#16a34a',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.85,
      },
    })

    map!.on('click', 'recycling-circles', e => {
      const f = e.features?.[0]
      if (!f) return
      const coords = (f.geometry as { type: 'Point'; coordinates: [number, number] }).coordinates
      const p = f.properties ?? {}
      const mats: string[] = JSON.parse((p['materiales'] as string | null) ?? '[]')
      const matsStr = mats.length ? mats.join(', ') : 'No especificado'
      const rawDist = p['distancia'] as number | null
      const dist = rawDist === null
        ? 'distancia no disponible'
        : rawDist < 1000
          ? `${Math.round(rawDist)} m`
          : `${(rawDist / 1000).toFixed(1)} km`

      new maplibregl.Popup({ maxWidth: '260px', offset: 12 })
        .setLngLat(coords)
        .setHTML(`<div style="font-size:13px;min-width:160px">
          <strong style="font-size:14px;display:block;margin-bottom:2px">${p['nombre'] as string}</strong>
          <span style="color:#6b7280;font-size:12px">📍 ${dist} de distancia</span>
          <hr style="margin:6px 0;border-color:#e5e7eb">
          <span style="font-size:12px"><strong>Acepta:</strong> ${matsStr}</span>
        </div>`)
        .addTo(map!)
    })

    map!.on('mouseenter', 'recycling-circles', () => {
      map!.getCanvas().style.cursor = 'pointer'
    })
    map!.on('mouseleave', 'recycling-circles', () => {
      map!.getCanvas().style.cursor = ''
    })
  })
})

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
  map?.remove()
  map = null
  mapStyleLoaded = false
})
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Cabecera pública -->
    <header class="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200 flex-shrink-0">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-9 h-9 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0">
          <Recycle class="w-5 h-5 text-white" />
        </div>
        <div class="min-w-0">
          <span class="text-base font-bold text-gray-900 tracking-tight">EcoLima</span>
          <span class="hidden sm:inline text-base font-bold text-gray-900 tracking-tight"> — </span>
          <span class="hidden sm:inline text-sm font-normal text-gray-500">Encuentra dónde reciclar</span>
          <p class="sm:hidden text-xs text-gray-400 leading-tight mt-0.5">
            Encuentra dónde reciclar
          </p>
        </div>
      </div>
      <router-link
        :to="{ name: 'login' }"
        class="flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
      >
        <LogIn class="w-4 h-4" />
        <span class="hidden sm:inline">Acceso municipal</span>
        <span class="sm:hidden">Ingresar</span>
      </router-link>
    </header>

    <!-- Área del mapa -->
    <div class="flex-1 relative overflow-hidden">
      <div
        ref="mapContainer"
        class="w-full h-full"
      />

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
        class="absolute left-3 z-[1000] w-[calc(100%-8rem)]"
        :class="geoError ? 'top-14' : 'top-3'"
      >
        <div class="chip-scroll flex gap-1.5 overflow-x-auto pb-0.5">
          <button
            v-for="m in MATERIALS"
            :key="m"
            :class="[
              'flex-shrink-0 whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium border shadow-sm transition-colors',
              selectedMaterials.includes(m)
                ? MATERIAL_ACTIVE_CLASS[m]
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400',
            ]"
            @click="toggleMaterial(m)"
          >
            {{ m.charAt(0).toUpperCase() + m.slice(1) }}
          </button>
        </div>
      </div>

      <!-- Controles de zoom -->
      <div class="absolute right-3 top-3 z-[1000] flex items-center gap-1">
        <button
          class="w-8 h-8 bg-white border border-gray-200 rounded-md shadow text-gray-700 hover:bg-gray-50 flex items-center justify-center transition-colors"
          aria-label="Acercar"
          @click="zoomIn"
        >
          <Plus class="w-4 h-4" />
        </button>
        <button
          class="w-8 h-8 bg-white border border-gray-200 rounded-md shadow text-gray-700 hover:bg-gray-50 flex items-center justify-center transition-colors"
          aria-label="Alejar"
          @click="zoomOut"
        >
          <Minus class="w-4 h-4" />
        </button>
        <button
          class="w-8 h-8 bg-white border border-gray-200 rounded-md shadow text-gray-700 hover:bg-gray-50 flex items-center justify-center transition-colors"
          aria-label="Restablecer vista"
          @click="resetView"
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
          <p class="text-xs text-red-700">
            {{ error }}
          </p>
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
      <div class="absolute bottom-20 sm:bottom-8 left-1/2 -translate-x-1/2 z-[1000] flex flex-col items-center gap-2">
        <button
          :disabled="loading"
          class="flex items-center gap-2 px-5 py-3 bg-white border border-gray-300 rounded-full text-sm font-medium text-gray-700 shadow-md hover:shadow-lg hover:bg-gray-50 transition-all disabled:opacity-50"
          @click="searchHere"
        >
          <Search class="w-4 h-4" />
          Buscar en esta zona
        </button>
        <button
          :disabled="loading"
          class="flex items-center gap-2 px-5 py-3 bg-green-600 text-white rounded-full text-sm font-medium shadow-md hover:bg-green-700 transition-all disabled:opacity-50"
          @click="useMyLocation"
        >
          <Navigation class="w-4 h-4" />
          Usar mi ubicación
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chip-scroll {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.chip-scroll::-webkit-scrollbar {
  display: none;
}
</style>
