<script setup lang="ts">
import { computed } from 'vue'
import { MousePointerClick, AlertTriangle, X } from '@lucide/vue'
import { useAnalisisV1Store } from '../stores/useAnalisisV1Store'
import {
  ETIQUETA_CLASE,
  ETIQUETA_ESQUEMA,
  ETIQUETA_GRUPO_CONTRIB,
  ETIQUETA_REGLA,
  ETIQUETA_RESULTADO_REGLA,
  ETIQUETA_TAMIZAJE,
  ETIQUETA_VARIABLE,
  UNIDAD_CRITERIO,
  explicacionSinMcda,
  formatoDecimal,
  formatoEntero,
  formatoPercentil,
  formatoPorcentaje,
  formatoVariable,
} from '../utils/etiquetas'

const store = useAnalisisV1Store()
const d = computed(() => store.detalle)

const mcdaPrincipal = computed(() => {
  const principal = store.mcda?.esquema_principal ?? 'iguales'
  return d.value?.mcda.find(m => m.esquema === principal) ?? null
})
const mcdaOtros = computed(() => d.value?.mcda.filter(m => m !== mcdaPrincipal.value) ?? [])
const totalAptos = computed(() => store.version?.conteos.estado_tamizaje.apto_tamizaje ?? null)

const controlesCampo = computed(() => {
  // Los puntos existentes llegan con los controles en null: solo se cuentan los evaluables.
  const c = Object.values(d.value?.tamizaje.controles_campo ?? {}).filter(v => v != null)
  return { total: c.length, pendientes: c.filter(v => v === 'pendiente_campo').length }
})

const reglas = computed(() =>
  Object.entries(d.value?.tamizaje.reglas ?? {}).filter(([, v]) => v != null) as Array<[string, string]>,
)

const contribuciones = computed(() => {
  const c = d.value?.propension.contribuciones_logit ?? {}
  const filas = Object.entries(c).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
  const max = Math.max(0.0001, ...filas.map(([, v]) => Math.abs(v)))
  return filas.map(([k, v]) => ({ grupo: k, valor: v, ancho: (Math.abs(v) / max) * 50 }))
})

const CLASE_ESTADO: Record<string, string> = {
  apto_tamizaje: 'bg-emerald-100 text-emerald-800',
  excluido_tamizaje: 'bg-orange-100 text-orange-800',
  punto_existente: 'bg-blue-100 text-blue-800',
}
</script>

