<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import * as maplibregl from 'maplibre-gl'
import type * as GeoJSON from 'geojson'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Plus, Minus, RotateCcw, AlertTriangle } from '@lucide/vue'
import { useAnalisisV1Store } from '../stores/useAnalisisV1Store'
import type { DistritosGeoJSON, SitiosGeoJSON } from '../entities/AnalisisV1'
import { categoriaMapa, COLOR_CATEGORIA, ETIQUETA_TAMIZAJE, formatoEntero } from '../utils/etiquetas'

const store = useAnalisisV1Store()
const emit = defineEmits<{ 'sitio-seleccionado': [sitioId: string] }>()

const contenedor = ref<HTMLElement>()
const sinMapaBase = ref(false)

const ESTILO_BASE = 'https://tiles.openfreemap.org/styles/liberty'
// Respaldo si el mapa base externo no responde (p. ej. sin internet): fondo liso + límites del paquete.
const ESTILO_SIN_FONDO: maplibregl.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: 'fondo', type: 'background', paint: { 'background-color': '#f1f5f9' } }],
}
const LIMA_CENTRO: [number, number] = [-77.0428, -12.0464]
const VACIO: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

let map: maplibregl.Map | null = null
let listo = false
let temporizador: ReturnType<typeof setTimeout> | null = null

function escapar(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c))
}

// MapLibre aplana las propiedades: se precalcula la categoría visual y el rango.
function sitiosParaMapa(geo: SitiosGeoJSON | null): GeoJSON.FeatureCollection {
  if (!geo) return VACIO
  return {
    type: 'FeatureCollection',
    features: geo.features.map(f => ({
      type: 'Feature',
      geometry: f.geometry,
      properties: {
        sitio_id: f.properties.sitio_id,
        distrito: f.properties.distrito,
        estado: f.properties.estado_tamizaje,
        cat: categoriaMapa(f.properties),
        rango: f.properties.mcda?.rango ?? -1,
      },
    })),
  }
}

function cajaDe(geoms: Array<GeoJSON.Geometry | null>): maplibregl.LngLatBounds | null {
  const caja = new maplibregl.LngLatBounds()
  let vacia = true
  const recorrer = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === 'number') {
      caja.extend(c as [number, number])
      vacia = false
    } else if (Array.isArray(c)) c.forEach(recorrer)
  }
  for (const g of geoms) if (g && 'coordinates' in g) recorrer(g.coordinates)
  return vacia ? null : caja
}

function encuadrar() {
  if (!map || !store.distritos) return
  const sel = store.distritoSeleccionado
  const caja = cajaDe(sel ? [sel.geometry] : store.distritos.features.map(f => f.geometry))
  if (caja) map.fitBounds(caja, { padding: 40, duration: 600, maxZoom: 15 })
}

function sincronizarDistritos(d: DistritosGeoJSON | null) {
  if (!map || !listo) return
  ;(map.getSource('distritos') as maplibregl.GeoJSONSource | undefined)
    ?.setData((d ?? VACIO) as GeoJSON.FeatureCollection)
}

function sincronizarSitios() {
  if (!map || !listo) return
  ;(map.getSource('sitios') as maplibregl.GeoJSONSource | undefined)?.setData(sitiosParaMapa(store.sitiosGeo))
}

function sincronizarSeleccion() {
  if (!map || !listo) return
  map.setFilter('sitio-seleccionado', ['==', ['get', 'sitio_id'], store.seleccionadoId ?? ''])
  map.setFilter('distrito-seleccionado', ['==', ['get', 'ubigeo'], store.filtros.ubigeo ?? ''])
}

