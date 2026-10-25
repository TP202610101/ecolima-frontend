<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { MapPin, CheckCircle2, TrendingUp, Navigation, Copy, Printer, FileDown, AlertTriangle, RefreshCw, ArrowUp, ArrowDown, ArrowUpDown } from '@lucide/vue'
import KpiCard from '@/shared/components/KpiCard.vue'
import AvisoV1 from '../components/AvisoV1.vue'
import PaginadorV1 from '../components/PaginadorV1.vue'
import AyudaFuentesV1 from '../components/AyudaFuentesV1.vue'
import AvisoSinLugaresV1 from '../components/AvisoSinLugaresV1.vue'
import SelectorAmbitoV1 from '../components/SelectorAmbitoV1.vue'
import { useExploracionV1Store } from '../stores/useExploracionV1Store'
import { useCambioAmbito } from '../composables/useCambioAmbito'
import { useAuthStore } from '@/domains/auth/stores/useAuthStore'
import { vValorSelect } from '@/shared/directives/valorSelect'
import {
  CLASE_LARGA, COLUMNA_TEXTO, ORDEN_INICIAL, PROVINCIA, T, aCsv, fechaLarga, filasCsv, fmtDec, fmtDist,
  fmtEntero, fuenteExistente, nombreAmbito, nombreArchivoCsv, nombreDistrito, nombreExistente, numeroDe, ordenarTabla,
  codigoCorto, nombreLugar, paginar, plural, textoResumen, type ColumnaTabla, type MetaExportacion,
} from '../utils/lecturaV1'

// Reportes V1 (prototipo V5): mismo distrito y filtros que Análisis V1. Copiar resumen, Imprimir y Descargar CSV
// exportan solo el ámbito elegido aquí (un distrito, o la provincia si se elige «Provincia de Lima»): todas las filas
// filtradas y solo los puntos existentes de ese ámbito. La tabla comparativa de distritos no entra en las exportaciones.
const store = useExploracionV1Store()
const auth = useAuthStore()
const router = useRouter()
const ayuda = ref<'orden' | 'fuentes' | 'modelo' | null>(null)
const imprimiendo = ref(false)
const aviso = ref<string | null>(null)
let temporizador: ReturnType<typeof setTimeout> | null = null

function cargar() { store.inicializar(String(auth.user?.user_id ?? auth.user?.email ?? 'anonimo')) }

const enLima = computed(() => store.ambito === PROVINCIA)
const amb = computed(() => nombreAmbito(store.ambito))
const v = computed(() => store.version)
const ordenada = computed(() => ordenarTabla(store.seleccion, store.repOrden, store.ambito))
const pgTabla = computed(() => paginar(ordenada.value, store.repPag, store.repPorPag))
const filasDistritos = computed(() => store.distritosConDatos
  .flatMap(u => { const c = store.conteosDistrito.get(u); return c ? [{ u, ...c, nombre: nombreDistrito(u) }] : [] })
  .sort((a, b) => b.n_top_k - a.n_top_k || a.nombre.localeCompare(b.nombre, 'es')))
const pgDistritos = computed(() => {
  if (store.distPag == null) {
    const i = filasDistritos.value.findIndex(r => r.u === store.ambito)
    return paginar(filasDistritos.value, i >= 0 ? Math.floor(i / store.distPorPag) + 1 : 1, store.distPorPag)
  }
  return paginar(filasDistritos.value, store.distPag, store.distPorPag)
})
const sinLugares = computed(() => store.distritosSinLugares.map(u => nombreDistrito(u)).join(', '))
const cifras = computed(() => store.cifrasSeleccion)
const fechaHoy = new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })
const meta = computed<MetaExportacion>(() => ({
  ambito: store.ambito, version: v.value?.paquete_version ?? '', fecha: v.value?.fecha_paquete ?? '',
  topK: store.topK, filtros: store.textoFiltros, verificacion: store.verificacionCampo,
}))

