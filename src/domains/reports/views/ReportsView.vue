<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { MapPin, TrendingUp, Building2, FileDown, Info } from '@lucide/vue'
import { useReportsStore } from '../stores/useReportsStore'
import { useCoverageRedundancyStore } from '../stores/useCoverageRedundancyStore'
import { useAuthStore } from '@/domains/auth/stores/useAuthStore'
import { ExportReportUseCase } from '../use-cases/ExportReportUseCase'
import KpiCard from '@/shared/components/KpiCard.vue'
import Badge from '@/shared/components/Badge.vue'
import PriorityBar from '@/shared/components/PriorityBar.vue'
import { formatMetric } from '@/shared/utils/formatters'

const store = useReportsStore()
const coverageStore = useCoverageRedundancyStore()
const auth = useAuthStore()

const sortedRedundancy = computed(() => {
  const withData = coverageStore.items
    .filter(i => i.total_recommended > 0)
    .sort((a, b) => b.redundancy_pct - a.redundancy_pct)
  const noData = coverageStore.items
    .filter(i => i.total_recommended === 0)
    .sort((a, b) => a.district_name.localeCompare(b.district_name, 'es'))
  return [...withData, ...noData]
})

const isDemoRedundancy = computed(() => coverageStore.items.some(i => i.is_demo))

const totalZones = computed(() => store.recommendations.length)

function incomeToNSE(stratum?: number): string {
  if (stratum == null) return 'N/D'
  if (stratum >= 5) return 'A'
  if (stratum === 4) return 'B'
  if (stratum === 3) return 'C'
  if (stratum === 2) return 'D'
  return 'E'
}

