<script setup lang="ts">
import { computed, ref } from 'vue'
import { Clock, MapPin, CheckCircle2, XCircle, Navigation, TrendingUp, X, ArrowLeftRight, ShieldCheck, Info, Terminal } from '@lucide/vue'
import KpiCard from '@/shared/components/KpiCard.vue'
import GraficoSemillas from './GraficoSemillas.vue'
import { useMLStore } from '../stores/useMLStore'
import type { MetricaModelo } from '@/domains/analisis-v1/entities/AnalisisV1'
import type { VersionComparada } from '../entities/ModelVersion'
import { fechaLarga, fmtDec, fmtEntero } from '@/domains/analisis-v1/utils/lecturaV1'

// Pestaña «Modelo» del Panel ML: solo lectura del paquete importado (/api/v1/analisis/*).
// Reemplaza al panel del prototipo (inferencia, recálculo de cobertura, activación y SHAP de ejemplo):
// el modelo vigente llega en un paquete versionado y la plataforma solo lo lee.
const mlStore = useMLStore()

const METRICAS: Array<{ k: MetricaModelo; nombre: string }> = [
  { k: 'roc_auc', nombre: 'ROC-AUC' },
  { k: 'pr_auc', nombre: 'PR-AUC' },
  { k: 'boyce', nombre: 'Índice de Boyce' },
  { k: 'recall_top10', nombre: 'Recall del 10 % superior' },
]
const CRITERIOS = [
  { k: 'K1_demanda', nombre: 'K1 Demanda' },
  { k: 'K2_generacion', nombre: 'K2 Generación' },
  { k: 'K3_brecha', nombre: 'K3 Brecha' },
  { k: 'K4_accesibilidad', nombre: 'K4 Accesibilidad' },
] as const

const activa = computed(() => mlStore.activa)
const modelo = computed(() => mlStore.modelo)
const nombreAlgoritmo = (a?: string) => (a?.startsWith('LogisticRegression') ? 'Regresión logística' : a ?? '—')
const fecha = (iso?: string | null) => (iso ? fechaLarga(iso) : '—')
const pct = (x?: number | null, d = 1) => (x == null ? '—' : `${fmtDec(x * 100, d)} %`)

const metricas = computed(() => METRICAS.flatMap(m => {
  const e = modelo.value?.metricas_resumen[m.k]
  return e ? [{ ...m, media: e.media, de: e.de }] : []
}))

const estado = computed(() => {
  const t = mlStore.tamizaje?.estado_tamizaje ?? activa.value?.conteos.estado_tamizaje ?? {}
  return {
    sitios: activa.value?.conteos.sitios ?? null,
    aptos: t.apto_tamizaje ?? null,
    excluidos: t.excluido_tamizaje ?? null,
    existentes: t.punto_existente ?? null,
    topK: activa.value?.mcda.top_k ?? mlStore.mcda?.top_k ?? null,
  }
})
const n = (x: number | null) => (x == null ? '—' : fmtEntero(x))

// ── Comparación de versiones (con 2 o más registradas) ─────────────────────────────────────────
const seleccion = ref<string[]>([])
const verComparacion = ref(false)
function alternar(v: string) {
  const i = seleccion.value.indexOf(v)
  if (i !== -1) seleccion.value.splice(i, 1)
  else if (seleccion.value.length < 2) seleccion.value.push(v)
}
async function comparar() {
  const [a, b] = seleccion.value
  await mlStore.fetchCompare(a, b)
  if (!mlStore.compareError) verComparacion.value = true
}
function cerrarComparacion() {
  verComparacion.value = false
  mlStore.clearCompare()
  seleccion.value = []
}
const FILAS_COMPARACION: Array<{ nombre: string; valor: (v: VersionComparada) => string }> = [
  { nombre: 'Fecha del paquete', valor: v => fecha(v.version.fecha_paquete) },
  { nombre: 'Modelo', valor: v => v.version.modelo_version },
  { nombre: 'MCDA', valor: v => v.version.mcda_version },
  { nombre: 'Sitios', valor: v => n(v.version.conteos.sitios) },
  { nombre: 'Aptos', valor: v => n(v.version.conteos.estado_tamizaje.apto_tamizaje ?? null) },
  { nombre: 'Puntos existentes', valor: v => n(v.version.conteos.estado_tamizaje.punto_existente ?? null) },
  { nombre: 'Primeros de Lima', valor: v => n(v.version.mcda.top_k) },
  ...METRICAS.map(m => ({ nombre: m.nombre, valor: (v: VersionComparada) => fmtDec(v.modelo?.metricas_resumen[m.k]?.media, 3) })),
  { nombre: 'Manifiesto (sha256)', valor: v => v.version.manifest_sha256.slice(0, 12) },
]
</script>