const COLUMNAS: Array<{ col: ColumnaTabla; titulo: () => string; num: boolean; soloLima?: boolean }> = [
  { col: 'orden', titulo: () => (enLima.value ? 'Puesto' : 'Orden'), num: true },
  { col: 'tipo', titulo: () => 'Lugar', num: false },
  { col: 'distrito', titulo: () => 'Distrito', num: false, soloLima: true },
  { col: 'k1', titulo: () => 'Personas cerca', num: true },
  { col: 'k2', titulo: () => 'Residuos (kg/día)', num: true },
  { col: 'dist', titulo: () => 'Punto registrado más cercano', num: true },
  { col: 'k4', titulo: () => 'Vías (km/km²)', num: true },
]
const columnasVisibles = computed(() => COLUMNAS.filter(c => !c.soloLima || enLima.value))
function ordenarPor(col: ColumnaTabla) {
  const o = store.repOrden
  store.repOrden = o.col === col ? { col, dir: (o.dir === 1 ? -1 : 1) } : { col, dir: ['k1', 'k2', 'dist', 'k4'].includes(col) ? -1 : 1 }
  store.repPag = 1
}
const ordenDistinto = computed(() => store.repOrden.col !== ORDEN_INICIAL.col || store.repOrden.dir !== ORDEN_INICIAL.dir)
const textoOrden = computed(() => {
  if (!ordenDistinto.value) return ''
  const c = COLUMNAS.find(x => x.col === store.repOrden.col) ?? COLUMNAS[0]
  const texto = COLUMNA_TEXTO.includes(c.col)
  return `Ordenado por ${c.titulo().toLowerCase()} (${store.repOrden.dir === 1 ? (texto ? 'A–Z' : 'de menor a mayor') : (texto ? 'Z–A' : 'de mayor a menor')}). `
})

// El selector de ámbito (SelectorAmbitoV1) aplica la elección un cuadro después; mientras tanto, «Actualizando…».
const { elegir: elegirAmbito, actualizando } = useCambioAmbito()
function irAlLugar(id: string) { store.elegir(id); router.push({ name: 'analisis' }) }
function moverDistritos(delta: number) { store.distPag = pgDistritos.value.p + delta }
function avisar(t: string) {
  aviso.value = t
  if (temporizador) clearTimeout(temporizador)
  temporizador = setTimeout(() => { aviso.value = null }, 3500)
}

