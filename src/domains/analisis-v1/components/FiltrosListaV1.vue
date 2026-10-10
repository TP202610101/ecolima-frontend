<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { Filter, MapPin, Search, X } from '@lucide/vue'
import { useExploracionV1Store } from '../stores/useExploracionV1Store'
import PaginadorV1 from './PaginadorV1.vue'
import {
  CLASES, CLASE_CORTA, CLASE_LARGA, CLASE_PLURAL, PROVINCIA, T, enAmbito, fmtDist, fmtEntero, nombreDistrito,
  numeroDe, ord, type Grupo,
} from '../utils/lecturaV1'
import type { ClaseOportunidad } from '../entities/AnalisisV1'

// Columna izquierda (como MapSidebar del original): distrito, filtros, buscador y lista paginada.
// La lista usa el ícono verde de ubicación del original; el número de orden es un dato secundario.
const store = useExploracionV1Store()
const lista = ref<HTMLElement>()

const otrosDistritos = computed(() => store.distritosConDatos
  .filter(u => u !== store.miDistrito)
  .sort((a, b) => nombreDistrito(a).localeCompare(nombreDistrito(b), 'es')))
const enLima = computed(() => store.ambito === PROVINCIA)
const delAmbito = computed(() => store.lugaresAmbito)
const cuentaGrupo = (g: Grupo) => delAmbito.value.filter(l => l.grupo === g).length
const cuentaTipo = (c: ClaseOportunidad) => delAmbito.value.filter(l => l.clase === c).length
const totalOrden = computed(() => (enLima.value ? store.nAptos : store.aptosDistrito(store.ambito)))
const nada = computed(() => !store.filtros.tipos.length || !Object.values(store.filtros.grupos).some(Boolean))
const grupos = computed(() => [
  { k: 'top' as const, t: T.topCorto(store.topK) },
  { k: 'cand' as const, t: T.cand },
  { k: 'excl' as const, t: 'Descartados en revisión' },
])

function alternarTipo(c: ClaseOportunidad) {
  const tipos = store.filtros.tipos.includes(c) ? store.filtros.tipos.filter(x => x !== c) : [...store.filtros.tipos, c]
  store.setFiltros({ tipos })
}
function alternarGrupo(k: 'top' | 'cand' | 'excl', v: boolean) { store.setFiltros({ grupos: { ...store.filtros.grupos, [k]: v } }) }
function buscar(ev: Event) { store.setFiltros({ buscar: (ev.target as HTMLInputElement).value }) }
function cambiarDistrito(ev: Event) { store.cambiarAmbito((ev.target as HTMLSelectElement).value) }