<template>
  <div class="space-y-6">
    <p
      v-if="mlStore.error"
      class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
      role="alert"
    >
      {{ mlStore.error }}
    </p>

    <!-- a. Versión activa -->
    <section
      class="bg-white rounded-lg border border-border"
      data-prueba="bloque-version"
    >
      <div class="px-6 py-4 border-b border-border flex items-center gap-2">
        <Clock class="w-4 h-4 text-muted-foreground" />
        <h3 class="text-sm font-semibold text-foreground">
          Versión activa
        </h3>
        <span
          v-if="activa"
          class="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
        >Activa</span>
      </div>
      <p
        v-if="mlStore.errores.activa"
        class="px-6 py-3 text-xs text-red-700"
      >
        {{ mlStore.errores.activa }}
      </p>
      <div
        v-else-if="!activa"
        class="p-4"
      >
        <div class="h-24 bg-gray-100 rounded animate-pulse" />
      </div>
      <dl
        v-else
        class="px-6 py-4 grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm"
      >
        <dt class="text-muted-foreground">
          Paquete
        </dt>
        <dd class="font-mono">
          {{ activa.paquete_version }}
        </dd>
        <dt class="text-muted-foreground">
          Modelo
        </dt>
        <dd>
          <span class="font-mono">{{ activa.modelo_version }}</span> · {{ nombreAlgoritmo(modelo?.algoritmo ?? activa.modelo.algoritmo) }}
        </dd>
        <dt class="text-muted-foreground">
          MCDA
        </dt>
        <dd>
          <span class="font-mono">{{ activa.mcda_version }}</span> · {{ activa.mcda.metodo }}
        </dd>
        <dt class="text-muted-foreground">
          Fecha del paquete
        </dt>
        <dd>{{ fecha(activa.fecha_paquete) }} <span class="text-muted-foreground">(importado el {{ fecha(activa.importado_en) }})</span></dd>
        <dt class="text-muted-foreground">
          Responsable
        </dt>
        <dd class="text-muted-foreground">
          No lo publica la API: el backend omite el nombre del responsable de la ficha del modelo.
        </dd>
        <dt class="text-muted-foreground">
          Licencia de los datos
        </dt>
        <dd>
          <a
            v-if="activa.atribucion.licencia_url"
            :href="activa.atribucion.licencia_url"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center min-h-10 lg:min-h-0 text-primary underline underline-offset-2"
          >{{ activa.licencia_datos }}</a>
          <span v-else>{{ activa.licencia_datos }}</span>
        </dd>
        <dt class="text-muted-foreground">
          Descripción
        </dt>
        <dd>{{ activa.descripcion }}</dd>
      </dl>
    </section>

    <!-- e. Estado de los datos -->
    <section
      class="space-y-3"
      data-prueba="bloque-estado"
    >
      <h3 class="text-sm font-semibold text-foreground">
        Estado de los datos
      </h3>
      <p
        v-if="mlStore.errores.tamizaje && !activa"
        class="text-xs text-red-700"
      >
        {{ mlStore.errores.tamizaje }}
      </p>
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          :icon="MapPin"
          icon-bg="bg-blue-100"
          label="Sitios evaluados"
          :value="n(estado.sitios)"
        />
        <KpiCard
          :icon="CheckCircle2"
          icon-bg="bg-green-100"
          label="Aptos en la revisión preliminar"
          :value="n(estado.aptos)"
          subtitle="No significa viable ni autorizado"
        />
        <KpiCard
          :icon="XCircle"
          icon-bg="bg-red-100"
          label="Excluidos"
          :value="n(estado.excluidos)"
        />
        <KpiCard
          :icon="Navigation"
          icon-bg="bg-purple-100"
          label="Puntos existentes"
          :value="n(estado.existentes)"
        />
        <KpiCard
          :icon="TrendingUp"
          icon-bg="bg-amber-100"
          label="Primeros de Lima"
          :value="n(estado.topK)"
          subtitle="Por orden de los cuatro factores"
        />
      </div>
    </section>

    <!-- b. Métricas del modelo -->
    <section
      class="bg-white rounded-lg border border-border"
      data-prueba="bloque-metricas"
    >
      <div class="px-6 py-4 border-b border-border">
        <h3 class="text-sm font-semibold text-foreground">
          Métricas del modelo de propensión
        </h3>
        <p class="text-xs text-muted-foreground mt-1">
          Mide el parecido de cada lugar con los sitios donde ya hay puntos registrados (patrón histórico de instalación).
          No es una probabilidad calibrada ni una medida de idoneidad, y no interviene en el orden de revisión.
        </p>
      </div>
      <p
        v-if="mlStore.errores.modelo"
        class="px-6 py-3 text-xs text-red-700"
      >
        {{ mlStore.errores.modelo }}
      </p>
      <div
        v-else-if="!modelo"
        class="p-4"
      >
        <div class="h-40 bg-gray-100 rounded animate-pulse" />
      </div>
      <div
        v-else
        class="p-6 space-y-6"
      >
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            v-for="m in metricas"
            :key="m.k"
            class="rounded-lg border border-border p-4"
            :data-metrica="m.k"
          >
            <p class="text-xs text-muted-foreground">
              {{ m.nombre }}
            </p>
            <p class="text-2xl font-semibold text-foreground tabular-nums">
              {{ fmtDec(m.media, 3) }}
            </p>
            <p class="text-xs text-muted-foreground tabular-nums">
              desviación {{ m.de == null ? '—' : fmtDec(m.de, 3) }}
            </p>
          </div>
        </div>

        <GraficoSemillas
          v-if="modelo.metricas_por_semilla.length"
          :semillas="modelo.metricas_por_semilla"
        />

        <div class="overflow-x-auto">
          <table
            class="w-full text-sm"
            data-prueba="tabla-semillas"
          >
            <thead>
              <tr class="border-b border-border bg-gray-50">
                <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Semilla
                </th>
                <th
                  v-for="m in METRICAS"
                  :key="m.k"
                  class="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                >
                  {{ m.nombre }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="s in modelo.metricas_por_semilla"
                :key="s.semilla"
                class="border-b border-border last:border-0"
              >
                <td class="px-4 py-2 font-mono text-xs">
                  {{ s.semilla }}
                </td>
                <td
                  v-for="m in METRICAS"
                  :key="m.k"
                  class="px-4 py-2 text-right tabular-nums"
                >
                  {{ fmtDec(s[m.k], 3) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- c. Versiones -->
    <section
      class="bg-white rounded-lg border border-border overflow-hidden"
      data-prueba="bloque-versiones"
    >
      <div class="px-6 py-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
        <h3 class="text-sm font-semibold text-foreground">
          Versiones registradas
        </h3>
        <span
          v-if="mlStore.versiones && !mlStore.puedeComparar"
          class="text-xs text-muted-foreground italic"
          data-prueba="una-version"
        >Solo hay una versión registrada</span>
        <div
          v-else-if="mlStore.puedeComparar"
          class="flex items-center gap-2"
        >
          <span
            v-if="seleccion.length"
            class="text-xs text-muted-foreground"
          >{{ seleccion.length }}/2 seleccionadas</span>
          <button
            :disabled="seleccion.length !== 2 || mlStore.compareFetching"
            class="inline-flex items-center gap-1.5 min-h-10 lg:min-h-0 px-3 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-prueba="comparar"
            @click="comparar"
          >
            <span
              v-if="mlStore.compareFetching"
              class="w-3 h-3 border border-gray-500 border-t-transparent rounded-full animate-spin"
            />
            <ArrowLeftRight
              v-else
              class="w-3.5 h-3.5"
            />
            Comparar seleccionadas
          </button>
        </div>
      </div>
      <p
        v-if="mlStore.compareError"
        class="px-6 py-3 bg-red-50 border-b border-red-100 text-xs text-red-700"
      >
        {{ mlStore.compareError }}
      </p>
      <p
        v-if="mlStore.errores.versiones"
        class="px-6 py-3 text-xs text-red-700"
      >
        {{ mlStore.errores.versiones }}
      </p>
      <div
        v-else
        class="overflow-x-auto"
      >
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border bg-gray-50">
              <th
                v-if="mlStore.puedeComparar"
                class="px-3 py-3 w-8"
              />
              <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Paquete
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Modelo
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                MCDA
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Fecha del paquete
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Importado
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Estado
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="v in mlStore.listaVersiones"
              :key="v.paquete_version"
              class="border-b border-border last:border-0"
              :data-version="v.paquete_version"
            >
              <td
                v-if="mlStore.puedeComparar"
                class="px-3 py-3"
              >
                <label class="w-10 h-10 -m-2.5 flex items-center justify-center cursor-pointer">
                  <input
                    type="checkbox"
                    :checked="seleccion.includes(v.paquete_version)"
                    :disabled="seleccion.length >= 2 && !seleccion.includes(v.paquete_version)"
                    class="accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                    :aria-label="`Seleccionar ${v.paquete_version} para comparar`"
                    @change="alternar(v.paquete_version)"
                  >
                </label>
              </td>
              <td class="px-4 py-3 font-mono text-xs">
                {{ v.paquete_version }}
              </td>
              <td class="px-4 py-3 font-mono text-xs">
                {{ v.modelo_version }}
              </td>
              <td class="px-4 py-3 font-mono text-xs">
                {{ v.mcda_version }}
              </td>
              <td class="px-4 py-3 text-muted-foreground">
                {{ fecha(v.fecha_paquete) }}
              </td>
              <td class="px-4 py-3 text-muted-foreground">
                {{ fecha(v.importado_en) }}
              </td>
              <td class="px-4 py-3">
                <span
                  v-if="v.activa"
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                >Activa</span>
                <span
                  v-else
                  class="text-xs text-muted-foreground"
                >—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- f. Priorización -->
    <section
      class="bg-white rounded-lg border border-border"
      data-prueba="bloque-priorizacion"
    >
      <div class="px-6 py-4 border-b border-border">
        <h3 class="text-sm font-semibold text-foreground">
          Priorización (MCDA)
        </h3>
        <p
          v-if="mlStore.mcda"
          class="text-xs text-muted-foreground mt-1"
        >
          {{ mlStore.mcda.metodo }}. Radio {{ fmtEntero(mlStore.mcda.radio_principal_m) }} m; esquema principal «{{ mlStore.mcda.esquema_principal }}»;
          {{ fmtEntero(mlStore.mcda.top_k) }} primeros de Lima ({{ pct(mlStore.mcda.top_k_fraccion, 0) }} de los aptos).
          <template v-if="mlStore.mcda.montecarlo?.n">
            Sensibilidad con {{ fmtEntero(mlStore.mcda.montecarlo.n) }} réplicas de Monte Carlo.
          </template>
        </p>
      </div>
      <p
        v-if="mlStore.errores.mcda"
        class="px-6 py-3 text-xs text-red-700"
      >
        {{ mlStore.errores.mcda }}
      </p>
      <div
        v-else-if="mlStore.mcda"
        class="p-6 space-y-6"
      >
        <div class="overflow-x-auto">
          <h4 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Pesos por esquema
          </h4>
          <table
            class="w-full text-sm"
            data-prueba="tabla-pesos"
          >
            <thead>
              <tr class="border-b border-border bg-gray-50">
                <th class="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Esquema
                </th>
                <th
                  v-for="c in CRITERIOS"
                  :key="c.k"
                  class="px-4 py-2 text-right text-xs font-semibold text-muted-foreground"
                >
                  {{ c.nombre }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="p in mlStore.mcda.pesos ?? []"
                :key="p.esquema"
                class="border-b border-border last:border-0"
              >
                <td class="px-4 py-2">
                  {{ p.esquema }}
                  <span
                    v-if="p.esquema === mlStore.mcda.esquema_principal"
                    class="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-green-100 text-green-800"
                  >principal</span>
                </td>
                <td
                  v-for="c in CRITERIOS"
                  :key="c.k"
                  class="px-4 py-2 text-right tabular-nums"
                >
                  {{ pct(p[c.k]) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="overflow-x-auto">
          <h4 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Concordancia entre esquemas y variantes
          </h4>
          <table
            class="w-full text-sm"
            data-prueba="tabla-concordancia"
          >
            <thead>
              <tr class="border-b border-border bg-gray-50">
                <th class="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Comparación
                </th>
                <th class="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">
                  Spearman
                </th>
                <th class="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">
                  Kendall τ-b
                </th>
                <th class="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">
                  Coinciden en los {{ fmtEntero(mlStore.mcda.top_k) }} primeros
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="c in mlStore.mcda.concordancia ?? []"
                :key="c.comparacion"
                class="border-b border-border last:border-0"
              >
                <td class="px-4 py-2">
                  {{ c.comparacion }}
                </td>
                <td class="px-4 py-2 text-right tabular-nums">
                  {{ fmtDec(c.spearman, 3) }}
                </td>
                <td class="px-4 py-2 text-right tabular-nums">
                  {{ fmtDec(c.kendall_tau_b, 3) }}
                </td>
                <td class="px-4 py-2 text-right tabular-nums">
                  {{ pct(c.solapamiento_top110) }}
                </td>
              </tr>
            </tbody>
          </table>
          <p class="text-xs text-muted-foreground mt-2">
            Es informativa: muestra cuánto cambia el orden con otros pesos o variantes; no se usa para ordenar.
          </p>
        </div>
      </div>
    </section>

    <!-- d. Integridad -->
    <section
      class="bg-white rounded-lg border border-border"
      data-prueba="bloque-integridad"
    >
      <div class="px-6 py-4 border-b border-border flex items-center gap-2">
        <ShieldCheck class="w-4 h-4 text-muted-foreground" />
        <h3 class="text-sm font-semibold text-foreground">
          Integridad del paquete
        </h3>
      </div>
      <dl
        v-if="activa"
        class="px-6 py-4 grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm"
      >
        <dt class="text-muted-foreground">
          Archivo del dataset
        </dt>
        <dd class="font-mono text-xs break-all">
          {{ activa.dataset.archivo ?? '—' }}
        </dd>
        <dt class="text-muted-foreground">
          sha256 del dataset
        </dt>
        <dd class="font-mono text-xs break-all">
          {{ activa.dataset.sha256 ?? '—' }}
        </dd>
        <dt class="text-muted-foreground">
          sha256 del manifiesto
        </dt>
        <dd class="font-mono text-xs break-all">
          {{ activa.manifest_sha256 }}
        </dd>
        <dt class="text-muted-foreground">
          Archivos del paquete
        </dt>
        <dd>
          {{ activa.archivos ? fmtEntero(activa.archivos.length) : '—' }}
          <details
            v-if="activa.archivos?.length"
            class="mt-1"
          >
            <summary class="flex items-center min-h-10 lg:min-h-0 text-xs text-primary cursor-pointer">
              Ver archivos y hashes
            </summary>
            <ul class="mt-1 space-y-0.5">
              <li
                v-for="a in activa.archivos"
                :key="a.ruta"
                class="font-mono text-[11px] break-all text-muted-foreground"
              >
                {{ a.ruta }} · {{ a.sha256.slice(0, 12) }}…
              </li>
            </ul>
          </details>
        </dd>
        <dt class="text-muted-foreground">
          Entorno
        </dt>
        <dd class="flex flex-wrap gap-1">
          <span
            v-for="(ver, lib) in activa.entorno ?? {}"
            :key="lib"
            class="px-1.5 py-0.5 rounded bg-gray-100 font-mono text-xs"
          >{{ lib }} {{ ver }}</span>
          <span v-if="!activa.entorno">—</span>
        </dd>
      </dl>
    </section>

    <!-- g. Cómo se registra o activa una versión nueva -->
    <section
      class="rounded-lg border border-border bg-gray-50 p-6 space-y-2 text-sm text-neutral-700"
      data-prueba="bloque-importar"
    >
      <div class="flex items-center gap-2">
        <Terminal class="w-4 h-4 text-muted-foreground" />
        <h3 class="text-sm font-semibold text-foreground">
          Cómo se registra o activa una versión nueva
        </h3>
      </div>
      <p>
        Las versiones no se crean ni se activan desde esta pantalla. En el backend se importa el paquete con
        <code class="px-1 rounded bg-white border border-border text-xs">scripts/importar_paquete_analisis.py RUTA_PAQUETE</code>,
        que verifica los hashes del manifiesto y las reglas de coherencia antes de registrarla y dejarla activa.
        Con <code class="px-1 rounded bg-white border border-border text-xs">--no-activar</code> se registra sin activarla y
        con <code class="px-1 rounded bg-white border border-border text-xs">--activar-version VERSION</code> se activa una ya importada.
      </p>
      <p class="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info class="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        Ya no se muestran ejecutar inferencia, recalcular cobertura ni activar un modelo: el modelo vigente llega en un paquete versionado y esta plataforma solo lo lee.
      </p>
    </section>

    <!-- Modal de comparación -->
    <Teleport to="body">
      <div
        v-if="verComparacion && mlStore.compareResult"
        class="fixed inset-0 z-[9999] flex items-center justify-center sm:p-4"
        data-prueba="modal-comparacion"
      >
        <div
          class="absolute inset-0 bg-black/50"
          @click="cerrarComparacion"
        />
        <div class="relative bg-white sm:rounded-lg shadow-xl w-full h-full sm:h-auto max-w-2xl sm:max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between px-4 sm:px-6 py-2 sm:py-4 border-b border-border sticky top-0 bg-white">
            <div class="flex items-center gap-2">
              <ArrowLeftRight class="w-4 h-4 text-muted-foreground" />
              <h2 class="text-sm font-semibold text-foreground">
                Comparación de versiones
              </h2>
            </div>
            <button
              class="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Cerrar"
              @click="cerrarComparacion"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
          <div class="p-4 sm:p-6">
            <table class="w-full text-sm border border-border rounded-md overflow-hidden table-fixed">
              <thead>
                <tr class="bg-gray-50 border-b border-border">
                  <th class="px-2 sm:px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28 sm:w-40">
                    Dato
                  </th>
                  <th
                    v-for="lado in (['a', 'b'] as const)"
                    :key="lado"
                    class="px-2 sm:px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    <span class="font-mono">{{ mlStore.compareResult[lado].version.paquete_version }}</span>
                    <span
                      v-if="mlStore.compareResult[lado].version.activa"
                      class="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                    >Activa</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="f in FILAS_COMPARACION"
                  :key="f.nombre"
                  class="border-b border-border last:border-0"
                >
                  <td class="px-2 sm:px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    {{ f.nombre }}
                  </td>
                  <td class="px-2 sm:px-4 py-2.5 text-center tabular-nums break-words">
                    {{ f.valor(mlStore.compareResult.a) }}
                  </td>
                  <td class="px-2 sm:px-4 py-2.5 text-center tabular-nums break-words">
                    {{ f.valor(mlStore.compareResult.b) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
