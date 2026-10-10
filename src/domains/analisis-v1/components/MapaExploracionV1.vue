<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import * as maplibregl from 'maplibre-gl'
import type * as GeoJSON from 'geojson'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Plus, Minus, RotateCcw } from '@lucide/vue'
import { useExploracionV1Store } from '../stores/useExploracionV1Store'
import {
  PROVINCIA, CLASE_LARGA, T, fmtEntero, nombreDistrito, nombreExistente, numeroDe, ord, type Lugar,
} from '../utils/lecturaV1'

// Mapa central de Análisis V1: lugares de la selección (mismos filtros que la lista), puntos existentes
// como capa aparte, números de la página visible de la lista y el lugar elegido con su radio de 500 m
// y una línea al punto registrado más cercano.
const store = useExploracionV1Store()
const contenedor = ref<HTMLElement>()
const sinMapaBase = ref(false)
const leyendaPlegada = ref(false)

const ESTILO_BASE = 'https://tiles.openfreemap.org/styles/liberty'
const ESTILO_SIN_FONDO: maplibregl.StyleSpecification = {
  version: 8, sources: {}, layers: [{ id: 'fondo', type: 'background', paint: { 'background-color': '#eef0ee' } }],
}
const VACIO: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }
let map: maplibregl.Map | null = null
let listo = false
let temporizador: ReturnType<typeof setTimeout> | null = null
let marcadores: maplibregl.Marker[] = []

const enLima = computed(() => store.ambito === PROVINCIA)

function esc(s: string) { return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c)) }

const fc = (features: GeoJSON.Feature[]): GeoJSON.FeatureCollection => ({ type: 'FeatureCollection', features })
const punto = (l: Lugar, props: Record<string, unknown>): GeoJSON.Feature => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [l.lon, l.lat] }, properties: { id: l.id, ...props } })

function datosLugares() { return fc(store.seleccion.map(l => punto(l, { grupo: l.grupo }))) }
function datosExistentes() { return store.capaExistentes ? fc(store.existentes.map(l => punto(l, { grupo: 'exist' }))) : VACIO }
function datosDistritos() {
  return fc((store.distritos?.features ?? []).map(f => ({
    type: 'Feature', geometry: f.geometry as GeoJSON.Geometry,
    properties: { ubigeo: f.properties.ubigeo, conDatos: f.properties.n_apto_tamizaje > 0 },
  })))
}
function circulo(lon: number, lat: number, m: number): GeoJSON.Feature {
  const coords: [number, number][] = []
  const dLat = m / 111320, dLon = m / (111320 * Math.cos(lat * Math.PI / 180))
  for (let i = 0; i <= 64; i++) { const a = (i / 64) * 2 * Math.PI; coords.push([lon + dLon * Math.cos(a), lat + dLat * Math.sin(a)]) }
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: {} }
}
function datosSeleccion() {
  const l = store.seleccionado
  if (!l) return VACIO
  const ex = l.existenteCercano ? store.porId.get(l.existenteCercano) : null
  const fs: GeoJSON.Feature[] = [circulo(l.lon, l.lat, 500)]
  if (ex) fs.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: [[l.lon, l.lat], [ex.lon, ex.lat]] }, properties: {} })
  return fc(fs)
}

function fuente(id: string) { return map?.getSource(id) as maplibregl.GeoJSONSource | undefined }
function sincronizar() {
  if (!map || !listo) return
  fuente('distritos')?.setData(datosDistritos())
  fuente('lugares')?.setData(datosLugares())
  fuente('existentes')?.setData(datosExistentes())
  fuente('seleccion')?.setData(datosSeleccion())
  map.setFilter('distrito-activo', ['==', ['get', 'ubigeo'], store.ambito])
  map.setPaintProperty('distritos-velo', 'fill-opacity', ['case', ['==', ['get', 'ubigeo'], store.ambito], 0, enLima.value ? 0 : 0.5])
  map.setFilter('lugar-elegido', ['==', ['get', 'id'], store.selId ?? ''])
  dibujarNumeros()
}