async function mover(delta: number) {
  store.cambiarPagina(delta)
  await nextTick()
  lista.value?.scrollIntoView({ block: 'start' })
}
// Al elegir un lugar desde el mapa la lista salta a su página; se lleva a la vista.
watch(() => store.selId, async id => {
  if (!id) return
  await nextTick()
  lista.value?.querySelector(`[data-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'nearest' })
})
</script>

<template>
  <aside
    class="flex flex-col h-full min-h-0 bg-white overflow-y-auto"
    aria-label="Filtros y lista de lugares"
    data-prueba="columna-izquierda"
  >
    <div class="flex items-center gap-2 px-4 py-3 border-b border-border">
      <Filter class="w-4 h-4 text-muted-foreground" />
      <h2 class="text-sm font-semibold flex-1">
        Filtros
      </h2>
      <button
        type="button"
        class="text-xs text-primary underline underline-offset-2 disabled:text-muted-foreground disabled:no-underline disabled:cursor-default"
        :disabled="!store.hayFiltros && store.capaExistentes"
        data-prueba="restablecer"
        @click="store.restablecerFiltros()"
      >
        Restablecer filtros
      </button>
    </div>

    <div class="px-4 py-3 border-b border-border flex flex-col gap-3">
      <div class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between gap-2">
          <label
            for="v1-distrito"
            class="text-xs font-medium text-muted-foreground"
          >Distrito</label>
          <span
            v-if="store.esMiDistrito"
            class="inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5 bg-green-100 text-green-800"
            data-prueba="insignia"
          ><span class="w-1.5 h-1.5 rounded-full bg-current" />Mi distrito</span>
          <span
            v-else-if="store.miDistrito"
            class="inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5 bg-blue-100 text-blue-800"
            data-prueba="insignia"
          ><span class="w-1.5 h-1.5 rounded-full bg-current" />Explorando</span>
        </div>
        <select
          id="v1-distrito"
          :value="store.ambito"
          class="w-full border border-border rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          data-prueba="selector-distrito"
          @change="cambiarDistrito"
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
        <p
          v-if="!store.miDistrito"
          class="text-xs text-muted-foreground"
          data-prueba="sin-distrito-cuenta"
        >
          Tu cuenta no tiene un distrito asociado.
          <button
            v-if="!enLima"
            type="button"
            class="text-primary underline underline-offset-2"
            data-prueba="fijar-mi-distrito"
            @click="store.fijarMiDistrito(store.ambito)"
          >
            Usar {{ nombreDistrito(store.ambito) }} como mi distrito
          </button>
          <span v-else>Elige uno en la lista para empezar.</span>
        </p>
        <p
          v-else-if="!store.esMiDistrito"
          class="text-xs text-muted-foreground"
        >
          Tu distrito: {{ nombreDistrito(store.miDistrito) }}.
          <button
            type="button"
            class="text-primary underline underline-offset-2"
            data-prueba="volver-mi-distrito"
            @click="store.cambiarAmbito(store.miDistrito!)"
          >
            Volver a mi distrito
          </button>
        </p>
      </div>

      <fieldset class="flex flex-col gap-1.5">
        <legend class="text-xs font-medium text-muted-foreground mb-1.5">
          Mostrar
        </legend>
        <label
          v-for="g in grupos"
          :key="g.k"
          class="flex items-center gap-2 text-[13px] cursor-pointer"
        >
          <input
            type="checkbox"
            class="accent-primary w-3.5 h-3.5"
            :checked="store.filtros.grupos[g.k]"
            :data-grupo="g.k"
            @change="alternarGrupo(g.k, ($event.target as HTMLInputElement).checked)"
          >
          <span
            class="w-2.5 h-2.5 rounded-full flex-shrink-0"
            :class="{
              'bg-primary ring-1 ring-offset-1 ring-primary': g.k === 'top',
              'bg-white border-2 border-gray-500': g.k === 'cand',
              'bg-gray-300 border border-gray-500': g.k === 'excl',
            }"
          />
          <span class="flex-1">{{ g.t }} <span class="text-xs text-muted-foreground tabular-nums">{{ fmtEntero(cuentaGrupo(g.k)) }}</span></span>
        </label>
        <label
          class="flex items-center gap-2 text-[13px] cursor-pointer mt-1 pt-1.5 border-t border-dashed border-border"
          title="Capa del mapa: no cambia la lista"
        >
          <input
            v-model="store.capaExistentes"
            type="checkbox"
            class="accent-primary w-3.5 h-3.5"
            data-capa="existentes"
          >
          <span class="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-blue-500 ring-1 ring-white" />
          <span class="flex-1">Puntos existentes registrados <span class="text-xs text-muted-foreground tabular-nums">{{ fmtEntero(store.existentesAmbito.length) }}</span></span>
        </label>
      </fieldset>

      <fieldset>
        <legend class="text-xs font-medium text-muted-foreground mb-1.5">
          Tipo de lugar
        </legend>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="c in CLASES"
            :key="c"
            type="button"
            :aria-pressed="store.filtros.tipos.includes(c)"
            :data-tipo="c"
            class="rounded-full border px-2.5 py-0.5 text-xs"
            :class="store.filtros.tipos.includes(c) ? 'bg-accent border-green-200 text-green-800 font-medium' : 'border-border text-muted-foreground line-through'"
            @click="alternarTipo(c)"
          >
            {{ CLASE_PLURAL[c] }} <span class="tabular-nums opacity-80">{{ fmtEntero(cuentaTipo(c)) }}</span>
          </button>
        </div>
      </fieldset>
    </div>

    <div class="px-4 py-2 border-b border-border flex flex-col gap-2 sticky top-0 bg-white z-10">
      <p
        class="text-xs text-muted-foreground"
        aria-live="polite"
        data-prueba="contador"
      >
        <template v-if="store.hayFiltros">
          Mostrando <b class="text-foreground">{{ fmtEntero(store.seleccion.length) }}</b> de {{ fmtEntero(delAmbito.length) }} lugares
        </template>
        <template v-else>
          <b class="text-foreground">{{ fmtEntero(store.seleccion.length) }}</b> lugares
        </template>
        {{ enLima ? 'en la provincia de Lima' : `en ${nombreDistrito(store.ambito)}` }}{{ store.hayFiltros ? ' (con filtros)' : '' }}
      </p>
      <p class="text-[11.5px] leading-snug text-muted-foreground">
        <b class="text-foreground font-semibold">1.º = revisar primero</b>{{ enLima ? ' (puesto en toda Lima)' : ` en ${nombreDistrito(store.ambito)}` }}. El verde marca ubicaciones, no aprobación.
      </p>
      <label class="flex items-center gap-1.5 border border-border rounded-md px-2 text-muted-foreground focus-within:border-primary">
        <span class="sr-only">Buscar por tipo de lugar o código</span>
        <Search class="w-3.5 h-3.5" />
        <input
          type="search"
          :value="store.filtros.buscar"
          placeholder="Buscar por tipo o código"
          autocomplete="off"
          class="w-full border-0 outline-none py-1.5 text-[13px] bg-transparent text-foreground"
          data-prueba="buscar"
          @input="buscar"
        >
      </label>
    </div>

    <ol
      ref="lista"
      class="flex-1"
      aria-label="Orden de revisión"
      data-prueba="lista"
    >
      <li
        v-if="!store.seleccion.length"
        class="px-4 py-6 text-center text-sm text-muted-foreground flex flex-col items-center gap-2.5"
        data-prueba="lista-vacia"
      >
        <strong class="font-medium text-foreground">Ningún lugar coincide con estos filtros{{ enLima ? '' : ` en ${nombreDistrito(store.ambito)}` }}.</strong>
        <span>{{ nada ? 'No hay ningún tipo de lugar o grupo marcado.' : `Filtros activos: ${store.textoFiltros.join('; ')}.` }}</span>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 border border-border rounded-md px-3 py-1 text-[13px] text-foreground hover:bg-secondary"
          @click="store.restablecerFiltros()"
        >
          <X class="w-3.5 h-3.5" />Restablecer filtros
        </button>
      </li>
      <template
        v-for="(l, i) in store.paginaLista.items"
        :key="l.id"
      >
        <li
          v-if="l.grupo === 'excl' && (i === 0 || store.paginaLista.items[i - 1].grupo !== 'excl')"
          class="px-4 pt-2 pb-1.5 text-xs text-muted-foreground bg-secondary border-b border-border"
        >
          {{ T.excl }}
        </li>
        <li>
          <button
            type="button"
            class="relative w-full flex gap-2.5 items-start text-left px-3 py-1.5 bg-white border-b border-border border-l-2 hover:bg-secondary transition-colors"
            :class="l.id === store.selId ? 'border-l-primary bg-accent' : 'border-l-transparent'"
            :aria-current="l.id === store.selId"
            :data-id="l.id"
            data-prueba="item"
            @click="store.elegir(l.id)"
          >
            <MapPin
              class="w-4 h-4 mt-0.5 flex-shrink-0"
              :class="l.grupo === 'excl' ? 'text-gray-400' : 'text-primary'"
              aria-hidden="true"
              data-prueba="pin"
            />
            <span class="flex-1 min-w-0 flex flex-col gap-px">
              <span class="flex items-baseline gap-2 min-w-0">
                <span
                  class="flex-1 min-w-0 truncate text-sm font-medium"
                  :title="CLASE_LARGA[l.clase]"
                >{{ CLASE_CORTA[l.clase] }}</span>
                <span
                  v-if="l.rango != null"
                  class="flex-shrink-0 text-[13px] font-semibold text-neutral-700 tabular-nums whitespace-nowrap"
                  data-prueba="orden"
                ><span class="sr-only">{{ enLima ? 'Puesto' : 'Orden' }} </span>{{ ord(numeroDe(l, store.ambito)!) }}<small class="text-[11px] font-normal text-muted-foreground ml-0.5">de {{ fmtEntero(totalOrden) }}</small></span>
                <span
                  v-else
                  class="flex-shrink-0 text-[11px] text-muted-foreground"
                  data-prueba="orden"
                >Sin orden</span>
              </span>
              <span class="text-xs text-muted-foreground truncate">
                {{ enLima || !enAmbito(l, store.ambito) ? `${nombreDistrito(l.ubigeo)} · ` : '' }}{{ l.grupo === 'excl' ? `${CLASE_CORTA[l.clase]} con un punto registrado a ${fmtDist(l.dist)}` : `A ${fmtDist(l.dist)} del punto registrado más cercano` }}
              </span>
              <span
                v-if="numeroDe(l, store.ambito) === 1 || l.top"
                class="flex flex-wrap gap-1 mt-0.5"
              >
                <span
                  v-if="numeroDe(l, store.ambito) === 1"
                  class="text-[11px] font-medium rounded-full px-1.5 bg-white text-green-900 ring-1 ring-inset ring-primary"
                >{{ T.primero }}</span>
                <span
                  v-if="l.top"
                  class="text-[11px] font-medium rounded-full px-1.5 bg-green-100 text-green-800"
                  data-prueba="tag-top"
                >{{ T.topCorto(store.topK) }}</span>
              </span>
            </span>
          </button>
        </li>
      </template>
    </ol>

    <div
      v-if="store.seleccion.length"
      class="sticky bottom-0 z-10 bg-white border-t border-border px-3 pt-2 pb-2.5 mt-auto"
      data-prueba="pie-lista"
    >
      <PaginadorV1
        :pagina="store.paginaLista"
        :por-pagina="store.porPag"
        que="lugares"
        compacto
        @mover="mover"
        @por-pagina="store.cambiarPorPagina"
      />
    </div>
  </aside>
</template>
