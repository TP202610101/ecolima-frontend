<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { MapPin, CheckCircle2, TrendingUp, Navigation, Copy, Printer, FileDown, AlertTriangle, RefreshCw, ArrowUp, ArrowDown, ArrowUpDown } from '@lucide/vue'
import KpiCard from '@/shared/components/KpiCard.vue'
import AvisoV1 from '../components/AvisoV1.vue'
import PaginadorV1 from '../components/PaginadorV1.vue'
import AyudaFuentesV1 from '../components/AyudaFuentesV1.vue'
import { useExploracionV1Store } from '../stores/useExploracionV1Store'
import { useAuthStore } from '@/domains/auth/stores/useAuthStore'
import {
  CLASE_LARGA, COLUMNA_TEXTO, ORDEN_INICIAL, PROVINCIA, T, aCsv, fechaLarga, filasCsv, fmtDec, fmtDist,
  fmtEntero, fuenteExistente, nombreAmbito, nombreArchivoCsv, nombreDistrito, nombreExistente, numeroDe, ordenarTabla,
  paginar, plural, textoResumen, type ColumnaTabla, type MetaExportacion,
} from '../utils/lecturaV1'

// Reportes V1 (prototipo V5): mismo distrito y filtros que Análisis V1. Copiar resumen, Imprimir y Descargar CSV
// exportan solo el ámbito elegido aquí (un distrito, o la provincia si se elige «Provincia de Lima»): todas las filas
// filtradas y solo los puntos existentes de ese ámbito. La tabla comparativa de distritos no entra en las exportaciones.
const store = useExploracionV1Store()
const auth = useAuthStore()
const router = useRouter()
const ayuda = ref<'orden' | 'fuentes' | null>(null)
const imprimiendo = ref(false)
const aviso = ref<string | null>(null)
let temporizador: ReturnType<typeof setTimeout> | null = null

function cargar() { store.inicializar(String(auth.user?.user_id ?? auth.user?.email ?? 'anonimo')) }

const enLima = computed(() => store.ambito === PROVINCIA)
const amb = computed(() => nombreAmbito(store.ambito))
const v = computed(() => store.version)
const ordenada = computed(() => ordenarTabla(store.seleccion, store.repOrden, store.ambito))
const pgTabla = computed(() => paginar(ordenada.value, store.repPag, imprimiendo.value ? Infinity : store.repPorPag))
const otrosDistritos = computed(() => store.distritosConDatos.filter(u => u !== store.miDistrito).sort((a, b) => nombreDistrito(a).localeCompare(nombreDistrito(b), 'es')))
const filasDistritos = computed(() => store.distritosConDatos
  .flatMap(u => { const c = store.conteosDistrito.get(u); return c ? [{ u, ...c, nombre: nombreDistrito(u) }] : [] })
  .sort((a, b) => b.n_top_k - a.n_top_k || a.nombre.localeCompare(b.nombre, 'es')))