function formatGap(m: number | null): { text: string; high: boolean } {
  if (m == null) return { text: 'N/D', high: false }
  return {
    text: m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`,
    high: m > 5000,
  }
}


onMounted(() => {
  store.fetchAll()
  coverageStore.fetchRedundancy()
})
</script>

<template>
  <div class="flex-1 overflow-auto bg-gray-50">
    <div class="max-w-7xl mx-auto p-4 sm:p-8 space-y-6">

      <!-- Header -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 print:hidden">
        <div class="flex-1">
          <h1 class="text-2xl font-bold text-foreground">Reporte de Análisis</h1>
          <p class="text-sm text-muted-foreground mt-1">
            Sistema de recomendación de ubicaciones para puntos de reciclaje
          </p>
        </div>
        <div class="flex gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
          <button
            @click="ExportReportUseCase.exportCSV(store.recommendations, coverageStore.items)"
            :disabled="store.loading || !store.recommendations.length"
            class="flex items-center gap-2 px-4 py-2 border border-border rounded-md text-sm text-foreground hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileDown class="w-4 h-4" />
            Exportar Excel
          </button>
          <button
            @click="ExportReportUseCase.exportPDF()"
            :disabled="store.loading || !store.recommendations.length"
            class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileDown class="w-4 h-4" />
            Exportar PDF
          </button>
        </div>
      </div>

      <!-- Header solo para impresión -->
      <div class="hidden print:block">
        <h1 class="text-2xl font-bold text-foreground">Reporte de Análisis — EcoLima ML</h1>
        <p class="text-sm text-muted-foreground mt-1">
          Sistema de recomendación · Municipalidad Metropolitana de Lima
        </p>
        <p class="text-xs text-muted-foreground">
          Generado: {{ new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' }) }}
        </p>
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          :icon="MapPin"
          icon-bg="bg-green-100"
          label="Zonas analizadas"
          :value="store.loading ? '—' : totalZones"
          subtitle="Candidatas evaluadas por ML"
        />
        <KpiCard
          :icon="TrendingUp"
          icon-bg="bg-blue-100"
          label="Zonas recomendadas"
          :value="store.loading ? '—' : totalZones"
          subtitle="Con is_recommended = true"
        />
        <KpiCard
          :icon="Building2"
          icon-bg="bg-purple-100"
          label="Distritos cubiertos"
          :value="store.loading ? '—' : (store.stats?.districts_covered ?? '—')"
          subtitle="Con al menos 1 zona recomendada"
        />
      </div>

      <!-- Redundancia de cobertura -->
      <div class="bg-white rounded-lg border border-border overflow-hidden">

        <div class="px-6 py-4 border-b border-border">
          <h2 class="text-base font-semibold text-foreground">Redundancia de cobertura por distrito</h2>
          <p class="text-xs text-muted-foreground mt-0.5">
            % de zonas recomendadas que ya tienen un punto de reciclaje a &lt;500 m ·
            <span class="text-green-700 font-medium">Verde 0–50%</span> ·
            <span class="text-yellow-700 font-medium">Amarillo 51–80%</span> ·
            <span class="text-red-700 font-medium">Rojo &gt;80%</span>
          </p>
        </div>

        <div v-if="isDemoRedundancy" class="flex items-center gap-2 px-6 py-3 bg-amber-50 border-b border-amber-200">
          <Info class="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p class="text-xs text-amber-800">
            Datos de ejemplo — el modelo activo es de demostración y no refleja inferencia con datos reales.
          </p>
        </div>

        <div v-if="coverageStore.loading" class="p-4 space-y-2">
          <div v-for="i in 6" :key="i" class="h-10 bg-gray-100 rounded animate-pulse" />
        </div>

        <div v-else-if="coverageStore.error" class="p-6">
          <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-700">{{ coverageStore.error }}</p>
          </div>
        </div>

        <div v-else-if="!coverageStore.items.length" class="flex flex-col items-center justify-center py-10 text-center">
          <p class="text-sm text-muted-foreground">Sin datos de redundancia disponibles</p>
        </div>

        <div v-else class="divide-y divide-border max-h-80 overflow-y-auto redundancia-scroll">
          <div
            v-for="item in sortedRedundancy"
            :key="item.district_id"
            class="flex items-center gap-3 px-6 py-3"
          >
            <span
              class="w-2.5 h-2.5 rounded-full flex-shrink-0"
              :class="{
                'bg-green-500': item.total_recommended > 0 && item.status === 'verde',
                'bg-yellow-500': item.status === 'amarillo',
                'bg-red-500': item.status === 'rojo',
                'bg-gray-300': item.total_recommended === 0,
              }"
            />
            <span class="flex-1 text-sm text-foreground">{{ item.district_name }}</span>
            <span class="text-xs text-muted-foreground hidden sm:block shrink-0">
              {{ item.already_covered }} / {{ item.total_recommended }} zonas cubiertas
            </span>
            <span
              v-if="item.total_recommended > 0"
              class="text-sm font-semibold w-14 text-right shrink-0"
              :class="{
                'text-green-700': item.status === 'verde',
                'text-yellow-700': item.status === 'amarillo',
                'text-red-700': item.status === 'rojo',
              }"
            >
              {{ item.redundancy_pct.toFixed(1) }}%
            </span>
            <span v-else class="text-xs text-muted-foreground italic w-14 text-right shrink-0">Sin datos</span>
          </div>
        </div>

      </div>

      <!-- Tabla -->
      <div class="bg-white rounded-lg border border-border overflow-hidden">

        <!-- Skeleton loading -->
        <div v-if="store.loading" class="p-4 space-y-3">
          <div v-for="i in 5" :key="i" class="h-14 bg-gray-100 rounded animate-pulse" />
        </div>

        <!-- Error -->
        <div v-else-if="store.error" class="p-6">
          <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-700">{{ store.error }}</p>
          </div>
        </div>

        <!-- Empty -->
        <div
          v-else-if="!store.recommendations.length"
          class="flex flex-col items-center justify-center py-16 text-center"
        >
          <MapPin class="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p class="text-sm text-muted-foreground">No hay recomendaciones disponibles aún</p>
        </div>

        <!-- Tabla de datos -->
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border bg-gray-50">
                <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Zona
                </th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Distrito
                </th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  NSE
                </th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[160px]">
                  Puntaje ML
                </th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Densidad Pobl.
                </th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Brecha Cobertura
                </th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Dens. Vial
                </th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="rec in store.recommendations"
                :key="rec.zone_id"
                class="border-b border-border hover:bg-secondary transition-colors"
              >
                <!-- Zona -->
                <td class="px-4 py-4">
                  <div class="flex items-center gap-2">
                    <MapPin class="w-4 h-4 text-primary flex-shrink-0" />
                    <span class="font-medium text-foreground">Zona {{ rec.zone_id }}</span>
                  </div>
                </td>

                <!-- Distrito -->
                <td class="px-4 py-4 text-foreground">{{ rec.district_name }}</td>

                <!-- NSE -->
                <td class="px-4 py-4 text-foreground">{{ incomeToNSE(rec.income_stratum) }}</td>

                <!-- Puntaje ML -->
                <td class="px-4 py-4 min-w-[160px]">
                  <PriorityBar
                    v-if="auth.isAdmin && rec.ml_score != null"
                    :value="rec.ml_score"
                    :show-label="true"
                  />
                  <Badge
                    v-else
                    :variant="rec.priority_label.toLowerCase() as 'alta' | 'media' | 'baja'"
                  />
                </td>

                <!-- Densidad poblacional -->
                <td class="px-4 py-4 text-foreground">{{ formatMetric(rec.population_density, 'hab/km²') }}</td>

                <!-- Brecha cobertura -->
                <td class="px-4 py-4">
                  <span :class="formatGap(rec.coverage_gap_m).high ? 'text-orange-500 font-medium' : 'text-foreground'">
                    {{ formatGap(rec.coverage_gap_m).text }}
                  </span>
                </td>

                <!-- Densidad vial -->
                <td class="px-4 py-4 text-foreground">{{ formatMetric(rec.road_density, 'm/km²') }}</td>

                <!-- Estado -->
                <td class="px-4 py-4">
                  <Badge variant="recomendado" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  </div>
</template>

<style>
@media print {
  @page {
    size: A4 landscape;
    margin: 1.5cm 1.5cm;
  }

  /* Los contenedores con scroll interno (App.vue y esta vista) tienen
     altura fija (h-screen) y overflow-auto: al imprimir solo se ve la
     porción visible en pantalla. Se libera la altura para que el
     contenido fluya en varias páginas. */
  html, body, #app, .h-screen, main.overflow-auto {
    height: auto !important;
    overflow: visible !important;
  }

  body {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
    background: white !important;
  }

  /* Fondo exterior blanco */
  .bg-gray-50 {
    background: white !important;
  }

  /* Contenedor de la vista: también tiene overflow-auto */
  .flex-1.overflow-auto {
    overflow: visible !important;
  }

  /* Padding reducido en impresión */
  .max-w-7xl {
    padding: 0 !important;
  }

  /* Repetir encabezado de tabla en cada página */
  thead {
    display: table-header-group;
  }

  /* KPI cards en una fila, sin sombra */
  .grid-cols-3 {
    display: grid !important;
    grid-template-columns: repeat(3, 1fr) !important;
    gap: 0.75rem !important;
  }

  /* Tabla: texto más pequeño para que quepa */
  table {
    font-size: 11px !important;
  }

  th, td {
    padding: 6px 8px !important;
  }

  /* Sin hover colors en print */
  tr:hover {
    background: transparent !important;
  }

  /* Evitar corte de filas entre páginas */
  tr {
    page-break-inside: avoid;
  }

  /* Redundancia de cobertura: mostrar lista completa sin scroll al imprimir */
  .redundancia-scroll {
    max-height: none !important;
    overflow: visible !important;
  }
}
</style>
