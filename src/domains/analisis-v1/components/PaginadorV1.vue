<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { fmtEntero, POR_PAGINA, type Pagina } from '../utils/lecturaV1'

// Paginador común: «Página X de Y», rango, Anterior/Siguiente y tamaño de página (10, 20 o 50).
const props = withDefaults(defineProps<{ pagina: Pagina<unknown>; porPagina: number; que: string; compacto?: boolean }>(), { compacto: false })
const emit = defineEmits<{ mover: [delta: number]; 'por-pagina': [valor: number] }>()

function cambiar(ev: Event) { emit('por-pagina', Number((ev.target as HTMLSelectElement).value)) }
const btn = 'inline-flex items-center gap-0.5 rounded-md border border-border bg-white text-xs text-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed'
</script>

<template>
  <nav
    :aria-label="`Páginas de ${props.que}`"
    data-prueba="paginador"
    :class="props.compacto ? 'flex flex-col gap-1.5' : 'flex flex-wrap items-center justify-between gap-2'"
  >
    <div class="flex items-center justify-between gap-2">
      <p
        class="text-xs text-muted-foreground whitespace-nowrap tabular-nums"
        aria-live="polite"
        data-prueba="pagina-info"
      >
        Página <b class="text-foreground font-semibold">{{ props.pagina.p }}</b> de <b class="text-foreground font-semibold">{{ props.pagina.total }}</b>
        <span v-if="!props.compacto"> · {{ fmtEntero(props.pagina.desde + 1) }}–{{ fmtEntero(props.pagina.hasta) }} de {{ fmtEntero(props.pagina.n) }}</span>
      </p>
      <label
        v-if="props.compacto"
        class="text-xs"
      >
        <span class="sr-only">{{ props.que }} por página</span>
        <select
          :value="props.porPagina"
          class="border border-border rounded-md px-1.5 py-1 text-xs bg-white"
          data-prueba="por-pagina"
          @change="cambiar"
        >
          <option
            v-for="v in POR_PAGINA"
            :key="v"
            :value="v"
          >{{ v }} por página</option>
        </select>
      </label>
    </div>
    <div class="flex items-center justify-between gap-2">
      <label
        v-if="!props.compacto"
        class="text-xs"
      >
        <span class="sr-only">{{ props.que }} por página</span>
        <select
          :value="props.porPagina"
          class="border border-border rounded-md px-1.5 py-1 text-xs bg-white"
          data-prueba="por-pagina"
          @change="cambiar"
        >
          <option
            v-for="v in POR_PAGINA"
            :key="v"
            :value="v"
          >{{ v }} por página</option>
        </select>
      </label>
      <button
        type="button"
        :class="[btn, 'pl-1.5 pr-2 py-1']"
        :disabled="props.pagina.p <= 1"
        data-prueba="anterior"
        @click="emit('mover', -1)"
      >
        <ChevronLeft class="w-3.5 h-3.5" />Anterior
      </button>
      <span
        v-if="props.compacto"
        class="text-xs text-muted-foreground tabular-nums"
      >{{ fmtEntero(props.pagina.desde + 1) }}–{{ fmtEntero(props.pagina.hasta) }} de {{ fmtEntero(props.pagina.n) }}</span>
      <button
        type="button"
        :class="[btn, 'pl-2 pr-1.5 py-1']"
        :disabled="props.pagina.p >= props.pagina.total"
        data-prueba="siguiente"
        @click="emit('mover', 1)"
      >
        Siguiente<ChevronRight class="w-3.5 h-3.5" />
      </button>
    </div>
  </nav>
</template>
