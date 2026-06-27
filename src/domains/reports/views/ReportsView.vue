<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { MapPin, TrendingUp, Building2, FileDown } from '@lucide/vue'
import { useReportsStore } from '../stores/useReportsStore'
import { useAuthStore } from '@/domains/auth/stores/useAuthStore'
import { ExportReportUseCase } from '../use-cases/ExportReportUseCase'
import KpiCard from '@/shared/components/KpiCard.vue'
import Badge from '@/shared/components/Badge.vue'
import PriorityBar from '@/shared/components/PriorityBar.vue'
import { formatMetric } from '@/shared/utils/formatters'

const store = useReportsStore()
const auth = useAuthStore()

const totalZones = computed(() => store.recommendations.length)
const districtsCount = computed(() => new Set(store.recommendations.map(r => r.district_name)).size)

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


onMounted(() => store.fetchAll())
</script>

<template>
  <div class="flex-1 overflow-auto bg-gray-50">
    <div class="max-w-7xl mx-auto p-8 space-y-6">

      <!-- Header -->
      <div class="flex items-start justify-between print:hidden">
        <div>
          <h1 class="text-2xl font-bold text-foreground">Reporte de Análisis</h1>
          <p class="text-sm text-muted-foreground mt-1">
            Sistema de recomendación de ubicaciones para puntos de reciclaje
          </p>
        </div>
        <div class="flex gap-2">
          <button
            @click="ExportReportUseCase.exportCSV(store.recommendations)"
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
      <div class="grid grid-cols-3 gap-4">
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
          :value="store.loading ? '—' : districtsCount"
          subtitle="Con al menos 1 zona recomendada"
        />
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

  body {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
    background: white !important;
  }

  /* Fondo exterior blanco */
  .bg-gray-50 {
    background: white !important;
  }

  /* Padding reducido en impresión */
  .max-w-7xl {
    padding: 0 !important;
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
}
</style>