<template>
  <div class="h-full overflow-y-auto bg-white">
    <!-- Sin selección -->
    <div
      v-if="!store.seleccionadoId"
      class="h-full flex flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground"
    >
      <MousePointerClick class="w-8 h-8" />
      <p class="text-sm">
        Selecciona un sitio en el mapa o en la tabla para ver su tamizaje, su posición MCDA y la propensión ML.
      </p>
    </div>

    <div
      v-else-if="store.loadingDetalle"
      class="h-full flex items-center justify-center"
    >
      <div class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>

    <div
      v-else-if="store.errorDetalle"
      class="p-6 flex flex-col items-center gap-2 text-center"
    >
      <AlertTriangle class="w-6 h-6 text-red-600" />
      <p class="text-sm">
        {{ store.errorDetalle }}
      </p>
      <button
        class="px-3 py-1.5 bg-primary text-white text-xs rounded-md"
        @click="store.seleccionar(store.seleccionadoId)"
      >
        Reintentar
      </button>
    </div>

    <div
      v-else-if="d"
      class="divide-y divide-border text-sm"
    >
      <!-- Identificación -->
      <section class="p-4">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <p class="text-xs text-muted-foreground">
              Sitio
            </p>
            <p
              class="font-mono text-xs break-all text-foreground"
              data-test="sitio-id"
            >
              {{ d.sitio_id }}
            </p>
          </div>
          <button
            class="p-1 rounded hover:bg-secondary"
            aria-label="Cerrar detalle"
            @click="store.seleccionar(null)"
          >
            <X class="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <p class="mt-2 text-base font-semibold text-foreground">
          {{ d.distrito }} <span class="text-xs font-normal text-muted-foreground">({{ d.ubigeo }})</span>
        </p>
        <p class="text-muted-foreground">
          {{ ETIQUETA_CLASE[d.clase_oportunidad] ?? d.clase_oportunidad }}
        </p>
        <p class="text-xs text-muted-foreground mt-1">
          {{ formatoDecimal(d.lat, 5) }}, {{ formatoDecimal(d.lon, 5) }}
        </p>
      </section>

      <!-- Tamizaje -->
      <section class="p-4 space-y-2">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tamizaje
        </h3>
        <span
          :class="['inline-block px-2 py-0.5 rounded-full text-xs font-medium', CLASE_ESTADO[d.tamizaje.estado_tamizaje]]"
          data-test="estado-tamizaje"
        >
          {{ ETIQUETA_TAMIZAJE[d.tamizaje.estado_tamizaje] }}
        </span>
        <!-- El aviso de apto_tamizaje solo aplica a sitios que pasan el tamizaje -->
        <p
          v-if="d.tamizaje.estado_tamizaje === 'apto_tamizaje'"
          class="text-xs text-muted-foreground"
        >
          {{ d.avisos.tamizaje }}
        </p>
        <p
          v-else-if="d.tamizaje.estado_tamizaje === 'punto_existente'"
          class="text-xs text-muted-foreground"
          data-test="aviso-existente"
        >
          Punto de reciclaje registrado en fuentes secundarias (OSM o Municipalidad de San Isidro). No se evalúa con las
          reglas del tamizaje; en el modelo ML es un ejemplo de ubicación existente.
        </p>
        <ul
          v-if="reglas.length"
          class="text-xs space-y-0.5"
        >
          <li
            v-for="[regla, res] in reglas"
            :key="regla"
            class="flex justify-between gap-2"
          >
            <span>{{ ETIQUETA_REGLA[regla] ?? regla }}</span>
            <span :class="res === 'no_cumple' ? 'text-orange-700 font-medium' : 'text-muted-foreground'">
              {{ ETIQUETA_RESULTADO_REGLA[res] ?? res }}
            </span>
          </li>
        </ul>
        <p
          v-if="d.tamizaje.motivo_exclusion"
          class="text-xs text-orange-800"
        >
          Motivo de exclusión ({{ d.tamizaje.codigo_exclusion }}): {{ d.tamizaje.motivo_exclusion }}
        </p>
        <p
          v-if="d.tamizaje.dist_punto_existente_m != null"
          class="text-xs text-muted-foreground"
        >
          Punto existente más cercano a {{ formatoEntero(d.tamizaje.dist_punto_existente_m) }} m.
        </p>
        <p
          v-if="d.tamizaje.estado_tamizaje === 'apto_tamizaje' && controlesCampo.total"
          class="text-xs text-amber-800 bg-amber-50 rounded px-2 py-1"
        >
          Controles de campo C02–C09: {{ controlesCampo.pendientes }} de {{ controlesCampo.total }} pendientes de verificación.
        </p>
      </section>

      <!-- MCDA -->
      <section class="p-4 space-y-2">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Priorización MCDA
        </h3>
        <template v-if="mcdaPrincipal">
          <div
            class="grid grid-cols-2 gap-2"
            data-test="mcda"
          >
            <div class="rounded-md bg-secondary p-2">
              <p class="text-xs text-muted-foreground">
                Puntaje (pesos iguales)
              </p>
              <p class="text-lg font-semibold font-mono">
                {{ formatoDecimal(mcdaPrincipal.puntaje, 3) }}
              </p>
            </div>
            <div class="rounded-md bg-secondary p-2">
              <p class="text-xs text-muted-foreground">
                Posición
              </p>
              <p class="text-lg font-semibold">
                {{ formatoEntero(mcdaPrincipal.rango) }}
                <span class="text-xs font-normal text-muted-foreground">de {{ formatoEntero(totalAptos) }}</span>
              </p>
            </div>
          </div>
          <p class="text-xs">
            <span
              v-if="mcdaPrincipal.en_top_k"
              class="inline-block px-1.5 rounded bg-green-700 text-white"
            >En el top-{{ store.mcda?.top_k }} MCDA</span>
            <span
              v-else
              class="text-muted-foreground"
            >Fuera del top-{{ store.mcda?.top_k }} MCDA</span>
          </p>
          <p
            v-if="d.montecarlo"
            class="text-xs text-muted-foreground"
          >
            Sensibilidad a los pesos (Monte Carlo, {{ formatoEntero(store.version?.mcda.montecarlo_n) }} réplicas):
            en el top-{{ store.mcda?.top_k }} en {{ formatoPorcentaje(d.montecarlo.mc_frecuencia_top_k) }} de las réplicas;
            rango mediano {{ formatoEntero(d.montecarlo.mc_rango_mediana) }}
            (P5–P95: {{ formatoEntero(d.montecarlo.mc_rango_p05) }}–{{ formatoEntero(d.montecarlo.mc_rango_p95) }}).
          </p>

          <div
            v-if="d.criterios_mcda"
            class="space-y-1.5 pt-1"
          >
            <p class="text-xs font-medium">
              Criterios (valor normalizado 0–1)
            </p>
            <div
              v-for="(c, k) in d.criterios_mcda"
              :key="k"
              class="text-xs"
            >
              <div class="flex justify-between gap-2">
                <span :title="store.mcda?.criterios?.[k]">{{ k.replace('_', ' · ') }}</span>
                <span class="text-muted-foreground">
                  {{ formatoVariable(c.bruto, null) }} {{ UNIDAD_CRITERIO[k] ?? '' }} · {{ formatoDecimal(c.norm, 2) }}
                </span>
              </div>
              <div class="h-1.5 bg-secondary rounded">
                <div
                  class="h-1.5 bg-green-600 rounded"
                  :style="{ width: `${Math.round(c.norm * 100)}%` }"
                />
              </div>
            </div>
          </div>

          <details
            v-if="mcdaOtros.length"
            class="text-xs"
          >
            <summary class="cursor-pointer text-muted-foreground">
              Otros esquemas de pesos (sensibilidad)
            </summary>
            <ul class="mt-1 space-y-0.5">
              <li
                v-for="m in mcdaOtros"
                :key="m.esquema"
                class="flex justify-between"
              >
                <span>{{ ETIQUETA_ESQUEMA[m.esquema] ?? m.esquema }}</span>
                <span class="font-mono">{{ formatoDecimal(m.puntaje, 3) }} · rango {{ formatoEntero(m.rango) }}</span>
              </li>
            </ul>
          </details>
          <p class="text-xs text-muted-foreground">
            {{ d.avisos.mcda }}
          </p>
        </template>
        <p
          v-else
          class="text-xs text-foreground bg-secondary rounded px-2 py-1.5"
          data-test="sin-mcda"
        >
          {{ explicacionSinMcda(d.tamizaje.estado_tamizaje, d.tamizaje.motivo_exclusion) }}
        </p>
      </section>

      <!-- Propensión ML -->
      <section class="p-4 space-y-2">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Propensión ML (contexto)
        </h3>
        <p>
          <span
            class="text-lg font-semibold"
            data-test="percentil"
          >{{ formatoPercentil(d.propension.percentil_oof) }}</span>
          <span class="text-xs text-muted-foreground"> · percentil entre los {{ formatoEntero(store.version?.conteos.sitios) }} sitios</span>
        </p>
        <p class="text-xs text-muted-foreground">
          {{ d.propension.aviso }}
        </p>
        <details class="text-xs">
          <summary class="cursor-pointer text-muted-foreground">
            Contribuciones del modelo por grupo de variables
          </summary>
          <p class="mt-1 text-muted-foreground">
            Aporte de cada grupo al logit de la regresión logística final (entrenada con todos los sitios) respecto al
            sitio medio; el percentil mostrado arriba es el fuera de fold. Positivo: lo hace más parecido
            a los puntos existentes; negativo: menos. Se agrupa por variable porque los radios son colineales.
          </p>
          <ul class="mt-2 space-y-1">
            <li
              v-for="c in contribuciones"
              :key="c.grupo"
            >
              <div class="flex justify-between">
                <span>{{ ETIQUETA_GRUPO_CONTRIB[c.grupo] ?? c.grupo }}</span>
                <span class="font-mono">{{ c.valor > 0 ? '+' : '' }}{{ formatoDecimal(c.valor, 2) }}</span>
              </div>
              <div class="relative h-1.5 bg-secondary rounded">
                <div class="absolute left-1/2 top-0 h-1.5 w-px bg-gray-400" />
                <div
                  :class="['absolute top-0 h-1.5 rounded', c.valor >= 0 ? 'bg-blue-500' : 'bg-gray-500']"
                  :style="c.valor >= 0 ? { left: '50%', width: `${c.ancho}%` } : { right: '50%', width: `${c.ancho}%` }"
                />
              </div>
            </li>
          </ul>
        </details>
      </section>

      <!-- Variables -->
      <section class="p-4">
        <details class="text-xs">
          <summary class="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Variables del sitio ({{ Object.keys(d.variables).length }})
          </summary>
          <ul class="mt-2 space-y-0.5">
            <li
              v-for="(v, k) in d.variables"
              :key="k"
              class="flex justify-between gap-2"
            >
              <span>{{ ETIQUETA_VARIABLE[k] ?? k }}</span>
              <span class="text-muted-foreground">{{ formatoVariable(v.valor, v.unidad) }}</span>
            </li>
          </ul>
        </details>
      </section>

      <!-- Limitaciones -->
      <section class="p-4 space-y-1">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Limitaciones
        </h3>
        <ul class="list-disc pl-4 text-xs text-muted-foreground space-y-1">
          <li>Ningún sitio está aprobado ni confirmado: la verificación municipal y de campo sigue pendiente.</li>
          <li>
            Los {{ formatoEntero(store.version?.conteos.positivos) }} puntos existentes provienen de fuentes secundarias
            (OSM y San Isidro); la brecha de cobertura (K3) puede estar sobrestimada donde no hay puntos registrados.
          </li>
          <li>Sitios cercanos del top pueden corresponder a la misma zona (varios nodos OSM de un mismo lugar).</li>
          <li>Resultados del paquete V{{ d.paquete_version }}; no se recalculan en la aplicación.</li>
        </ul>
      </section>
    </div>
  </div>
</template>
