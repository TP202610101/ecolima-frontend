<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, computed, nextTick } from 'vue'
import { RefreshCw, Clock, Calendar, TrendingUp, Upload, Database, FileText } from '@lucide/vue'
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
} from 'chart.js'
import { useMLStore } from '../stores/useMLStore'
import { useDatasetsStore } from '@/domains/datasets/stores/useDatasetsStore'
import KpiCard from '@/shared/components/KpiCard.vue'
import DatasetUploader from '@/domains/datasets/components/DatasetUploader.vue'

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip)

const mlStore = useMLStore()
const datasetsStore = useDatasetsStore()
const showUploader = ref(false)

// ── SHAP chart ──────────────────────────────────────────────────────────────

const chartCanvas = ref<HTMLCanvasElement>()
let chartInstance: Chart | null = null

const SHAP_LABELS = [
  'Gasto combustible',
  'Densidad poblacional',
  'Potencial de reciclaje',
  'GPC (kg/hab/día)',
  'Dist. punto cercano',
  'Puntos en 500m',
  'Estrato de ingreso',
  '% Plástico',
]
const SHAP_VALUES = [0.38, 0.32, 0.28, 0.22, 0.18, 0.14, 0.10, 0.08]

function buildChart() {
  if (!chartCanvas.value) return
  if (chartInstance) { chartInstance.destroy(); chartInstance = null }
  chartInstance = new Chart(chartCanvas.value, {
    type: 'bar',
    data: {
      labels: SHAP_LABELS,
      datasets: [{
        data: SHAP_VALUES,
        backgroundColor: '#16a34a',
        borderRadius: 4,
        barThickness: 18,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${(ctx.parsed.x as number).toFixed(3)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: '#e5e5e5' },
          ticks: { color: '#737373', font: { size: 11 } },
          title: {
            display: true,
            text: 'Importancia SHAP',
            color: '#737373',
            font: { size: 11 },
          },
        },
        y: {
          grid: { display: false },
          ticks: { color: '#1a1a1a', font: { size: 12 } },
        },
      },
    },
  })
}

watch(() => mlStore.activeModel, async model => {
  if (model) {
    await nextTick()
    buildChart()
  }
})

// ── Formatters ───────────────────────────────────────────────────────────────

function fmtDate(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-PE', { year: 'numeric', month: 'short', day: 'numeric' })
}

function fmtPct(v?: number | null): string {
  if (v == null) return '—'
  return `${(v * 100).toFixed(1)}%`
}

// ── Dataset helpers ──────────────────────────────────────────────────────────

const latestDataset = computed(() => datasetsStore.datasets[0] ?? null)

function datasetStatusClass(status?: string): string {
  const map: Record<string, string> = {
    committed: 'bg-green-100 text-green-800',
    valid:     'bg-blue-100 text-blue-800',
    invalid:   'bg-red-100 text-red-800',
    pending:   'bg-gray-100 text-gray-800',
  }
  return map[status ?? ''] ?? 'bg-gray-100 text-gray-800'
}

function datasetStatusLabel(status?: string): string {
  const map: Record<string, string> = {
    committed: 'Confirmado',
    valid:     'Válido',
    invalid:   'Inválido',
    pending:   'Pendiente',
  }
  return map[status ?? ''] ?? status ?? '—'
}

// ── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(async () => {
  await Promise.all([mlStore.fetchModels(), datasetsStore.fetchDatasets()])
  if (mlStore.activeModel) {
    await nextTick()
    buildChart()
  }
})

onUnmounted(() => {
  mlStore.stopPolling()
  chartInstance?.destroy()
  chartInstance = null
})
</script>

