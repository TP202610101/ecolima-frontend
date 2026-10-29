<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { Check, ChevronDown, Search, X } from '@lucide/vue'
import { useExploracionV1Store } from '../stores/useExploracionV1Store'
import { useCambioAmbito } from '../composables/useCambioAmbito'
import { PROVINCIA, nombreDistrito, sinAcentos } from '../utils/lecturaV1'

// Selector de ámbito (provincia o distrito) para Análisis y Reportes, en todos los tamaños.
// Reemplaza al <select> nativo, cuyo selector móvil no era confiable ni verificable. Es el mismo componente
// en móvil y escritorio: en móvil la lista es una hoja inferior; desde sm, un desplegable bajo el botón.
// Elegir usa useCambioAmbito: el botón refleja la elección al instante y gana la última.
const props = defineProps<{ id: string; dataPrueba: string }>()
const store = useExploracionV1Store()
const { elegir, valorActual } = useCambioAmbito()

interface Opcion { valor: string; nombre: string; grupo: 'provincia' | 'con' | 'sin' }

const abierto = ref(false)
const consulta = ref('')
const activo = ref(0)
const raiz = ref<HTMLElement>()
const boton = ref<HTMLButtonElement>()
const campo = ref<HTMLInputElement>()
const lista = ref<HTMLElement>()
const idLista = `${props.id}-lista`
const idOpcion = (v: string) => `${props.id}-op-${v}`

const ordenar = (us: string[]) => [...us].sort((a, b) => nombreDistrito(a).localeCompare(nombreDistrito(b), 'es'))
const etiqueta = (u: string) => (u === PROVINCIA
  ? 'Provincia de Lima (43 distritos)'
  : `${nombreDistrito(u)}${u === store.miDistrito ? ' (mi distrito)' : ''}`)
const todas = computed<Opcion[]>(() => [
  { valor: PROVINCIA, nombre: etiqueta(PROVINCIA), grupo: 'provincia' },
  ...ordenar(store.distritosConDatos).map(u => ({ valor: u, nombre: etiqueta(u), grupo: 'con' as const })),
  ...ordenar(store.distritosSinLugares).map(u => ({ valor: u, nombre: etiqueta(u), grupo: 'sin' as const })),
])
const visibles = computed(() => {
  const q = sinAcentos(consulta.value.trim())
  return q ? todas.value.filter(o => sinAcentos(o.nombre).includes(q)) : todas.value
})
const grupos = computed(() => [
  { k: 'provincia', titulo: null, opciones: visibles.value.filter(o => o.grupo === 'provincia') },
  { k: 'con', titulo: `Distritos con lugares evaluados (${store.distritosConDatos.length})`, opciones: visibles.value.filter(o => o.grupo === 'con') },
  { k: 'sin', titulo: `Sin lugares evaluados (${store.distritosSinLugares.length})`, opciones: visibles.value.filter(o => o.grupo === 'sin') },
].filter(g => g.opciones.length))
const opcionActiva = computed(() => visibles.value[activo.value] ?? null)

async function abrir(texto = '') {
  consulta.value = texto
  abierto.value = true
  const i = visibles.value.findIndex(o => o.valor === valorActual.value)
  activo.value = i >= 0 ? i : 0
  await nextTick()
  campo.value?.focus()
  mostrarActivo()
}
function cerrar(devolverFoco = true) {
  if (!abierto.value) return
  abierto.value = false
  consulta.value = ''
  if (devolverFoco) nextTick(() => boton.value?.focus())
}
function seleccionar(o: Opcion) {
  elegir(o.valor)
  cerrar()
}
function mostrarActivo() {
  const o = opcionActiva.value
  if (o) lista.value?.querySelector(`#${CSS.escape(idOpcion(o.valor))}`)?.scrollIntoView({ block: 'nearest' })
}
function mover(delta: number) {
  const n = visibles.value.length
  if (!n) return
  activo.value = (activo.value + delta + n) % n
  nextTick(mostrarActivo)
}

function teclaBoton(e: KeyboardEvent) {
  if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); abrir() }
  else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); abrir(e.key) }
}
function teclaCampo(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') { e.preventDefault(); mover(1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); mover(-1) }
  else if (e.key === 'Home') { e.preventDefault(); activo.value = 0; nextTick(mostrarActivo) }
  else if (e.key === 'End') { e.preventDefault(); activo.value = Math.max(0, visibles.value.length - 1); nextTick(mostrarActivo) }
  else if (e.key === 'Enter') { e.preventDefault(); if (opcionActiva.value) seleccionar(opcionActiva.value) }
  else if (e.key === 'Escape') { e.preventDefault(); cerrar() }
  else if (e.key === 'Tab') cerrar(false)
}
watch(consulta, () => { activo.value = 0 })

