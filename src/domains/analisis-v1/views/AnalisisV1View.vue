<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { AlertTriangle, ArrowLeft, List, MapPin, RefreshCw } from '@lucide/vue'
import AvisoV1 from '../components/AvisoV1.vue'
import FiltrosListaV1 from '../components/FiltrosListaV1.vue'
import MapaExploracionV1 from '../components/MapaExploracionV1.vue'
import PanelLugarV1 from '../components/PanelLugarV1.vue'
import AyudaFuentesV1 from '../components/AyudaFuentesV1.vue'
import { useExploracionV1Store } from '../stores/useExploracionV1Store'
import { useAuthStore } from '@/domains/auth/stores/useAuthStore'

// Análisis V1 con la experiencia del prototipo V5: filtros y lista paginada a la izquierda, mapa numerado al centro
// y detalle resumido a la derecha (como AnalysisView del original). Solo usa /api/v1/analisis/*; la vista demo
// /analisis no cambia. El estado (distrito, filtros, página, lugar elegido) se comparte con Reportes V1.
const store = useExploracionV1Store()
const auth = useAuthStore()
const mapa = ref<InstanceType<typeof MapaExploracionV1>>()
const ayuda = ref<'orden' | 'fuentes' | 'modelo' | null>(null)
// En pantallas angostas (< lg): pestañas Lista / Mapa (un solo mapa, que solo se oculta) y el detalle del lugar
// a pantalla completa por encima, con «Volver». En escritorio, las tres columnas de siempre.
const panel = ref<'lista' | 'mapa'>('mapa')
const detalleMovil = ref(false)
const angosta = () => window.innerWidth < 1024

function cargar() { store.inicializar(String(auth.user?.user_id ?? auth.user?.email ?? 'anonimo')) }

watch(() => store.selId, id => { detalleMovil.value = !!id && angosta() })
// Elegir otra vez el mismo lugar (lista o mapa) vuelve a cargar su detalle: también reabre la vista a pantalla completa.
watch(() => store.cargandoDetalle, c => { if (c && store.selId && angosta()) detalleMovil.value = true })
async function volverDelDetalle() {
  detalleMovil.value = false
  await nextTick()
  if (panel.value === 'mapa') mapa.value?.redimensionar()
}
watch(panel, async p => { if (p === 'mapa') { await nextTick(); mapa.value?.redimensionar() } })
// Al cerrar el aviso el mapa gana alto: hay que avisarle a MapLibre.
watch(() => store.avisoCerrado, async () => { await nextTick(); mapa.value?.redimensionar() })

onMounted(cargar)
</script>

<template>
  <div
    class="flex flex-col h-[calc(100vh-56px)]"
    data-prueba="analisis-v1"
  >
    <AvisoV1 @ayuda="s => (ayuda = s)" />

    <div
      v-if="store.cargando"
      class="flex-1 flex flex-col items-center justify-center gap-2"
    >
      <div class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p class="text-sm text-muted-foreground">
        Cargando los resultados…
      </p>
    </div>
    <div
      v-else-if="store.error"
      class="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6"
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
      class="flex-1 flex items-center justify-center text-sm text-muted-foreground px-6 text-center"
    >
      Todavía no hay resultados V1 cargados en el servidor.
    </p>

    <template v-else-if="store.cargado">
      <!-- Pestañas en pantallas angostas -->
      <nav
        class="lg:hidden flex border-b border-border bg-white flex-shrink-0"
        aria-label="Paneles"
      >
        <button
          v-for="t in ([['lista', 'Lista', List], ['mapa', 'Mapa', MapPin]] as const)"
          :key="t[0]"
          type="button"
          class="flex-1 flex items-center justify-center gap-1.5 min-h-11 text-sm font-medium border-b-2"
          :class="panel === t[0] ? 'text-primary border-primary' : 'text-muted-foreground border-transparent'"
          :aria-current="panel === t[0]"
          :data-panel="t[0]"
          @click="panel = t[0]"
        >
          <component
            :is="t[2]"
            class="w-4 h-4"
          />{{ t[1] }}
        </button>
      </nav>

      <div class="flex-1 min-h-0 flex">
        <div
          class="w-full lg:w-72 xl:w-72 flex-shrink-0 lg:border-r border-border min-h-0"
          :class="panel === 'lista' ? 'flex' : 'hidden lg:flex'"
        >
          <FiltrosListaV1
            class="w-full"
            @ayuda="s => (ayuda = s)"
          />
        </div>
        <div
          class="flex-1 min-w-0 min-h-0"
          :class="panel === 'mapa' ? 'block' : 'hidden lg:block'"
        >
          <MapaExploracionV1 ref="mapa" />
        </div>
        <!-- Detalle: columna derecha en escritorio; en pantallas angostas, a pantalla completa bajo la barra superior -->
        <div
          class="lg:w-[352px] xl:w-96 flex-shrink-0 lg:border-l border-border min-h-0 bg-white flex-col"
          :class="detalleMovil ? 'flex max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:top-14 max-lg:z-[1500]' : 'hidden lg:flex'"
          data-prueba="columna-detalle"
        >
          <div class="lg:hidden flex items-center border-b border-border flex-shrink-0">
            <button
              type="button"
              class="flex items-center gap-1.5 min-h-11 px-3 text-sm font-medium text-primary"
              data-prueba="volver-detalle"
              @click="volverDelDetalle"
            >
              <ArrowLeft class="w-4 h-4" />Volver {{ panel === 'mapa' ? 'al mapa' : 'a la lista' }}
            </button>
          </div>
          <PanelLugarV1
            class="w-full flex-1 min-h-0"
            @ayuda="s => (ayuda = s)"
          />
        </div>
      </div>
    </template>

    <AyudaFuentesV1
      v-if="ayuda"
      :seccion="ayuda"
      @cambiar="s => (ayuda = s)"
      @cerrar="ayuda = null"
    />
  </div>
</template>