function agregarCapas() {
  if (!map || map.getSource('sitios')) return
  listo = true

  map.addSource('distritos', { type: 'geojson', data: (store.distritos ?? VACIO) as GeoJSON.FeatureCollection })
  map.addLayer({
    id: 'distritos-relleno', type: 'fill', source: 'distritos',
    paint: { 'fill-color': '#16a34a', 'fill-opacity': 0.06 },
  })
  map.addLayer({
    id: 'distritos-borde', type: 'line', source: 'distritos',
    paint: { 'line-color': '#1e293b', 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 1.2, 14, 2.5], 'line-opacity': 0.85 },
  })
  map.addLayer({
    id: 'distrito-seleccionado', type: 'line', source: 'distritos',
    filter: ['==', ['get', 'ubigeo'], ''],
    paint: { 'line-color': '#15803d', 'line-width': 3 },
  })

  map.addSource('sitios', { type: 'geojson', data: sitiosParaMapa(store.sitiosGeo) })
  map.addLayer({
    id: 'sitios', type: 'circle', source: 'sitios',
    layout: {
      // Orden de dibujo: candidatos abajo, puntos existentes arriba.
      'circle-sort-key': ['match', ['get', 'cat'], 'existente', 3, 'top_k', 2, 'excluido', 1, 0],
    },
    paint: {
      'circle-color': ['match', ['get', 'cat'],
        'existente', COLOR_CATEGORIA.existente,
        'top_k', COLOR_CATEGORIA.top_k,
        'excluido', COLOR_CATEGORIA.excluido,
        COLOR_CATEGORIA.candidato],
      'circle-radius': ['interpolate', ['linear'], ['zoom'],
        10, ['match', ['get', 'cat'], 'candidato', 2.5, 4.5],
        15, ['match', ['get', 'cat'], 'candidato', 6, 9]],
      'circle-stroke-width': ['match', ['get', 'cat'], 'candidato', 0.5, 1.5],
      'circle-stroke-color': '#ffffff',
      'circle-opacity': ['match', ['get', 'cat'], 'candidato', 0.75, 0.95],
    },
  })
  map.addLayer({
    id: 'sitio-seleccionado', type: 'circle', source: 'sitios',
    filter: ['==', ['get', 'sitio_id'], ''],
    paint: {
      'circle-radius': 13, 'circle-color': 'rgba(0,0,0,0)',
      'circle-stroke-width': 3, 'circle-stroke-color': '#111827',
    },
  })

  const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10 })
  map.on('mouseenter', 'sitios', e => {
    if (!map) return
    map.getCanvas().style.cursor = 'pointer'
    const f = e.features?.[0]
    if (!f) return
    const p = f.properties as { sitio_id: string; distrito: string; estado: keyof typeof ETIQUETA_TAMIZAJE; rango: number }
    const rango = p.rango > 0 ? `Rango MCDA ${formatoEntero(p.rango)}` : 'Sin MCDA'
    popup
      .setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number])
      .setHTML(`<div style="font-size:12px"><strong>${escapar(p.distrito)}</strong><br>${escapar(ETIQUETA_TAMIZAJE[p.estado] ?? p.estado)} · ${rango}</div>`)
      .addTo(map)
  })
  map.on('mouseleave', 'sitios', () => {
    if (!map) return
    map.getCanvas().style.cursor = ''
    popup.remove()
  })
  map.on('click', 'sitios', e => {
    const id = e.features?.[0]?.properties?.sitio_id
    if (typeof id === 'string') emit('sitio-seleccionado', id)
  })

  sincronizarSeleccion()
  encuadrar()
}

watch(() => store.distritos, d => { sincronizarDistritos(d); encuadrar() })
watch(() => store.sitiosGeo, sincronizarSitios)
watch(() => store.seleccionadoId, sincronizarSeleccion)
watch(() => store.filtros.ubigeo, () => { sincronizarSeleccion(); encuadrar() })

function volarA(lon: number, lat: number) {
  map?.flyTo({ center: [lon, lat], zoom: Math.max(15, map.getZoom()) })
}

function redimensionar() { map?.resize() }

onMounted(() => {
  if (!contenedor.value) return
  map = new maplibregl.Map({
    container: contenedor.value,
    style: ESTILO_BASE,
    center: LIMA_CENTRO,
    zoom: 10,
    attributionControl: { compact: true, customAttribution: 'Resultados EcoLima V1 · datos ODbL 1.0' },
  })
  map.on('load', agregarCapas)
  // Si el mapa base no carga a tiempo, se usa el fondo liso para no dejar la vista vacía.
  temporizador = setTimeout(() => {
    if (map && !listo) {
      sinMapaBase.value = true
      map.setStyle(ESTILO_SIN_FONDO)
      map.once('styledata', agregarCapas)
    }
  }, 10000)
})