// Cierre al tocar fuera (sin robar el foco a lo que se tocó).
function fuera(e: PointerEvent) { if (raiz.value && !raiz.value.contains(e.target as Node)) cerrar(false) }
watch(abierto, a => {
  if (a) document.addEventListener('pointerdown', fuera, true)
  else document.removeEventListener('pointerdown', fuera, true)
})
onBeforeUnmount(() => document.removeEventListener('pointerdown', fuera, true))
</script>

<template>
  <div
    ref="raiz"
    class="relative"
  >
    <button
      :id="props.id"
      ref="boton"
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      :aria-expanded="abierto"
      :aria-controls="idLista"
      :data-prueba="props.dataPrueba"
      :data-valor="valorActual"
      class="w-full min-h-11 flex items-center justify-between gap-2 border border-border rounded-md px-3 py-1.5 text-sm text-left bg-white hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
      @click="abierto ? cerrar() : abrir()"
      @keydown="teclaBoton"
    >
      <span class="flex-1 min-w-0 break-words">{{ etiqueta(valorActual) }}</span>
      <ChevronDown
        class="w-4 h-4 flex-shrink-0 text-muted-foreground transition-transform"
        :class="abierto ? 'rotate-180' : ''"
      />
    </button>

    <template v-if="abierto">
      <!-- Fondo de la hoja inferior (solo móvil) -->
      <div
        class="fixed inset-0 z-[1990] bg-black/30 sm:hidden"
        aria-hidden="true"
        data-prueba="fondo-selector"
        @click="cerrar(false)"
      />
      <div
        class="fixed inset-x-0 bottom-0 z-[2000] max-h-[70vh] flex flex-col bg-white rounded-t-xl shadow-xl pb-[env(safe-area-inset-bottom)] sm:absolute sm:inset-x-0 sm:bottom-auto sm:top-full sm:mt-1 sm:max-h-96 sm:min-w-[16rem] sm:rounded-lg sm:border sm:border-border sm:pb-0"
        :data-prueba="`${props.dataPrueba}-lista`"
      >
        <!-- Cabecera fija: búsqueda y cierre -->
        <div class="flex-shrink-0 flex items-center gap-2 p-2 border-b border-border">
          <label class="flex-1 min-w-0 flex items-center gap-2 min-h-11 border border-border rounded-md px-2 focus-within:border-primary">
            <Search class="w-4 h-4 flex-shrink-0 text-muted-foreground" />
            <span class="sr-only">Buscar distrito</span>
            <input
              ref="campo"
              v-model="consulta"
              type="text"
              autocomplete="off"
              placeholder="Buscar distrito"
              class="w-full min-w-0 border-0 outline-none bg-transparent text-sm"
              role="searchbox"
              :aria-controls="idLista"
              :aria-activedescendant="opcionActiva ? idOpcion(opcionActiva.valor) : undefined"
              :data-prueba="`${props.dataPrueba}-buscar`"
              @keydown="teclaCampo"
            >
          </label>
          <button
            type="button"
            class="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-md hover:bg-secondary"
            aria-label="Cerrar lista de distritos"
            @click="cerrar()"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <ul
          :id="idLista"
          ref="lista"
          role="listbox"
          aria-label="Ámbito del reporte"
          class="flex-1 min-h-0 overflow-y-auto overscroll-contain py-1"
        >
          <template
            v-for="g in grupos"
            :key="g.k"
          >
            <li
              v-if="g.titulo"
              role="presentation"
              class="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {{ g.titulo }}
            </li>
            <li
              v-for="o in g.opciones"
              :id="idOpcion(o.valor)"
              :key="o.valor"
              role="option"
              :aria-selected="o.valor === valorActual"
              :data-valor="o.valor"
              class="flex items-center gap-2 min-h-11 px-3 py-2 text-sm cursor-pointer break-words"
              :class="[
                opcionActiva?.valor === o.valor ? 'bg-secondary' : '',
                o.valor === valorActual ? 'font-medium text-primary' : 'text-foreground',
              ]"
              @click="seleccionar(o)"
              @pointermove="activo = visibles.indexOf(o)"
            >
              <span class="flex-1 min-w-0">{{ o.nombre }}</span>
              <Check
                v-if="o.valor === valorActual"
                class="w-4 h-4 flex-shrink-0"
              />
            </li>
          </template>
          <li
            v-if="!visibles.length"
            role="presentation"
            class="px-3 py-4 text-sm text-muted-foreground"
          >
            Ningún distrito coincide con «{{ consulta }}».
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>
