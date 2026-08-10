<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue'
import { RefreshCw, Clock, Calendar, TrendingUp, Upload, Database, FileText, Info, X } from '@lucide/vue'
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
    failed:    'bg-orange-100 text-orange-800',
  }
  return map[status ?? ''] ?? 'bg-gray-100 text-gray-800'
}

function datasetStatusLabel(status?: string): string {
  const map: Record<string, string> = {
    committed: 'Confirmado',
    valid:     'Válido',
    invalid:   'Inválido',
    pending:   'Pendiente',
    failed:    'Fallido',
  }
  return map[status ?? ''] ?? status ?? '—'
}

const datasetResultClass = computed((): string => {
  const lv = datasetsStore.lastValidation
  const lc = datasetsStore.lastCommit
  if (lv) return lv.result.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
  if (lc) return lc.result.inserted > 0 ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
  return 'bg-red-50 border-red-200'
})

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
            {{ mlStore.inferring ? 'Ejecutando...' : 'Ejecutar inferencia' }}
          </button>
        </div>

        <!-- Progreso de inferencia en curso -->
        <div
          v-if="mlStore.inferring"
          class="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg"
        >
          <span class="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-medium text-blue-800">Ejecutando inferencia...</span>
              <span class="text-xs font-mono text-blue-700">{{ mlStore.inferenceProgress }}%</span>
            </div>
            <div class="w-full bg-blue-100 rounded-full h-1.5">
              <div
                class="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                :style="{ width: `${mlStore.inferenceProgress}%` }"
              />
            </div>
            <p class="text-xs text-blue-600 mt-1">
              {{ mlStore.zonesProcessed }}{{ mlStore.estimatedZones > 0 ? `/${mlStore.estimatedZones}` : '' }} zonas procesadas
            </p>
          </div>
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
                  <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
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
                  <td class="px-4 py-4">
                    <!-- Validar: pending, invalid o failed (backend exige status=valid antes de confirmar) -->
                    <button
                      v-if="ds.status === 'pending' || ds.status === 'invalid' || ds.status === 'failed'"
                      @click="datasetsStore.validateDataset(ds.dataset_id, ds.filename)"
                      :disabled="datasetsStore.validatingId !== null || datasetsStore.committingId !== null"
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span v-if="datasetsStore.validatingId === ds.dataset_id" class="w-3 h-3 border border-gray-500 border-t-transparent rounded-full animate-spin" />
                      {{ datasetsStore.validatingId === ds.dataset_id ? 'Validando…' : 'Validar' }}
                    </button>
                    <!-- Confirmar: valid -->
                    <button
                      v-else-if="ds.status === 'valid'"
                      @click="datasetsStore.commitDataset(ds.dataset_id, ds.filename)"
                      :disabled="datasetsStore.validatingId !== null || datasetsStore.committingId !== null"
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-md hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span v-if="datasetsStore.committingId === ds.dataset_id" class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {{ datasetsStore.committingId === ds.dataset_id ? 'Aplicando…' : 'Confirmar' }}
                    </button>
                    <!-- committed: sin acción -->
                    <span v-else class="text-xs text-muted-foreground">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>

        <!-- Panel resultado de validación / confirmación -->
        <div
          v-if="datasetsStore.lastValidation || datasetsStore.lastCommit || datasetsStore.actionError"
          class="rounded-lg border p-4"
          :class="datasetResultClass"
        >
          <div class="flex items-start gap-3">
            <div class="flex-1 min-w-0 space-y-2">

              <!-- Resultado de validación -->
              <template v-if="datasetsStore.lastValidation">
                <p class="text-sm font-semibold" :class="datasetsStore.lastValidation.result.valid ? 'text-green-800' : 'text-red-800'">
                  {{ datasetsStore.lastValidation.result.valid ? '✓ Dataset válido' : '✗ Dataset inválido' }}
                  <span class="font-normal ml-1.5 opacity-70 truncate">{{ datasetsStore.lastValidation.filename }}</span>
                </p>
                <p class="text-xs" :class="datasetsStore.lastValidation.result.valid ? 'text-green-700' : 'text-red-700'">
                  {{ datasetsStore.lastValidation.result.valid_rows.toLocaleString('es-PE') }} filas válidas de {{ datasetsStore.lastValidation.result.row_count.toLocaleString('es-PE') }} totales
                </p>
                <!-- Columnas faltantes -->
                <div v-if="datasetsStore.lastValidation.result.missing_columns.length">
                  <p class="text-xs font-medium text-red-800 mb-1">Columnas faltantes:</p>
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="col in datasetsStore.lastValidation.result.missing_columns"
                      :key="col"
                      class="px-1.5 py-0.5 bg-red-100 text-red-800 text-xs rounded font-mono"
                    >{{ col }}</span>
                  </div>
                </div>
                <!-- Errores de tipo -->
                <div v-if="datasetsStore.lastValidation.result.type_errors.length" class="space-y-0.5">
                  <p class="text-xs font-medium text-red-800">
                    Errores de tipo — {{ datasetsStore.lastValidation.result.error_rows }} fila{{ datasetsStore.lastValidation.result.error_rows !== 1 ? 's' : '' }} afectada{{ datasetsStore.lastValidation.result.error_rows !== 1 ? 's' : '' }}:
                  </p>
                  <p
                    v-for="err in datasetsStore.lastValidation.result.type_errors.slice(0, 5)"
                    :key="`${err.row_index}-${err.column}`"
                    class="text-xs text-red-700"
                  >
                    Fila {{ err.row_index + 1 }} — <span class="font-mono">{{ err.column }}</span>: {{ err.error }}
                  </p>
                  <p v-if="datasetsStore.lastValidation.result.type_errors.length > 5" class="text-xs text-red-600 italic">
                    y {{ datasetsStore.lastValidation.result.type_errors.length - 5 }} errores más…
                  </p>
                </div>
                <!-- Coordenadas duplicadas dentro del archivo (advertencia, no bloquea validez) -->
                <div v-if="datasetsStore.lastValidation.result.duplicate_rows?.length" class="space-y-0.5">
                  <p class="text-xs font-medium text-amber-700">
                    Coordenadas repetidas en el archivo — {{ datasetsStore.lastValidation.result.duplicate_rows.length }} grupo{{ datasetsStore.lastValidation.result.duplicate_rows.length !== 1 ? 's' : '' }}:
                  </p>
                  <p
                    v-for="group in datasetsStore.lastValidation.result.duplicate_rows"
                    :key="`${group.latitude}-${group.longitude}`"
                    class="text-xs text-amber-700"
                  >
                    ({{ group.latitude }}, {{ group.longitude }}) — filas {{ group.row_indices.map(i => i + 1).join(', ') }}
                  </p>
                </div>
              </template>

              <!-- Resultado de confirmación -->
              <template v-else-if="datasetsStore.lastCommit">
                <p class="text-sm font-semibold" :class="datasetsStore.lastCommit.result.inserted > 0 ? 'text-green-800' : 'text-orange-800'">
                  {{ datasetsStore.lastCommit.result.inserted > 0 ? '✓ Dataset confirmado' : '⚠ Sin filas insertadas' }}
                  <span class="font-normal ml-1.5 opacity-70">{{ datasetsStore.lastCommit.filename }}</span>
                </p>
                <div class="space-y-0.5 text-xs" :class="datasetsStore.lastCommit.result.inserted > 0 ? 'text-green-700' : 'text-orange-700'">
                  <p><strong>{{ datasetsStore.lastCommit.result.inserted.toLocaleString('es-PE') }}</strong> punto{{ datasetsStore.lastCommit.result.inserted !== 1 ? 's' : '' }} de reciclaje insertado{{ datasetsStore.lastCommit.result.inserted !== 1 ? 's' : '' }}</p>
                  <p v-if="datasetsStore.lastCommit.result.skipped_duplicates > 0">{{ datasetsStore.lastCommit.result.skipped_duplicates }} duplicado{{ datasetsStore.lastCommit.result.skipped_duplicates !== 1 ? 's' : '' }} omitido{{ datasetsStore.lastCommit.result.skipped_duplicates !== 1 ? 's' : '' }}</p>
                  <p v-if="datasetsStore.lastCommit.result.errors.length > 0">{{ datasetsStore.lastCommit.result.errors.length }} fila{{ datasetsStore.lastCommit.result.errors.length !== 1 ? 's' : '' }} con error</p>
                </div>
              </template>

              <!-- Error de API -->
              <template v-else-if="datasetsStore.actionError">
                <p class="text-sm font-semibold text-red-800">Error al procesar el dataset</p>
                <p class="text-xs text-red-700">{{ datasetsStore.actionError }}</p>
              </template>

            </div>
            <button
              @click="datasetsStore.clearLastResult()"
              class="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
              aria-label="Cerrar"
            >
              <X class="w-3.5 h-3.5 opacity-50" />
            </button>
          </div>
        </div>

      </section>

    </div>
  </div>
</template>