/** Números de la página visible de la lista (y del lugar elegido si está en otra página). */
function dibujarNumeros() {
  marcadores.forEach(m => m.remove())
  marcadores = []
  if (!map || !listo) return
  const visibles = store.paginaLista.items.filter(l => l.rango != null)
  const sel = store.seleccionado
  if (sel && sel.rango != null && !visibles.includes(sel) && store.seleccion.includes(sel)) visibles.push(sel)
  for (const l of visibles) {
    const n = numeroDe(l, store.ambito) ?? 0
    const el = document.createElement('button')
    el.type = 'button'
    el.className = `marca-num-v1${l.top ? ' top' : ''}${String(n).length > 2 ? ' largo' : ''}${l.id === store.selId ? ' sel' : ''}`
    el.textContent = String(n)
    el.title = `${CLASE_LARGA[l.clase]}: ${ord(n)} en el orden`
    el.dataset.id = l.id
    el.addEventListener('click', ev => { ev.stopPropagation(); store.elegir(l.id) })
    marcadores.push(new maplibregl.Marker({ element: el }).setLngLat([l.lon, l.lat]).addTo(map))
  }
}

function caja(geoms: Array<GeoJSON.Geometry | null>): maplibregl.LngLatBounds | null {
  const b = new maplibregl.LngLatBounds()
  let vacia = true
  const rec = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === 'number') { b.extend(c as [number, number]); vacia = false } else if (Array.isArray(c)) c.forEach(rec)
  }
  for (const g of geoms) if (g && 'coordinates' in g) rec(g.coordinates)
  return vacia ? null : b
}
function encuadrar(animar = true) {
  if (!map || !store.distritos) return
  const feats = store.distritos.features
  const b = caja(enLima.value ? feats.map(f => f.geometry as GeoJSON.Geometry) : feats.filter(f => f.properties.ubigeo === store.ambito).map(f => f.geometry as GeoJSON.Geometry))
  if (b) map.fitBounds(b, { padding: 32, duration: animar ? 500 : 0, maxZoom: 15 })
}
function irAlElegido() {
  const l = store.seleccionado
  if (map && l) map.flyTo({ center: [l.lon, l.lat], zoom: Math.max(15.3, map.getZoom()), duration: 600 })
}