onUnmounted(() => {
  if (temporizador) clearTimeout(temporizador)
  map?.remove()
  map = null
  listo = false
})

defineExpose({ volarA, redimensionar })
</script>

<template>
  <div class="relative w-full h-full overflow-hidden">
    <div
      ref="contenedor"
      class="w-full h-full"
    />

    <div class="absolute right-3 top-3 z-10 flex flex-col gap-1">
      <button
        class="w-8 h-8 bg-white border border-border rounded-md shadow flex items-center justify-center hover:bg-secondary"
        aria-label="Acercar"
        @click="map?.zoomIn()"
      >
        <Plus class="w-4 h-4" />
      </button>
      <button
        class="w-8 h-8 bg-white border border-border rounded-md shadow flex items-center justify-center hover:bg-secondary"
        aria-label="Alejar"
        @click="map?.zoomOut()"
      >
        <Minus class="w-4 h-4" />
      </button>
      <button
        class="w-8 h-8 bg-white border border-border rounded-md shadow flex items-center justify-center hover:bg-secondary"
        aria-label="Encuadrar"
        @click="encuadrar"
      >
        <RotateCcw class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- Leyenda: categorías del paquete V1, no una escala de prioridad Alta/Media/Baja -->
    <div class="absolute left-3 bottom-3 z-10 bg-white/95 border border-border rounded-lg shadow p-3 max-w-[260px]">
      <h4 class="text-xs font-semibold text-foreground mb-2">
        Leyenda
      </h4>
      <ul class="space-y-1.5 text-xs text-foreground">
        <li class="flex items-start gap-2">
          <span
            class="mt-0.5 w-3 h-3 rounded-full flex-shrink-0 border border-white"
            :style="{ background: COLOR_CATEGORIA.top_k }"
          />
          <span>Candidato en el top-{{ store.mcda?.top_k ?? 'k' }} MCDA <span class="text-muted-foreground">(prioridad de análisis, no aprobado)</span></span>
        </li>
        <li class="flex items-start gap-2">
          <span
            class="mt-0.5 w-3 h-3 rounded-full flex-shrink-0"
            :style="{ background: COLOR_CATEGORIA.candidato }"
          />
          <span>Otro candidato que pasa el tamizaje</span>
        </li>
        <li class="flex items-start gap-2">
          <span
            class="mt-0.5 w-3 h-3 rounded-full flex-shrink-0 border border-white"
            :style="{ background: COLOR_CATEGORIA.excluido }"
          />
          <span>Excluido en el tamizaje</span>
        </li>
        <li class="flex items-start gap-2">
          <span
            class="mt-0.5 w-3 h-3 rounded-full flex-shrink-0 border border-white"
            :style="{ background: COLOR_CATEGORIA.existente }"
          />
          <span>Punto de reciclaje existente registrado</span>
        </li>
      </ul>
      <p
        v-if="sinMapaBase"
        class="mt-2 text-[11px] text-amber-700"
      >
        Mapa base no disponible; se muestran solo los límites distritales.
      </p>
    </div>

    <div
      v-if="store.loadingMapa"
      class="absolute inset-0 z-20 bg-white/60 flex items-center justify-center"
    >
      <div class="flex flex-col items-center gap-2">
        <div class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p class="text-sm text-muted-foreground">
          Cargando sitios…
        </p>
      </div>
    </div>
    <div
      v-else-if="store.errorMapa"
      class="absolute inset-0 z-20 bg-white/90 flex items-center justify-center"
    >
      <div class="flex flex-col items-center gap-3 text-center p-6 max-w-xs">
        <AlertTriangle class="w-6 h-6 text-red-600" />
        <p class="text-sm text-foreground">
          {{ store.errorMapa }}
        </p>
        <button
          class="px-4 py-2 bg-primary text-white text-sm rounded-md hover:bg-primary-hover"
          @click="store.cargarMapa()"
        >
          Reintentar
        </button>
      </div>
    </div>
    <div
      v-else-if="store.sitiosGeo && store.totalMapa === 0"
      class="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-white border border-border rounded-md shadow px-3 py-2 text-sm text-muted-foreground"
    >
      Ningún sitio cumple los filtros seleccionados.
    </div>
  </div>
</template>