const pgDistritos = computed(() => {
  if (store.distPag == null) {
    const i = filasDistritos.value.findIndex(r => r.u === store.ambito)
    return paginar(filasDistritos.value, i >= 0 ? Math.floor(i / store.distPorPag) + 1 : 1, imprimiendo.value ? Infinity : store.distPorPag)
  }
  return paginar(filasDistritos.value, store.distPag, imprimiendo.value ? Infinity : store.distPorPag)
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

function cambiarAmbito(ev: Event) { store.cambiarAmbito((ev.target as HTMLSelectElement).value) }
function irAlLugar(id: string) { store.elegir(id); router.push({ name: 'analisis-v1' }) }
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
// Al imprimir se incluyen todas las filas de la selección (no solo la página) y la lista de puntos existentes.
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
    class="flex flex-col h-[calc(100vh-56px)] print:h-auto"
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
          class="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-md"
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
          <div class="flex gap-2 flex-wrap print:hidden">
            <button
              type="button"
              class="flex items-center gap-2 px-4 py-2 border border-border rounded-md text-sm bg-white hover:bg-secondary"
              data-prueba="copiar-resumen"
              @click="copiarResumen"
            >
              <Copy class="w-4 h-4" />Copiar resumen
            </button>
            <button
              type="button"
              class="flex items-center gap-2 px-4 py-2 border border-border rounded-md text-sm bg-white hover:bg-secondary"
              data-prueba="imprimir"
              @click="imprimir"
            >
              <Printer class="w-4 h-4" />Imprimir
            </button>
            <button
              type="button"
              class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary-hover disabled:opacity-50"
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
          <select
            id="v1-rep-distrito"
            :value="store.ambito"
            class="border border-border rounded-md px-2 py-1.5 text-sm bg-white min-w-[260px]"
            data-prueba="selector-reporte"
            @change="cambiarAmbito"
          >
            <option
              v-if="store.miDistrito"
              :value="store.miDistrito"
            >
              {{ nombreDistrito(store.miDistrito) }} (mi distrito)
            </option>
            <optgroup :label="`${store.miDistrito ? 'Otros distritos' : 'Distritos'} con lugares evaluados (${otrosDistritos.length})`">
              <option
                v-for="u in otrosDistritos"
                :key="u"
                :value="u"
              >
                {{ nombreDistrito(u) }}
              </option>
            </optgroup>
            <optgroup label="Vista general">
              <option :value="PROVINCIA">
                Provincia de Lima (43 distritos)
              </option>
            </optgroup>
          </select>
          <span
            v-if="store.esMiDistrito"
            class="text-[11px] font-medium rounded-full px-2 py-0.5 bg-green-100 text-green-800"
          >Mi distrito</span>
          <span
            v-else-if="store.miDistrito"
            class="text-[11px] font-medium rounded-full px-2 py-0.5 bg-blue-100 text-blue-800"
          >Explorando</span>
          <button
            v-if="store.miDistrito && !store.esMiDistrito"
            type="button"
            class="text-sm text-primary underline underline-offset-2"
            @click="store.cambiarAmbito(store.miDistrito)"
          >
            Volver a mi distrito ({{ nombreDistrito(store.miDistrito) }})
          </button>
          <p
            class="flex-1 min-w-[240px] text-[13px] text-muted-foreground sm:text-right"
            data-prueba="texto-filtros"
          >
            <template v-if="store.textoFiltros.length">
              Filtros de Análisis aplicados: {{ store.textoFiltros.join('; ') }}.
              <button
                type="button"
                class="text-primary underline underline-offset-2"
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

        <!-- Indicadores del ámbito -->
        <div
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4"
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
          class="bg-white rounded-lg border border-border overflow-hidden"
          :class="enLima ? '' : 'print:hidden'"
          data-prueba="caja-distritos"
        >
          <div class="px-6 py-4 border-b border-border">
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
              class="w-full flex items-center gap-3 px-6 py-2.5 border-b border-border text-left text-sm hover:bg-secondary"
              :class="r.u === store.ambito ? 'bg-accent shadow-[inset_2px_0_0_#16a34a]' : 'bg-white'"
              :aria-current="r.u === store.ambito"
              :data-distrito="r.u"
              @click="store.cambiarAmbito(r.u)"
            >
              <span
                class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                :class="r.n_top_k ? 'bg-primary' : 'bg-gray-300'"
              />
              <span class="flex-1 min-w-0">{{ r.nombre }}<span
                v-if="r.u === store.miDistrito"
                class="ml-2 text-[11px] font-medium rounded-full px-2 py-0.5 bg-green-100 text-green-800"
              >Mi distrito</span></span>
              <span class="text-xs text-muted-foreground whitespace-nowrap">{{ fmtEntero(r.n_sitios - r.n_punto_existente) }} evaluados · {{ plural(r.n_punto_existente, 'punto registrado', 'puntos registrados') }}</span>
              <span
                class="w-28 text-right tabular-nums whitespace-nowrap"
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
          class="bg-white rounded-lg border border-border overflow-hidden"
          data-prueba="tabla-orden"
        >
          <div class="px-6 py-4 border-b border-border flex flex-wrap items-end justify-between gap-3">
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
              class="text-xs text-primary underline underline-offset-2 print:hidden"
              data-prueba="orden-original"
              @click="store.repOrden = { ...ORDEN_INICIAL }; store.repPag = 1"
            >
              Volver al orden de revisión
            </button>
          </div>
          <div
            v-if="store.seleccion.length"
            class="overflow-x-auto"
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
                      class="inline-flex items-center gap-1"
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

        <!-- Puntos existentes del ámbito: solo en la impresión -->
        <div
          class="hidden print:block bg-white rounded-lg border border-border overflow-hidden"
          data-prueba="impresion-existentes"
        >
          <div class="px-6 py-3 border-b border-border">
            <h2 class="text-base font-semibold">
              {{ T.exist }} en {{ amb }}
            </h2>
            <p class="text-xs text-muted-foreground">
              {{ plural(store.existentesAmbito.length, 'punto', 'puntos') }} según OpenStreetMap y el plan de San Isidro. Puede haber otros sin registrar; no se afirma quién los administra.
            </p>
          </div>
          <table class="w-full text-xs">
            <tbody>
              <tr
                v-for="e in store.existentesAmbito"
                :key="e.id"
                class="border-b border-border"
              >
                <td class="px-4 py-1.5">
                  {{ nombreExistente(e.id) }}
                </td>
                <td
                  v-if="enLima"
                  class="px-4 py-1.5"
                >
                  {{ nombreDistrito(e.ubigeo) }}
                </td>
                <td class="px-4 py-1.5">
                  {{ fuenteExistente(e.id) }}
                </td>
                <td class="px-4 py-1.5 text-right tabular-nums">
                  {{ fmtDec(e.lat, 5) }}, {{ fmtDec(e.lon, 5) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="bg-white border border-border border-l-[3px] border-l-amber-600 rounded-lg px-5 py-4 text-[13px] text-neutral-700">
          <strong class="text-foreground">Antes de usar estos resultados.</strong> Son lugares para revisar, no ubicaciones aprobadas: superar la revisión preliminar no significa que sean viables, ninguno tiene autorización y las verificaciones de campo siguen pendientes. Estar entre los {{ store.topK }} primeros de Lima es un puesto en el orden provincial, no una aprobación. El paquete V1.0.0 no trae nombres de lugar.
          <button
            type="button"
            class="text-primary underline underline-offset-2 print:hidden"
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
/* Solo mientras Reportes V1 está montado: la impresión ocupa varias páginas (App.vue fija h-screen y overflow). */
@media print {
  html, body, #app, #app > div, #app main { height: auto !important; overflow: visible !important; display: block !important; }
  [data-prueba="reportes-v1"] tr { break-inside: avoid; }
}
</style>