function agregarCapas() {
  if (!map || map.getSource('lugares')) return
  listo = true
  map.addSource('distritos', { type: 'geojson', data: datosDistritos() })
  map.addLayer({ id: 'distritos-velo', type: 'fill', source: 'distritos', paint: { 'fill-color': '#ffffff', 'fill-opacity': 0 } })
  map.addLayer({ id: 'distritos-borde', type: 'line', source: 'distritos', paint: { 'line-color': '#6b7280', 'line-width': 0.8, 'line-dasharray': [3, 3], 'line-opacity': 0.8 } })
  map.addLayer({ id: 'distrito-activo', type: 'line', source: 'distritos', filter: ['==', ['get', 'ubigeo'], ''], paint: { 'line-color': '#15803d', 'line-width': 2.5 } })
  map.addSource('seleccion', { type: 'geojson', data: VACIO })
  map.addLayer({ id: 'radio-500', type: 'fill', source: 'seleccion', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': '#16a34a', 'fill-opacity': 0.06 } })
  map.addLayer({ id: 'radio-500-borde', type: 'line', source: 'seleccion', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'line-color': '#16a34a', 'line-width': 1.5, 'line-dasharray': [3, 3] } })
  map.addLayer({ id: 'linea-existente', type: 'line', source: 'seleccion', filter: ['==', ['geometry-type'], 'LineString'], paint: { 'line-color': '#2563eb', 'line-width': 2, 'line-dasharray': [1, 3] } })
  map.addSource('lugares', { type: 'geojson', data: datosLugares() })
  map.addLayer({
    id: 'lugares', type: 'circle', source: 'lugares',
    layout: { 'circle-sort-key': ['match', ['get', 'grupo'], 'top', 2, 'excl', 1, 0] },
    paint: {
      'circle-color': ['match', ['get', 'grupo'], 'top', '#16a34a', 'excl', '#d1d5db', '#ffffff'],
      'circle-stroke-color': ['match', ['get', 'grupo'], 'top', '#ffffff', '#6b7280'],
      'circle-stroke-width': 1.6,
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, enLima.value ? 2.5 : 4, 15, 6.5],
    },
  })
  map.addLayer({ id: 'lugar-elegido', type: 'circle', source: 'lugares', filter: ['==', ['get', 'id'], ''], paint: { 'circle-radius': 13, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-width': 3, 'circle-stroke-color': '#16a34a' } })
  map.addSource('existentes', { type: 'geojson', data: datosExistentes() })
  map.addLayer({ id: 'existentes', type: 'circle', source: 'existentes', paint: { 'circle-color': '#3b82f6', 'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 3.5, 15, 6.5], 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.5 } })

  const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10, className: 'popup-v1' })
  const mostrar = (e: maplibregl.MapLayerMouseEvent, html: (id: string) => string) => {
    if (!map) return
    map.getCanvas().style.cursor = 'pointer'
    const f = e.features?.[0]
    if (!f) return
    popup.setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number]).setHTML(html(String(f.properties?.id))).addTo(map)
  }
  map.on('mouseenter', 'lugares', e => mostrar(e, id => {
    const l = store.porId.get(id)
    if (!l) return ''
    const linea = l.rango != null && l.rangoDist != null ? `${ord(l.rangoDist)} en el orden de ${esc(nombreDistrito(l.ubigeo))}${l.top ? `<br>${T.topCorto(store.topK)}` : ''}` : T.desc
    return `<strong>${esc(CLASE_LARGA[l.clase])}</strong><br><span>${linea}</span>`
  }))
  map.on('mouseenter', 'existentes', e => mostrar(e, id => {
    const l = store.porId.get(id)
    return `<strong>${esc(nombreExistente(id))}</strong><br><span>Punto de reciclaje registrado${l ? `, ${esc(nombreDistrito(l.ubigeo))}` : ''}</span>`
  }))
  for (const capa of ['lugares', 'existentes']) {
    map.on('mouseleave', capa, () => { if (map) map.getCanvas().style.cursor = ''; popup.remove() })
  }
  map.on('click', 'lugares', e => { const id = e.features?.[0]?.properties?.id; if (typeof id === 'string') store.elegir(id) })
  map.on('click', 'distritos-velo', e => {
    if (map?.queryRenderedFeatures(e.point, { layers: ['lugares', 'existentes'] }).length) return
    const p = e.features?.[0]?.properties
    if (p?.conDatos && p.ubigeo !== store.ambito) store.cambiarAmbito(String(p.ubigeo))
  })
  sincronizar()
  if (store.seleccionado) irAlElegido(); else encuadrar(false)
}

watch(() => [store.seleccion, store.capaExistentes, store.paginaLista, store.selId, store.distritos], sincronizar)
watch(() => store.ambito, () => { sincronizar(); if (!store.seleccionado) encuadrar() })
watch(() => store.selId, id => { if (id) irAlElegido() })

onMounted(() => {
  if (!contenedor.value) return
  map = new maplibregl.Map({
    container: contenedor.value, style: ESTILO_BASE, center: [-77.04, -12.06], zoom: 10.5,
    attributionControl: { compact: true, customAttribution: 'Resultados EcoLima V1 · datos ODbL 1.0' },
  })
  const usarRespaldo = () => {
    if (!map || listo) return
    sinMapaBase.value = true
    map.setStyle(ESTILO_SIN_FONDO)
    map.once('styledata', agregarCapas)
  }
  map.on('load', agregarCapas)
  // Sin internet el estilo base no llega: se usa un fondo liso con los límites del paquete.
  map.on('error', () => { if (!listo) usarRespaldo() })
  temporizador = setTimeout(usarRespaldo, 8000)
  if (import.meta.env.DEV) {
    // Lectura para las pruebas en navegador (solo en desarrollo).
    ;(window as unknown as Record<string, unknown>).__mapaV1 = () => ({
      listo, lugares: (datosLugares().features.length), existentes: datosExistentes().features.length,
      numeros: marcadores.length, zoom: map?.getZoom(),
    })
  }
})
onUnmounted(() => {
  if (temporizador) clearTimeout(temporizador)
  marcadores.forEach(m => m.remove())
  map?.remove()
  map = null
  listo = false
})

defineExpose({ redimensionar: () => map?.resize(), encuadrar })
</script>

<template>
  <div
    class="relative w-full h-full overflow-hidden bg-[#eef0ee]"
    data-prueba="mapa"
  >
    <div
      ref="contenedor"
      class="absolute inset-0"
      role="application"
      aria-label="Mapa de los lugares"
    />
    <div class="absolute right-3 top-3 z-10 flex flex-col gap-1.5">
      <button
        class="w-8 h-8 bg-white border border-border rounded-md shadow flex items-center justify-center hover:bg-secondary"
        aria-label="Acercar"
        title="Acercar"
        @click="map?.zoomIn()"
      >
        <Plus class="w-4 h-4" />
      </button>
      <button
        class="w-8 h-8 bg-white border border-border rounded-md shadow flex items-center justify-center hover:bg-secondary"
        aria-label="Alejar"
        title="Alejar"
        @click="map?.zoomOut()"
      >
        <Minus class="w-4 h-4" />
      </button>
      <button
        class="w-8 h-8 bg-white border border-border rounded-md shadow flex items-center justify-center hover:bg-secondary"
        :aria-label="enLima ? 'Recentrar en la provincia' : 'Recentrar en el distrito'"
        title="Recentrar"
        @click="encuadrar()"
      >
        <RotateCcw class="w-3.5 h-3.5" />
      </button>
    </div>

    <div
      class="absolute right-3 bottom-7 z-10 bg-white border border-border rounded-lg shadow px-3 py-2.5 text-xs max-w-[280px] flex flex-col gap-1"
      data-prueba="leyenda"
    >
      <div class="flex items-center justify-between gap-3">
        <strong class="font-semibold">Leyenda</strong>
        <button
          type="button"
          class="text-[11px] text-muted-foreground underline"
          :aria-expanded="!leyendaPlegada"
          @click="leyendaPlegada = !leyendaPlegada"
        >
          {{ leyendaPlegada ? 'Mostrar' : 'Ocultar' }}
        </button>
      </div>
      <template v-if="!leyendaPlegada">
        <span class="flex items-center gap-2"><i class="w-2.5 h-2.5 rounded-full bg-primary ring-1 ring-offset-1 ring-primary" />{{ T.topCorto(store.topK) }}</span>
        <span class="flex items-center gap-2"><i class="w-2.5 h-2.5 rounded-full bg-white border-2 border-gray-500" />{{ T.cand }}</span>
        <span class="flex items-center gap-2"><i class="w-2.5 h-2.5 rounded-full bg-gray-300 border border-gray-500" />{{ T.excl }}</span>
        <span
          class="flex items-center gap-2"
          :class="store.capaExistentes ? '' : 'opacity-45'"
        ><i class="w-2.5 h-2.5 rounded-full bg-blue-500 ring-1 ring-white" />{{ T.exist }}{{ store.capaExistentes ? '' : ' (oculta)' }}</span>
        <hr class="border-border my-0.5">
        <span class="text-[11px] text-muted-foreground leading-snug">
          Número = {{ enLima ? 'puesto en toda Lima' : `orden de revisión en ${nombreDistrito(store.ambito)}` }} (1 = revisar primero).
          <template v-if="store.seleccion.length"> Se numeran los lugares de la página {{ store.paginaLista.p }} de la lista ({{ fmtEntero(store.paginaLista.desde + 1) }}–{{ fmtEntero(store.paginaLista.hasta) }}).</template>
          El verde marca ubicaciones y los primeros de Lima; no significa aprobación municipal.
        </span>
        <span
          v-if="sinMapaBase"
          class="text-[11px] text-amber-700"
        >Mapa base no disponible: se muestran solo los límites distritales.</span>
      </template>
    </div>
  </div>
</template>

<style>
.marca-num-v1 { display: grid; place-items: center; min-width: 24px; height: 24px; padding: 0 4px; border-radius: 999px; font: 700 11px/1 Inter, system-ui, sans-serif; background: #fff; color: #1a1a1a; border: 2px solid #4b5563; box-shadow: 0 1px 3px rgba(0,0,0,.3); cursor: pointer; font-variant-numeric: tabular-nums; }
.marca-num-v1.top { background: #16a34a; border-color: #fff; color: #fff; }
.marca-num-v1.largo { font-size: 10px; }
.marca-num-v1.sel { box-shadow: 0 0 0 3px rgba(22,163,74,.55), 0 1px 3px rgba(0,0,0,.3); }
.popup-v1 .maplibregl-popup-content { font: 600 12px/1.35 Inter, system-ui, sans-serif; padding: 6px 9px; border-radius: 6px; }
.popup-v1 .maplibregl-popup-content span { font-weight: 400; }
</style>