// ── Exportaciones (solo el ámbito elegido) ─────────────────────────────────────────────────────────
function descargarCsv() {
  const filas = filasCsv(ordenada.value, store.existentesAmbito, meta.value)
  const nombre = nombreArchivoCsv(meta.value)
  const url = URL.createObjectURL(new Blob([aCsv(filas)], { type: 'text/csv;charset=utf-8' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre })
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  avisar(`Descargado: ${nombre} (${plural(filas.length - 1, 'fila', 'filas')})`)
}
async function copiarResumen() {
  const texto = textoResumen(store.seleccion, store.existentesAmbito, cifras.value, meta.value)
  if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__resumenV1 = texto
  try {
    await navigator.clipboard.writeText(texto)
    avisar(`Resumen de ${amb.value} copiado.`)
  } catch {
    const t = document.createElement('textarea')
    t.value = texto
    document.body.append(t)
    t.select()
    const ok = document.execCommand('copy')
    t.remove()
    avisar(ok ? `Resumen de ${amb.value} copiado.` : 'No se pudo copiar. Selecciona el texto manualmente.')
  }
}
// Impresión: resumen, tabla por distrito y los primeros de Lima (provincia) o el orden del distrito elegido,
// en tablas compactas que solo se arman al imprimir. La lista completa de la provincia va en el CSV.
const filasImpresion = computed(() => (enLima.value ? ordenada.value.filter(l => l.top) : ordenada.value))
const antes = () => { imprimiendo.value = true }
const despues = () => { imprimiendo.value = false }
async function imprimir() {
  imprimiendo.value = true
  await nextTick()
  window.print()
}
onMounted(() => {
  cargar()
  window.addEventListener('beforeprint', antes)
  window.addEventListener('afterprint', despues)
})
onUnmounted(() => {
  window.removeEventListener('beforeprint', antes)
  window.removeEventListener('afterprint', despues)
  if (temporizador) clearTimeout(temporizador)
})
</script>

<template>
  <div
    class="flex flex-col h-full print:h-auto"
    data-prueba="reportes-v1"
  >
    <AvisoV1 @ayuda="s => (ayuda = s)" />
    <div class="flex-1 overflow-auto bg-gray-50 print:overflow-visible print:bg-white">
      <div
        v-if="store.cargando"
        class="py-24 flex flex-col items-center gap-2"
      >
        <div class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p class="text-sm text-muted-foreground">
          Cargando los resultados…
        </p>
      </div>
      <div
        v-else-if="store.error"
        class="py-24 flex flex-col items-center gap-3 text-center"
        role="alert"
      >
        <AlertTriangle class="w-8 h-8 text-red-600" />
        <p class="text-sm">
          {{ store.error }}
        </p>
        <button
          type="button"
          class="inline-flex items-center gap-2 min-h-10 px-4 py-2 bg-primary text-white text-sm rounded-md"
          @click="cargar"
        >
          <RefreshCw class="w-4 h-4" />Reintentar
        </button>
      </div>
      <p
        v-else-if="store.sinVersion"
        class="py-24 text-center text-sm text-muted-foreground"
      >
        Todavía no hay resultados V1 cargados en el servidor.
      </p>

      <div
        v-else-if="store.cargado && v"
        class="max-w-7xl mx-auto p-4 sm:p-8 space-y-6 print:p-0 print:space-y-3"
      >
        <!-- Encabezado -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div class="flex-1">
            <h1 class="text-2xl font-bold">
              Reporte de análisis
            </h1>
            <p
              class="text-sm text-muted-foreground mt-1"
              data-prueba="subtitulo"
            >
              Lugares para revisar {{ enLima ? 'en la provincia de Lima' : `en ${amb}` }} · revisión preliminar con datos públicos, paquete de resultados {{ v.paquete_version }} del {{ fechaLarga(v.fecha_paquete) }}
            </p>
          </div>
          <div class="grid grid-cols-2 sm:flex gap-2 sm:flex-wrap w-full sm:w-auto print:hidden">
            <button
              type="button"
              class="flex items-center justify-center gap-2 min-h-10 px-4 py-2 border border-border rounded-md text-sm bg-white hover:bg-secondary"
              data-prueba="copiar-resumen"
              @click="copiarResumen"
            >
              <Copy class="w-4 h-4" />Copiar resumen
            </button>
            <button
              type="button"
              class="flex items-center justify-center gap-2 min-h-10 px-4 py-2 border border-border rounded-md text-sm bg-white hover:bg-secondary"
              data-prueba="imprimir"
              @click="imprimir"
            >
              <Printer class="w-4 h-4" />Imprimir
            </button>
            <button
              type="button"
              class="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 min-h-10 px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary-hover disabled:opacity-50"
              :disabled="!store.seleccion.length"
              data-prueba="descargar-csv"
              @click="descargarCsv"
            >
              <FileDown class="w-4 h-4" />Descargar CSV
            </button>
          </div>
        </div>
        <div
          class="hidden print:block text-xs"
          data-prueba="encabezado-impresion"
        >
          <p><strong>EcoLima ML · {{ amb }}</strong> · Paquete de resultados {{ v.paquete_version }} del {{ fechaLarga(v.fecha_paquete) }} · Impreso el {{ fechaHoy }} (no es un documento oficial).</p>
          <p>{{ store.textoFiltros.length ? `Filtros aplicados: ${store.textoFiltros.join('; ')}.` : 'Sin filtros.' }}</p>
        </div>

        <!-- Ámbito -->
        <div class="bg-white border border-border rounded-lg px-4 py-3 flex flex-wrap items-center gap-3 print:hidden">
          <label
            for="v1-rep-distrito"
            class="text-sm font-medium"
          >Reporte de</label>
          <SelectorAmbitoV1
            id="v1-rep-distrito"
            data-prueba="selector-reporte"
            class="w-full sm:w-auto sm:min-w-[260px]"
          />
          <span
            v-if="store.esMiDistrito"
            class="text-[11px] font-medium rounded-full px-2 py-0.5 bg-green-100 text-green-800"
          >Mi distrito</span>
          <span
            v-else-if="store.miDistrito"
            class="text-[11px] font-medium rounded-full px-2 py-0.5 bg-blue-100 text-blue-800"
          >Explorando</span>
          <span
            class="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
            aria-live="polite"
            data-prueba="actualizando"
          >
            <template v-if="actualizando">
              <span class="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />Actualizando el reporte…
            </template>
          </span>
          <button
            v-if="store.miDistrito && !store.esMiDistrito"
            type="button"
            class="min-h-10 lg:min-h-0 text-sm text-primary underline underline-offset-2"
            @click="elegirAmbito(store.miDistrito)"
          >
            Volver a mi distrito ({{ nombreDistrito(store.miDistrito) }})
          </button>
          <p
            class="basis-full sm:basis-auto flex-1 min-w-0 sm:min-w-[240px] text-[13px] text-muted-foreground sm:text-right"
            data-prueba="texto-filtros"
          >
            <template v-if="store.textoFiltros.length">
              Filtros de Análisis aplicados: {{ store.textoFiltros.join('; ') }}.
              <button
                type="button"
                class="min-h-10 lg:min-h-0 text-primary underline underline-offset-2"
                data-prueba="quitar-filtros"
                @click="store.restablecerFiltros()"
              >
                Quitar filtros
              </button>
            </template>
            <template v-else>
              Sin filtros: se incluyen todos los lugares evaluados.
            </template>
          </p>
        </div>

        <AvisoSinLugaresV1
          v-if="store.ambitoSinLugares"
          class="print:hidden"
          @fuentes="ayuda = 'fuentes'"
        />

        <!-- Indicadores del ámbito -->
        <div
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4 transition-opacity"
          :class="actualizando ? 'opacity-50' : ''"
          data-prueba="kpis"
        >
          <KpiCard
            :icon="MapPin"
            icon-bg="bg-green-100 text-green-600"
            label="Lugares evaluados"
            :value="fmtEntero(cifras.ev)"
            :subtitle="store.hayFiltros ? `Con filtros (sin filtros: ${fmtEntero(store.cifrasAmbito.ev)})` : 'Paraderos, mercados, centros comerciales y parques'"
          />
          <KpiCard
            :icon="CheckCircle2"
            icon-bg="bg-blue-100 text-blue-600"
            label="Superaron la revisión preliminar"
            :value="fmtEntero(cifras.aptos)"
            :subtitle="`${plural(cifras.excl, 'descartado', 'descartados')}. No significa viable ni autorizado`"
          />
          <KpiCard
            :icon="TrendingUp"
            icon-bg="bg-purple-100 text-purple-700"
            :label="T.topCorto(store.topK)"
            :value="fmtEntero(cifras.top)"
            :subtitle="`De los ${store.topK} primeros lugares para revisar en toda la provincia`"
          />
          <KpiCard
            :icon="Navigation"
            icon-bg="bg-secondary text-neutral-600"
            :label="T.exist"
            :value="fmtEntero(cifras.exist)"
            subtitle="Según OpenStreetMap y el plan de San Isidro. Puede haber otros sin registrar"
          />
        </div>

        <!-- Comparación entre distritos (no se exporta en un reporte distrital) -->
        <div
          class="bg-white rounded-lg border border-border overflow-hidden print:hidden transition-opacity"
          :class="actualizando ? 'opacity-50' : ''"
          data-prueba="caja-distritos"
        >
          <div class="px-4 sm:px-6 py-4 border-b border-border">
            <h2 class="text-base font-semibold">
              Resultados por distrito
            </h2>
            <p class="text-xs text-muted-foreground">
              Lugares de cada distrito entre los {{ store.topK }} primeros para revisar en Lima. Pulsa un distrito para ver su reporte. Esta comparación no se incluye al exportar un distrito.
            </p>
          </div>
          <div data-prueba="filas-distritos">
            <button
              v-for="r in pgDistritos.items"
              :key="r.u"
              type="button"
              class="w-full flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-0.5 px-4 sm:px-6 py-2.5 min-h-11 border-b border-border text-left text-sm hover:bg-secondary"
              :class="r.u === store.ambito ? 'bg-accent shadow-[inset_2px_0_0_#16a34a]' : 'bg-white'"
              :aria-current="r.u === store.ambito"
              :data-distrito="r.u"
              @click="elegirAmbito(r.u)"
            >
              <span
                class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                :class="r.n_top_k ? 'bg-primary' : 'bg-gray-300'"
              />
              <span class="flex-1 min-w-0">{{ r.nombre }}<span
                v-if="r.u === store.miDistrito"
                class="ml-2 text-[11px] font-medium rounded-full px-2 py-0.5 bg-green-100 text-green-800"
              >Mi distrito</span></span>
              <span class="order-last sm:order-none basis-full sm:basis-auto pl-[22px] sm:pl-0 text-xs text-muted-foreground sm:whitespace-nowrap">{{ fmtEntero(r.n_sitios - r.n_punto_existente) }} evaluados · {{ plural(r.n_punto_existente, 'punto registrado', 'puntos registrados') }}</span>
              <span
                class="sm:w-28 text-right tabular-nums whitespace-nowrap"
                :class="r.n_top_k ? 'font-semibold' : 'text-xs text-muted-foreground'"
              >{{ r.n_top_k ? `${r.n_top_k} de ${store.topK}` : 'Ninguno' }}</span>
            </button>
          </div>
          <div class="px-4 py-2.5 border-t border-border print:hidden">
            <PaginadorV1
              :pagina="pgDistritos"
              :por-pagina="store.distPorPag"
              que="distritos"
              data-prueba="paginador-distritos"
              @mover="moverDistritos"
              @por-pagina="n => { store.distPorPag = n; store.distPag = 1 }"
            />
          </div>
          <div class="px-4 py-3 flex flex-wrap justify-between gap-3 text-xs text-muted-foreground">
            <span>Sin lugares evaluados en esta versión: {{ sinLugares }}.</span>
            <span>Que un distrito no tenga lugares entre los primeros de Lima no impide revisar su propio orden.</span>
          </div>
        </div>

        <!-- Orden de revisión del ámbito -->
        <div
          class="bg-white rounded-lg border border-border overflow-hidden print:hidden transition-opacity"
          :class="actualizando ? 'opacity-50' : ''"
          :aria-busy="actualizando"
          data-prueba="tabla-orden"
        >
          <div class="px-4 sm:px-6 py-4 border-b border-border flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 class="text-base font-semibold">
                {{ enLima ? 'Orden de revisión en la provincia' : `Orden de revisión en ${amb}` }}
              </h2>
              <p class="text-xs text-muted-foreground">
                {{ plural(store.seleccion.length, 'lugar', 'lugares') }}{{ store.hayFiltros ? ' con los filtros de Análisis' : '' }}. {{ textoOrden }}Pulsa una fila para verla en el mapa; pulsa un título de columna para ordenar.
              </p>
            </div>
            <button
              v-if="ordenDistinto"
              type="button"
              class="min-h-10 lg:min-h-0 text-xs text-primary underline underline-offset-2 print:hidden"
              data-prueba="orden-original"
              @click="store.repOrden = { ...ORDEN_INICIAL }; store.repPag = 1"
            >
              Volver al orden de revisión
            </button>
          </div>
          <div
            v-if="store.seleccion.length"
            class="md:hidden"
            data-prueba="tarjetas-orden"
          >
            <div class="flex items-center gap-2 px-4 py-2 border-b border-border bg-gray-50">
              <label
                for="v1-rep-ordenar"
                class="text-xs text-muted-foreground"
              >Ordenar por</label>
              <select
                id="v1-rep-ordenar"
                v-valor-select="store.repOrden.col"
                class="flex-1 min-w-0 min-h-10 border border-border rounded-md px-2 text-sm bg-white"
                @change="ordenarPor(($event.target as HTMLSelectElement).value as ColumnaTabla)"
              >
                <option
                  v-for="c in columnasVisibles"
                  :key="c.col"
                  :value="c.col"
                >
                  {{ c.titulo() }}
                </option>
              </select>
              <button
                type="button"
                class="w-10 h-10 flex items-center justify-center border border-border rounded-md bg-white"
                :aria-label="store.repOrden.dir === 1 ? 'Orden ascendente; cambiar a descendente' : 'Orden descendente; cambiar a ascendente'"
                @click="ordenarPor(store.repOrden.col)"
              >
                <ArrowUp
                  v-if="store.repOrden.dir === 1"
                  class="w-4 h-4"
                />
                <ArrowDown
                  v-else
                  class="w-4 h-4"
                />
              </button>
            </div>
            <ul>
              <li
                v-for="l in pgTabla.items"
                :key="l.id"
                class="border-b border-border"
              >
                <button
                  type="button"
                  class="w-full text-left px-4 py-3 hover:bg-gray-50 flex gap-3"
                  :data-fila="l.id"
                  @click="irAlLugar(l.id)"
                >
                  <span class="w-10 flex-shrink-0 text-right tabular-nums font-semibold">{{ l.rango != null ? fmtEntero(numeroDe(l, store.ambito)) : '—' }}</span>
                  <span class="flex-1 min-w-0">
                    <span class="block text-sm font-medium">{{ nombreLugar(l) }}</span>
                    <span class="block text-xs text-muted-foreground break-all">{{ codigoCorto(l.id) }}</span>
                    <span class="mt-1 flex flex-wrap gap-1">
                      <span
                        v-if="l.rango != null"
                        class="rounded-full text-[11px] font-medium px-2 py-0.5 bg-green-100 text-green-800"
                      >Superada</span>
                      <span
                        v-else
                        class="rounded-full text-[11px] font-medium px-2 py-0.5 bg-secondary text-neutral-600 border border-border"
                      >Descartado</span>
                      <span
                        v-if="l.top"
                        class="rounded-full text-[11px] font-medium px-2 py-0.5 bg-primary text-white"
                      >{{ store.topK }} primeros · puesto {{ fmtEntero(l.rango) }}</span>
                    </span>
                    <span class="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-neutral-700">
                      <span>Personas: <b class="tabular-nums">{{ l.k ? fmtEntero(l.k.k1) : '—' }}</b></span>
                      <span>Residuos: <b class="tabular-nums">{{ l.k ? fmtEntero(l.k.k2) : '—' }}</b> kg/día</span>
                      <span>Punto cercano: <b class="tabular-nums">{{ fmtDist(l.dist) }}</b></span>
                      <span>Vías: <b class="tabular-nums">{{ l.k ? fmtDec(l.k.k4, 1) : '—' }}</b> km/km²</span>
                    </span>
                  </span>
                </button>
              </li>
            </ul>
          </div>
          <div
            v-if="store.seleccion.length"
            class="hidden md:block overflow-x-auto"
            data-prueba="tabla-orden-pantalla"
          >
            <table class="w-full text-sm">
              <thead class="bg-gray-50 border-b border-border">
                <tr>
                  <th
                    v-for="c in columnasVisibles"
                    :key="c.col"
                    class="px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap"
                    :class="c.num ? 'text-right' : 'text-left'"
                    :aria-sort="store.repOrden.col === c.col ? (store.repOrden.dir === 1 ? 'ascending' : 'descending') : undefined"
                  >
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 min-h-10 lg:min-h-0"
                      :class="[c.num ? 'flex-row-reverse' : '', store.repOrden.col === c.col ? 'text-foreground font-semibold' : 'hover:text-foreground']"
                      :data-orden="c.col"
                      title="Ordenar por esta columna"
                      @click="ordenarPor(c.col)"
                    >
                      {{ c.titulo() }}
                      <ArrowUp
                        v-if="store.repOrden.col === c.col && store.repOrden.dir === 1"
                        class="w-3 h-3 text-primary"
                      />
                      <ArrowDown
                        v-else-if="store.repOrden.col === c.col"
                        class="w-3 h-3 text-primary"
                      />
                      <ArrowUpDown
                        v-else
                        class="w-3 h-3 opacity-40"
                      />
                    </button>
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
                    Revisión preliminar
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
                    {{ store.topK }} primeros de Lima
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="l in pgTabla.items"
                  :key="l.id"
                  class="border-b border-border cursor-pointer hover:bg-gray-50"
                  tabindex="0"
                  :data-fila="l.id"
                  @click="irAlLugar(l.id)"
                  @keydown.enter="irAlLugar(l.id)"
                >
                  <td class="px-4 py-2.5 text-right tabular-nums font-semibold">
                    {{ l.rango != null ? fmtEntero(numeroDe(l, store.ambito)) : '—' }}
                  </td>
                  <td class="px-4 py-2.5">
                    <span class="flex items-center gap-2"><MapPin
                      class="w-4 h-4 flex-shrink-0"
                      :class="l.rango != null ? 'text-primary' : 'text-gray-400'"
                    /><span>{{ CLASE_LARGA[l.clase] }}</span></span>
                  </td>
                  <td
                    v-if="enLima"
                    class="px-4 py-2.5"
                  >
                    {{ nombreDistrito(l.ubigeo) }}
                  </td>
                  <td class="px-4 py-2.5 text-right tabular-nums">
                    {{ l.k ? fmtEntero(l.k.k1) : '—' }}
                  </td>
                  <td class="px-4 py-2.5 text-right tabular-nums">
                    {{ l.k ? fmtEntero(l.k.k2) : '—' }}
                  </td>
                  <td class="px-4 py-2.5 text-right tabular-nums whitespace-nowrap">
                    {{ fmtDist(l.dist) }}
                  </td>
                  <td class="px-4 py-2.5 text-right tabular-nums">
                    {{ l.k ? fmtDec(l.k.k4, 1) : '—' }}
                  </td>
                  <td class="px-4 py-2.5">
                    <span
                      v-if="l.rango != null"
                      class="rounded-full text-xs font-medium px-2.5 py-0.5 bg-green-100 text-green-800"
                    >Superada</span>
                    <span
                      v-else
                      class="rounded-full text-xs font-medium px-2.5 py-0.5 bg-secondary text-neutral-600 border border-border"
                    >Descartado</span>
                  </td>
                  <td class="px-4 py-2.5 whitespace-nowrap">
                    <span
                      v-if="l.top"
                      class="rounded-full text-xs font-medium px-2.5 py-0.5 bg-primary text-white"
                    >Sí · puesto {{ fmtEntero(l.rango) }}</span>
                    <span
                      v-else
                      class="text-muted-foreground"
                    >No</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p
            v-else-if="store.ambitoSinLugares"
            class="px-6 py-8 text-center text-muted-foreground"
            data-prueba="tabla-sin-lugares"
          >
            Sin lugares evaluados en {{ nombreDistrito(store.ambito) }}.
          </p>
          <p
            v-else
            class="px-6 py-8 text-center text-muted-foreground"
            data-prueba="tabla-vacia"
          >
            Ningún lugar coincide con los filtros actuales.
            <button
              type="button"
              class="text-primary underline underline-offset-2"
              @click="store.restablecerFiltros()"
            >
              Quitar filtros
            </button>
          </p>
          <div
            v-if="store.seleccion.length"
            class="px-4 py-2.5 border-t border-border print:hidden"
          >
            <PaginadorV1
              :pagina="pgTabla"
              :por-pagina="store.repPorPag"
              que="lugares"
              data-prueba="paginador-tabla"
              @mover="d => (store.repPag = pgTabla.p + d)"
              @por-pagina="n => { store.repPorPag = n; store.repPag = 1 }"
            />
            <p class="text-xs text-muted-foreground mt-2">
              «Descargar CSV» incluye los {{ plural(store.seleccion.length, 'lugar', 'lugares') }} de {{ amb }}, no solo esta página, y sus puntos existentes registrados.
            </p>
          </div>
        </div>

        <!-- Versión impresa: solo se arma al imprimir (tablas compactas; filas y tarjetas no se cortan) -->
        <div
          v-if="imprimiendo"
          class="hidden print:block space-y-3"
          data-prueba="impresion"
        >
          <section
            v-if="enLima"
            class="impresion-seccion"
            data-prueba="impresion-distritos"
          >
            <h2 class="text-sm font-semibold">
              Resultados por distrito
            </h2>
            <table class="impresion-tabla">
              <thead>
                <tr>
                  <th>Distrito</th>
                  <th class="num">
                    Evaluados
                  </th>
                  <th class="num">
                    Superaron la revisión
                  </th>
                  <th class="num">
                    Puntos registrados
                  </th>
                  <th class="num">
                    Entre los {{ store.topK }} primeros
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="r in filasDistritos"
                  :key="r.u"
                >
                  <td>{{ r.nombre }}</td>
                  <td class="num">
                    {{ fmtEntero(r.n_sitios - r.n_punto_existente) }}
                  </td>
                  <td class="num">
                    {{ fmtEntero(r.n_apto_tamizaje) }}
                  </td>
                  <td class="num">
                    {{ fmtEntero(r.n_punto_existente) }}
                  </td>
                  <td class="num">
                    {{ r.n_top_k ? fmtEntero(r.n_top_k) : '—' }}
                  </td>
                </tr>
              </tbody>
            </table>
            <p class="text-[9px] text-muted-foreground">
              Sin lugares evaluados en esta versión: {{ sinLugares }}.
            </p>
          </section>

          <section
            v-if="filasImpresion.length"
            class="impresion-seccion"
            data-prueba="impresion-lugares"
          >
            <h2 class="text-sm font-semibold">
              {{ enLima ? `Los ${store.topK} primeros lugares para revisar en Lima` : `Orden de revisión en ${amb}` }}
            </h2>
            <p class="text-[9px] text-muted-foreground">
              {{ plural(filasImpresion.length, 'lugar', 'lugares') }}{{ store.hayFiltros ? ' con los filtros de Análisis' : '' }}. {{ textoOrden }}{{ enLima ? `La lista completa de los ${fmtEntero(store.seleccion.length)} lugares de la provincia está en «Descargar CSV».` : '' }}
            </p>
            <table class="impresion-tabla">
              <thead>
                <tr>
                  <th class="num">
                    {{ enLima ? 'Puesto' : 'Orden' }}
                  </th>
                  <th>Lugar</th>
                  <th class="num">
                    Personas cerca
                  </th>
                  <th class="num">
                    Residuos (kg/día)
                  </th>
                  <th class="num">
                    Punto registrado más cercano
                  </th>
                  <th class="num">
                    Vías (km/km²)
                  </th>
                  <th v-if="!enLima">
                    Revisión preliminar
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="l in filasImpresion"
                  :key="l.id"
                >
                  <td class="num">
                    {{ l.rango != null ? fmtEntero(numeroDe(l, store.ambito)) : '—' }}
                  </td>
                  <td>{{ nombreLugar(l) }} · {{ codigoCorto(l.id) }}</td>
                  <td class="num">
                    {{ l.k ? fmtEntero(l.k.k1) : '—' }}
                  </td>
                  <td class="num">
                    {{ l.k ? fmtEntero(l.k.k2) : '—' }}
                  </td>
                  <td class="num">
                    {{ fmtDist(l.dist) }}
                  </td>
                  <td class="num">
                    {{ l.k ? fmtDec(l.k.k4, 1) : '—' }}
                  </td>
                  <td v-if="!enLima">
                    {{ l.rango != null ? 'Superada' : 'Descartado' }}{{ l.top ? ` · entre los ${store.topK} primeros de Lima` : '' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          <section
            v-if="!enLima && store.existentesAmbito.length"
            class="impresion-seccion"
            data-prueba="impresion-existentes"
          >
            <h2 class="text-sm font-semibold">
              {{ T.exist }} en {{ amb }}
            </h2>
            <p class="text-[9px] text-muted-foreground">
              {{ plural(store.existentesAmbito.length, 'punto', 'puntos') }} según OpenStreetMap y el plan de San Isidro. Puede haber otros sin registrar; no se afirma quién los administra.
            </p>
            <table class="impresion-tabla">
              <tbody>
                <tr
                  v-for="e in store.existentesAmbito"
                  :key="e.id"
                >
                  <td>{{ nombreExistente(e.id) }}</td>
                  <td>{{ fuenteExistente(e.id) }}</td>
                  <td class="num">
                    {{ fmtDec(e.lat, 5) }}, {{ fmtDec(e.lon, 5) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>

        <p class="bg-white border border-border border-l-[3px] border-l-amber-600 rounded-lg px-5 py-4 text-[13px] text-neutral-700 print:px-3 print:py-2 print:text-[9px] break-inside-avoid">
          <strong class="text-foreground">Antes de usar estos resultados.</strong> Son lugares para revisar, no ubicaciones aprobadas: superar la revisión preliminar no significa que sean viables, ninguno tiene autorización y las verificaciones de campo siguen pendientes. Estar entre los {{ store.topK }} primeros de Lima es un puesto en el orden provincial, no una aprobación. El paquete V1.0.0 no trae nombres de lugar.
          <button
            type="button"
            class="min-h-10 lg:min-h-0 text-primary underline underline-offset-2 print:hidden"
            @click="ayuda = 'fuentes'"
          >
            Fuentes y limitaciones
          </button>
        </p>
      </div>
    </div>

    <div
      v-if="aviso"
      class="fixed left-1/2 bottom-6 -translate-x-1/2 bg-gray-800 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg z-[2100] print:hidden"
      role="status"
      data-prueba="toast"
    >
      {{ aviso }}
    </div>
    <AyudaFuentesV1
      v-if="ayuda"
      :seccion="ayuda"
      @cambiar="s => (ayuda = s)"
      @cerrar="ayuda = null"
    />
  </div>
</template>

<style>
/* Solo mientras Reportes está montado: la impresión ocupa varias páginas (App.vue fija h-screen y overflow). */
@media print {
  html, body, #app, #app > div, #app main { height: auto !important; overflow: visible !important; display: block !important; }
  [data-prueba="reportes-v1"] h1 { font-size: 16px; }
  [data-prueba="kpis"] > * { break-inside: avoid; padding: 8px !important; }
  .impresion-seccion h2 { break-after: avoid; margin-bottom: 2px; }
  .impresion-tabla { width: 100%; border-collapse: collapse; font-size: 9px; line-height: 1.25; margin-top: 4px; }
  .impresion-tabla thead { display: table-header-group; }
  .impresion-tabla tr { break-inside: avoid; }
  .impresion-tabla th { text-align: left; font-weight: 600; color: #525252; border-bottom: 1px solid #a3a3a3; padding: 2px 4px; }
  .impresion-tabla td { border-bottom: 1px solid #e5e5e5; padding: 1.5px 4px; vertical-align: top; }
  .impresion-tabla .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
}
</style>
