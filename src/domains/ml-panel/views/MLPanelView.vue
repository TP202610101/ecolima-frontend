<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue'
import { RefreshCw, Clock, Calendar, TrendingUp, Upload, Database, FileText, Info } from '@lucide/vue'
import { useMLStore } from '../stores/useMLStore'
import { useDatasetsStore } from '@/domains/datasets/stores/useDatasetsStore'
import KpiCard from '@/shared/components/KpiCard.vue'
import ShapChart from '../components/ShapChart.vue'

const mlStore = useMLStore()
const datasetsStore = useDatasetsStore()

function fmtDate(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-PE', { year: 'numeric', month: 'short', day: 'numeric' })
}

function fmtPct(v?: number | null): string {
  if (v == null) return '—'
  return `${(v * 100).toFixed(1)}%`
}

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

onMounted(() => {
  Promise.all([mlStore.fetchModels(), datasetsStore.fetchDatasets()])
})

onUnmounted(() => {
  mlStore.stopPolling()
})
</script>

<template>
  <div class="flex-1 overflow-auto bg-gray-50">
    <div class="max-w-7xl mx-auto p-4 sm:p-8 space-y-8">

      <!-- Header -->
      <div>
        <h1 class="text-2xl font-bold text-foreground">Panel ML</h1>
        <p class="text-sm text-muted-foreground mt-1">
          Gestión del modelo de Machine Learning y dataset
        </p>
      </div>

      <!-- ── Estado del modelo ─────────────────────────────────────────────── -->
      <section class="space-y-4">

        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <h2 class="text-lg font-semibold text-foreground flex-1">Estado del modelo</h2>
          <button
            @click="mlStore.runInference()"
            :disabled="mlStore.inferring"
            class="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span
              v-if="mlStore.inferring"
              class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
            />
            <RefreshCw v-else class="w-4 h-4" />
            {{ mlStore.inferring ? 'Actualizando...' : 'Actualizar modelo desde storage' }}
          </button>
        </div>

        <!-- Aviso datos de demostración -->
        <div
          v-if="mlStore.activeModel?.is_demo"
          class="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg"
        >
          <Info class="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p class="text-sm text-amber-800">
            Las métricas mostradas corresponden al modelo de demostración y no reflejan un entrenamiento con datos reales.
          </p>
        </div>

        <!-- Error de inferencia -->
        <div v-if="mlStore.inferenceError" class="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-sm text-red-700">{{ mlStore.inferenceError }}</p>
        </div>

        <!-- KPIs del modelo — 2 columnas en móvil, 5 en desktop -->
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-4">
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

        <ShapChart />

      </section>

      <!-- ── Dataset ───────────────────────────────────────────────────────── -->
      <section class="space-y-4">

        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <h2 class="text-lg font-semibold text-foreground flex-1">Dataset</h2>
          <button
            @click="datasetsStore.openUploader()"
            class="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 border border-primary text-primary text-sm font-medium rounded-md hover:bg-accent transition-colors"
          >
            <Upload class="w-4 h-4" />
            Subir nuevo dataset (CSV)
          </button>
        </div>

        <!-- KPIs dataset — 1 columna en móvil, 3 en desktop -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
</template>