<template>
  <div class="flex-1 overflow-auto bg-gray-50">
    <div class="max-w-7xl mx-auto p-8 space-y-8">

      <!-- Header -->
      <div>
        <h1 class="text-2xl font-bold text-foreground">Panel ML</h1>
        <p class="text-sm text-muted-foreground mt-1">
          Gestión del modelo de Machine Learning y dataset
        </p>
      </div>

      <!-- ── Estado del modelo ─────────────────────────────────────────────── -->
      <section class="space-y-4">

        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-foreground">Estado del modelo</h2>
          <button
            @click="mlStore.runInference()"
            :disabled="mlStore.inferring"
            class="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span
              v-if="mlStore.inferring"
              class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
            />
            <RefreshCw v-else class="w-4 h-4" />
            {{ mlStore.inferring ? 'Actualizando...' : 'Actualizar modelo desde storage' }}
          </button>
        </div>

        <!-- Error de inferencia -->
        <div v-if="mlStore.inferenceError" class="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-sm text-red-700">{{ mlStore.inferenceError }}</p>
        </div>

        <!-- KPIs del modelo — 5 columnas -->
        <div class="grid grid-cols-5 gap-4">
          <KpiCard
            :icon="Clock"
            icon-bg="bg-blue-100"
            label="Versión activa"
            :value="mlStore.loading ? '—' : (mlStore.activeModel?.version_name ?? 'Sin modelo')"
          />
          <KpiCard
            :icon="Calendar"
            icon-bg="bg-purple-100"
            label="Fecha entrenamiento"
            :value="mlStore.loading ? '—' : fmtDate(mlStore.activeModel?.training_date)"
          />
          <KpiCard
            :icon="TrendingUp"
            icon-bg="bg-green-100"
            label="Accuracy"
            :value="mlStore.loading ? '—' : fmtPct(mlStore.activeModel?.metrics?.accuracy)"
          />
          <KpiCard
            :icon="TrendingUp"
            icon-bg="bg-green-100"
            label="F1-Score"
            :value="mlStore.loading ? '—' : fmtPct(mlStore.activeModel?.metrics?.f1)"
          />
          <KpiCard
            :icon="TrendingUp"
            icon-bg="bg-green-100"
            label="AUC-ROC"
            :value="mlStore.loading ? '—' : fmtPct(mlStore.activeModel?.metrics?.auc_pr)"
          />
        </div>

        <!-- Gráfico SHAP -->
        <div class="bg-white rounded-lg border border-border p-6">
          <h3 class="text-sm font-semibold text-foreground mb-4">Importancia de variables (SHAP)</h3>

          <div
            v-if="!mlStore.activeModel && !mlStore.loading"
            class="flex items-center justify-center h-48 text-sm text-muted-foreground"
          >
            No hay modelo activo
          </div>
          <div v-else-if="mlStore.loading" class="h-64 bg-gray-100 rounded animate-pulse" />
          <div v-else class="relative h-64">
            <canvas ref="chartCanvas" />
          </div>
        </div>

      </section>

      <!-- ── Dataset ───────────────────────────────────────────────────────── -->
      <section class="space-y-4">

        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-foreground">Dataset</h2>
          <button
            @click="showUploader = true"
            class="flex items-center gap-2 px-4 py-2 border border-primary text-primary text-sm font-medium rounded-md hover:bg-accent transition-colors"
          >
            <Upload class="w-4 h-4" />
            Subir nuevo dataset (CSV)
          </button>
        </div>

        <!-- KPIs dataset — 3 columnas -->
        <div class="grid grid-cols-3 gap-4">
          <KpiCard
            :icon="Calendar"
            icon-bg="bg-purple-100"
            label="Última actualización"
            :value="latestDataset ? fmtDate(latestDataset.uploaded_at) : '—'"
            subtitle="Fecha de carga"
          />
          <KpiCard
            :icon="Database"
            icon-bg="bg-blue-100"
            label="Número de registros"
            :value="latestDataset ? latestDataset.row_count.toLocaleString('es-PE') : '—'"
            subtitle="Filas del dataset activo"
          />
          <!-- TODO: conectar al dato real de la API cuando el endpoint lo exponga -->
          <KpiCard
            :icon="FileText"
            icon-bg="bg-green-100"
            label="Distritos cubiertos"
            :value="'—'"
            subtitle="Dataset más reciente"
          />
        </div>

        <!-- Tabla historial datasets -->
        <div class="bg-white rounded-lg border border-border overflow-hidden">

          <div class="px-6 py-4 border-b border-border">
            <h3 class="text-sm font-semibold text-foreground">Preview del dataset (últimos 5)</h3>
          </div>

          <div v-if="datasetsStore.loading" class="p-4 space-y-3">
            <div v-for="i in 5" :key="i" class="h-10 bg-gray-100 rounded animate-pulse" />
          </div>

          <div
            v-else-if="!datasetsStore.datasets.length"
            class="flex flex-col items-center justify-center py-12 text-center"
          >
            <FileText class="w-10 h-10 text-muted-foreground/30 mb-2" />
            <p class="text-sm text-muted-foreground">No hay datasets subidos aún</p>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-border bg-gray-50">
                  <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">ID</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nombre archivo</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filas</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fecha</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="ds in datasetsStore.datasets.slice(0, 5)"
                  :key="ds.dataset_id"
                  class="border-b border-border hover:bg-secondary transition-colors last:border-0"
                >
                  <td class="px-4 py-4 text-muted-foreground">{{ ds.dataset_id }}</td>
                  <td class="px-4 py-4">
                    <div class="flex items-center gap-2">
                      <FileText class="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span class="font-medium text-foreground truncate max-w-[220px]">{{ ds.filename }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-4 text-foreground">{{ ds.row_count.toLocaleString('es-PE') }}</td>
                  <td class="px-4 py-4">
                    <span
                      :class="['inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', datasetStatusClass(ds.status)]"
                    >
                      {{ datasetStatusLabel(ds.status) }}
                    </span>
                  </td>
                  <td class="px-4 py-4 text-muted-foreground">{{ fmtDate(ds.uploaded_at) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </section>

    </div>
  </div>

  <!-- Modal subida dataset -->
  <DatasetUploader
    v-if="showUploader"
    @close="showUploader = false; datasetsStore.fetchDatasets()"
  />
</template>
