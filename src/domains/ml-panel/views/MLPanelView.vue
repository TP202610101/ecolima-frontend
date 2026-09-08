<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref, watch } from 'vue'
import { RefreshCw, Clock, Calendar, TrendingUp, Upload, Database, FileText, Info, X, Layers, Download, Trash2, Pencil, Save } from '@lucide/vue'
import { useMLStore } from '../stores/useMLStore'
import { useDatasetsStore } from '@/domains/datasets/stores/useDatasetsStore'
import { DatasetsRepository } from '@/domains/datasets/repositories/DatasetsRepository'
import type { Dataset } from '@/domains/datasets/entities/Dataset'
import { useAuth } from '@/shared/composables/useAuth'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'
import KpiCard from '@/shared/components/KpiCard.vue'
import ShapChart from '../components/ShapChart.vue'

const mlStore = useMLStore()
const datasetsStore = useDatasetsStore()
const { isAdmin } = useAuth()

const confirm = ref<{
  visible: boolean
  title: string
  message: string
  confirmLabel: string
  variant?: 'normal' | 'danger'
  action: () => void
}>({ visible: false, title: '', message: '', confirmLabel: '', action: () => {} })

const showUpdateDetail = ref(false)
const exportingId = ref<string | null>(null)
const exportError = ref<string | null>(null)

const selectedTypeErrors = ref<number[]>([])
const deleteReason = ref('')
const previewingDelete = ref(false)
const previewError = ref<string | null>(null)

const editingInputs = ref<Record<string, string>>({})

const isBusy = computed(() => mlStore.inferring || mlStore.recalculating || mlStore.updating)

const validationDataset = computed(() => {
  const lv = datasetsStore.lastValidation
  if (!lv) return null
  return datasetsStore.datasets.find(d => d.dataset_id === lv.datasetId) ?? null
})

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

watch(() => datasetsStore.lastValidation, () => {
  selectedTypeErrors.value = []
  deleteReason.value = ''
  previewError.value = null
  editingInputs.value = {}
})

function toggleErrorRow(rowIndex: number) {
  const idx = selectedTypeErrors.value.indexOf(rowIndex)
  if (idx === -1) selectedTypeErrors.value.push(rowIndex)
  else selectedTypeErrors.value.splice(idx, 1)
}

function clearSelection() {
  selectedTypeErrors.value = []
  deleteReason.value = ''
}

function toggleCellEdit(err: { row_index: number; column: string; value: unknown }) {
  const key = `${err.row_index}|${err.column}`
  if (key in editingInputs.value) {
    const next = { ...editingInputs.value }
    delete next[key]
    editingInputs.value = next
  } else {
    editingInputs.value = { ...editingInputs.value, [key]: String(err.value ?? '') }
  }
}

function clearCellEdits() {
  editingInputs.value = {}
}

function handleSaveCellEdits() {
  const validation = datasetsStore.lastValidation
  if (!validation) return
  const inputs = editingInputs.value
  const keys = Object.keys(inputs)
  if (keys.length === 0) return

  const edits = keys.map(key => {
    const pipeIdx = key.indexOf('|')
    const rowIndex = parseInt(key.slice(0, pipeIdx))
    const column = key.slice(pipeIdx + 1)
    return { row_index: rowIndex, column, new_value: inputs[key] }
  })

  confirm.value = {
    visible: true,
    title: 'Guardar ediciones de celdas',
    message: `Se modificarán ${keys.length} celda${keys.length !== 1 ? 's' : ''} en "${validation.filename}". Estas ediciones quedan registradas en el log de auditoría y el dataset deberá re-validarse.`,
    confirmLabel: 'Guardar',
    action: () => {
      datasetsStore.editCells(validation.datasetId, validation.filename, edits)
      editingInputs.value = {}
    },
  }
}

function handleDeleteIncomplete(ds: Dataset) {
  confirm.value = {
    visible: true,
    title: 'Eliminar filas incompletas',
    message: `Esto eliminará todas las filas sin latitud, longitud o distrito en "${ds.filename}". Esta acción no se puede deshacer.`,
    confirmLabel: 'Eliminar',
    variant: 'danger',
    action: () => datasetsStore.deleteIncompleteRows(ds.dataset_id, ds.filename),
  }
}

async function handleDeleteSelected() {
  const validation = datasetsStore.lastValidation
  if (!validation || selectedTypeErrors.value.length === 0) return
  const reason = deleteReason.value.trim()
  if (!reason) return

  previewingDelete.value = true
  previewError.value = null
  let preview: { deleted_count: number; remaining_rows: number }
  try {
    preview = await DatasetsRepository.deleteSelectedRows(
      validation.datasetId,
      selectedTypeErrors.value,
      reason,
      false,
    )
  } catch (e) {
    previewError.value = e instanceof Error ? e.message : 'Error al previsualizar eliminación'
    previewingDelete.value = false
    return
  }
  previewingDelete.value = false

  const rowsToDelete = [...selectedTypeErrors.value]
  confirm.value = {
    visible: true,
    title: 'Eliminar filas seleccionadas',
    message: `Se eliminarán ${preview.deleted_count} fila${preview.deleted_count !== 1 ? 's' : ''} de "${validation.filename}". Quedarán ${preview.remaining_rows} en el dataset. Esta acción no se puede deshacer.`,
    confirmLabel: 'Eliminar',
    variant: 'danger',
    action: () => {
      datasetsStore.deleteSelectedRows(validation.datasetId, validation.filename, rowsToDelete, reason)
      selectedTypeErrors.value = []
      deleteReason.value = ''
    },
  }
}

function handleActivate(version: string) {
  confirm.value = {
    visible: true,
    title: 'Activar modelo',
    message: `¿Activar el modelo "${version}"? El sistema usará este modelo para las próximas inferencias.`,
    confirmLabel: 'Activar',
    action: () => mlStore.activateModel(version),
  }
}

function handleRecalculate() {
  confirm.value = {
    visible: true,
    title: 'Recalcular cobertura',
    message: '¿Recalcular cobertura? Esto actualiza las zonas recomendadas según los puntos de reciclaje actuales. Puede tardar unos segundos.',
    confirmLabel: 'Recalcular',
    action: () => mlStore.recalculateCoverage(),
  }
}

function handleUpdate() {
  confirm.value = {
    visible: true,
    title: 'Actualizar recomendaciones',
    message: 'Esto recalculará la cobertura y volverá a ejecutar el modelo sobre todo Lima Metropolitana. Puede tardar varios minutos.',
    confirmLabel: 'Actualizar',
    action: () => { showUpdateDetail.value = false; mlStore.updateRecommendations() },
  }
}

async function handleExport(datasetId: number, format: 'csv' | 'xlsx') {
  const key = `${datasetId}-${format}`
  exportingId.value = key
  exportError.value = null
  try {
    const { blob, filename } = await DatasetsRepository.exportDataset(datasetId, format)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (e) {
    exportError.value = e instanceof Error ? e.message : 'Error al exportar el dataset'
  } finally {
    exportingId.value = null
  }
}

function priorityDot(label: string): string {
  if (label === 'Alta') return 'bg-green-600'
  if (label === 'Media') return 'bg-yellow-500'
  return 'bg-gray-400'
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
            v-if="isAdmin"
            @click="handleUpdate"
            :disabled="isBusy"
            title="Recalcula cobertura y re-ejecuta el modelo; muestra qué zonas cambiaron"
            class="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 border border-primary text-primary text-sm font-medium rounded-md hover:bg-accent transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span v-if="mlStore.updating" class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <Layers v-else class="w-4 h-4" />
            {{ mlStore.updating ? 'Actualizando...' : 'Actualizar recomendaciones' }}
          </button>
          <button
            v-if="isAdmin"
            @click="handleRecalculate"
            :disabled="isBusy"
            title="Actualiza las zonas recomendadas y la cobertura según los puntos actuales"
            class="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 border border-primary text-primary text-sm font-medium rounded-md hover:bg-accent transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span v-if="mlStore.recalculating" class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <RefreshCw v-else class="w-4 h-4" />
            {{ mlStore.recalculating ? 'Recalculando...' : 'Recalcular cobertura' }}
          </button>
          <button
            @click="mlStore.runInference()"
            :disabled="isBusy"
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

        <!-- Resultado de actualizar recomendaciones -->
        <div
          v-if="mlStore.updateResult || mlStore.updateError"
          class="flex flex-col gap-2 p-4 rounded-lg border"
          :class="mlStore.updateResult ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1 min-w-0">
              <template v-if="mlStore.updateResult">
                <p class="text-sm font-semibold text-blue-800">✓ Recomendaciones actualizadas</p>
                <p class="text-xs text-blue-700 mt-0.5">
                  <span class="font-medium">{{ mlStore.updateResult.newZones.length }}</span> zonas nuevas ·
                  <span class="font-medium">{{ mlStore.updateResult.retiredZones.length }}</span> retiradas ·
                  <span class="font-medium">{{ mlStore.updateResult.unchangedCount }}</span> sin cambios
                </p>
              </template>
              <template v-else>
                <p class="text-sm font-semibold text-red-800">Error al actualizar recomendaciones</p>
                <p class="text-xs text-red-700 mt-0.5">{{ mlStore.updateError }}</p>
              </template>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <button
                v-if="mlStore.updateResult && (mlStore.updateResult.newZones.length || mlStore.updateResult.retiredZones.length)"
                @click="showUpdateDetail = !showUpdateDetail"
                class="text-xs text-blue-600 hover:underline whitespace-nowrap"
              >
                {{ showUpdateDetail ? 'Ocultar' : 'Ver detalle' }}
              </button>
              <button
                @click="mlStore.updateResult = null; mlStore.updateError = null; showUpdateDetail = false"
                class="p-1 rounded hover:bg-black/10 transition-colors"
                aria-label="Cerrar"
              >
                <X class="w-3.5 h-3.5 opacity-50" />
              </button>
            </div>
          </div>

          <!-- Detalle expandible: nuevas y retiradas -->
          <div v-if="showUpdateDetail && mlStore.updateResult" class="space-y-3 pt-1 border-t border-blue-200">
            <div v-if="mlStore.updateResult.newZones.length">
              <p class="text-xs font-semibold text-blue-800 mb-1">
                Nuevas recomendadas ({{ mlStore.updateResult.newZones.length }}):
              </p>
              <ul class="space-y-1">
                <li
                  v-for="z in mlStore.updateResult.newZones"
                  :key="z.zoneId"
                  class="flex items-center gap-2 text-xs text-blue-700"
                >
                  <span class="w-2 h-2 rounded-full flex-shrink-0" :class="priorityDot(z.priorityLabel)" />
                  {{ z.districtName }} — Zona {{ z.zoneId }}
                  <span class="text-blue-500">({{ z.priorityLabel }})</span>
                </li>
              </ul>
            </div>
            <div v-if="mlStore.updateResult.retiredZones.length">
              <p class="text-xs font-semibold text-blue-800 mb-1">
                Ya no se recomiendan ({{ mlStore.updateResult.retiredZones.length }}):
              </p>
              <ul class="space-y-1">
                <li
                  v-for="z in mlStore.updateResult.retiredZones"
                  :key="z.zoneId"
                  class="flex items-center gap-2 text-xs text-blue-500 line-through"
                >
                  <span class="w-2 h-2 rounded-full flex-shrink-0 opacity-50" :class="priorityDot(z.priorityLabel)" />
                  {{ z.districtName }} — Zona {{ z.zoneId }}
                  <span>({{ z.priorityLabel }})</span>
                </li>
              </ul>
            </div>
            <p
              v-if="!mlStore.updateResult.newZones.length && !mlStore.updateResult.retiredZones.length"
              class="text-xs text-blue-600 italic"
            >
              Las zonas recomendadas no cambiaron con esta inferencia.
            </p>
          </div>
        </div>

        <!-- Resultado de recalcular cobertura -->
        <div
          v-if="mlStore.recalculateResult || mlStore.recalculateError"
          class="flex items-start gap-3 p-3 rounded-lg border"
          :class="mlStore.recalculateResult ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'"
        >
          <div class="flex-1 min-w-0">
            <template v-if="mlStore.recalculateResult">
              <p class="text-sm font-semibold text-green-800">✓ Cobertura recalculada</p>
              <p class="text-xs text-green-700 mt-0.5">
                {{ mlStore.recalculateResult.is_suitable.updated_zones }} zonas evaluadas —
                {{ mlStore.recalculateResult.is_suitable.positive_labels }} aptas,
                {{ mlStore.recalculateResult.is_suitable.negative_labels }} no aptas
              </p>
            </template>
            <template v-else>
              <p class="text-sm font-semibold text-red-800">Error al recalcular cobertura</p>
              <p class="text-xs text-red-700 mt-0.5">{{ mlStore.recalculateError }}</p>
            </template>
          </div>
          <button
            @click="mlStore.recalculateResult = null; mlStore.recalculateError = null"
            class="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
            aria-label="Cerrar"
          >
            <X class="w-3.5 h-3.5 opacity-50" />
          </button>
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

        <!-- Versiones de modelo disponibles -->
        <div class="bg-white rounded-lg border border-border overflow-hidden">
          <div class="px-6 py-4 border-b border-border">
            <h3 class="text-sm font-semibold text-foreground">Versiones de modelo</h3>
          </div>

          <div v-if="mlStore.error" class="px-6 py-3 bg-red-50 border-b border-red-100">
            <p class="text-xs text-red-700">{{ mlStore.error }}</p>
          </div>

          <div v-if="mlStore.loading" class="p-4 space-y-3">
            <div v-for="i in 3" :key="i" class="h-10 bg-gray-100 rounded animate-pulse" />
          </div>

          <div
            v-else-if="!mlStore.models.length"
            class="flex flex-col items-center justify-center py-10 text-center"
          >
            <p class="text-sm text-muted-foreground">No hay versiones de modelo disponibles</p>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-border bg-gray-50">
                  <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Versión</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Entrenado</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Accuracy</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">F1</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acción</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="m in mlStore.models"
                  :key="m.version_name"
                  class="border-b border-border hover:bg-secondary transition-colors last:border-0"
                >
                  <td class="px-4 py-3 font-mono text-xs text-foreground">{{ m.version_name }}</td>
                  <td class="px-4 py-3 text-muted-foreground">{{ fmtDate(m.training_date) }}</td>
                  <td class="px-4 py-3 text-foreground">{{ fmtPct(m.metrics?.accuracy) }}</td>
                  <td class="px-4 py-3 text-foreground">{{ fmtPct(m.metrics?.f1) }}</td>
                  <td class="px-4 py-3">
                    <span
                      v-if="m.is_active"
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                    >Activo</span>
                    <span v-else class="text-xs text-muted-foreground">—</span>
                  </td>
                  <td class="px-4 py-3">
                    <button
                      v-if="!m.is_active"
                      @click="handleActivate(m.version_name)"
                      :disabled="mlStore.activatingVersion !== null || mlStore.inferring"
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span v-if="mlStore.activatingVersion === m.version_name" class="w-3 h-3 border border-gray-500 border-t-transparent rounded-full animate-spin" />
                      {{ mlStore.activatingVersion === m.version_name ? 'Activando…' : 'Activar' }}
                    </button>
                    <span v-else class="text-xs text-muted-foreground">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

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
                    <div class="flex flex-wrap items-center gap-1">
                      <!-- Validar: pending, invalid o failed -->
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
                      <!-- committed: exportar CSV / XLSX -->
                      <template v-else>
                        <button
                          v-for="fmt in (['csv', 'xlsx'] as const)"
                          :key="fmt"
                          @click="handleExport(ds.dataset_id, fmt)"
                          :disabled="exportingId !== null"
                          class="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase"
                        >
                          <span v-if="exportingId === `${ds.dataset_id}-${fmt}`" class="w-3 h-3 border border-gray-500 border-t-transparent rounded-full animate-spin" />
                          <Download v-else class="w-3 h-3" />
                          {{ fmt }}
                        </button>
                      </template>
                      <!-- Eliminar filas incompletas — solo admin, solo no confirmado -->
                      <button
                        v-if="isAdmin && ds.status !== 'committed'"
                        @click="handleDeleteIncomplete(ds)"
                        :disabled="datasetsStore.deletingRows !== null"
                        :title="`Eliminar filas sin lat/lon/distrito en ${ds.filename}`"
                        class="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span v-if="datasetsStore.deletingRows === ds.dataset_id" class="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                        <Trash2 v-else class="w-3 h-3" />
                        Limpiar
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>

        <!-- Resultado de eliminación de filas -->
        <div
          v-if="datasetsStore.deleteRowsResult || datasetsStore.deleteRowsError"
          class="flex items-start gap-3 p-3 rounded-lg border"
          :class="datasetsStore.deleteRowsResult ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'"
        >
          <div class="flex-1 min-w-0">
            <template v-if="datasetsStore.deleteRowsResult">
              <p class="text-sm font-semibold text-green-800">✓ Filas eliminadas correctamente</p>
              <p class="text-xs text-green-700 mt-0.5">
                {{ datasetsStore.deleteRowsResult.deleted_count }} fila{{ datasetsStore.deleteRowsResult.deleted_count !== 1 ? 's' : '' }}
                eliminada{{ datasetsStore.deleteRowsResult.deleted_count !== 1 ? 's' : '' }} de "{{ datasetsStore.deleteRowsResult.filename }}".
                Quedan {{ datasetsStore.deleteRowsResult.remaining_rows }} en el dataset.
                <span class="font-medium">Valida de nuevo antes de confirmar.</span>
              </p>
            </template>
            <template v-else>
              <p class="text-sm font-semibold text-red-800">Error al eliminar filas</p>
              <p class="text-xs text-red-700">{{ datasetsStore.deleteRowsError }}</p>
            </template>
          </div>
          <button
            @click="datasetsStore.clearDeleteResult()"
            class="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
            aria-label="Cerrar"
          >
            <X class="w-3.5 h-3.5 opacity-50" />
          </button>
        </div>

        <!-- Resultado de edición de celdas -->
        <div
          v-if="datasetsStore.editCellsResult || datasetsStore.editCellsError"
          class="flex items-start gap-3 p-3 rounded-lg border"
          :class="datasetsStore.editCellsResult ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'"
        >
          <div class="flex-1 min-w-0">
            <template v-if="datasetsStore.editCellsResult">
              <p class="text-sm font-semibold text-amber-800">✓ Celdas editadas correctamente</p>
              <p class="text-xs text-amber-700 mt-0.5">
                {{ datasetsStore.editCellsResult.edited_count }} celda{{ datasetsStore.editCellsResult.edited_count !== 1 ? 's' : '' }}
                modificada{{ datasetsStore.editCellsResult.edited_count !== 1 ? 's' : '' }} en "{{ datasetsStore.editCellsResult.filename }}".
                <span class="font-medium">Valida de nuevo antes de confirmar.</span>
              </p>
            </template>
            <template v-else>
              <p class="text-sm font-semibold text-red-800">Error al editar celdas</p>
              <p class="text-xs text-red-700">{{ datasetsStore.editCellsError }}</p>
            </template>
          </div>
          <button
            @click="datasetsStore.clearEditCellsResult()"
            class="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
            aria-label="Cerrar"
          >
            <X class="w-3.5 h-3.5 opacity-50" />
          </button>
        </div>

        <!-- Error de exportación -->
        <div v-if="exportError" class="flex items-center justify-between gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-sm text-red-700">{{ exportError }}</p>
          <button @click="exportError = null" class="p-1 rounded hover:bg-black/10 transition-colors" aria-label="Cerrar">
            <X class="w-3.5 h-3.5 opacity-50" />
          </button>
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
                <div v-if="datasetsStore.lastValidation.result.type_errors.length" class="space-y-1">
                  <p class="text-xs font-medium text-red-800">
                    Errores de tipo — {{ datasetsStore.lastValidation.result.error_rows }} fila{{ datasetsStore.lastValidation.result.error_rows !== 1 ? 's' : '' }} afectada{{ datasetsStore.lastValidation.result.error_rows !== 1 ? 's' : '' }}:
                  </p>
                  <!-- Admin + dataset no confirmado: checkboxes + edición inline -->
                  <template v-if="isAdmin && validationDataset && validationDataset.status !== 'committed'">
                    <div
                      v-for="err in datasetsStore.lastValidation.result.type_errors"
                      :key="`${err.row_index}-${err.column}`"
                      class="space-y-1"
                    >
                      <div class="flex items-start gap-2 text-xs text-red-700">
                        <input
                          type="checkbox"
                          :checked="selectedTypeErrors.includes(err.row_index)"
                          @change="toggleErrorRow(err.row_index)"
                          class="mt-0.5 accent-red-600 flex-shrink-0 cursor-pointer"
                        />
                        <span class="flex-1">
                          Fila {{ err.row_index + 1 }} — <span class="font-mono">{{ err.column }}</span>: {{ err.error }}
                        </span>
                        <button
                          @click="toggleCellEdit(err)"
                          :class="[
                            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs transition-colors flex-shrink-0',
                            `${err.row_index}|${err.column}` in editingInputs
                              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                          ]"
                        >
                          <Pencil class="w-2.5 h-2.5" />
                          {{ `${err.row_index}|${err.column}` in editingInputs ? 'Cancelar' : 'Editar' }}
                        </button>
                      </div>
                      <div v-if="`${err.row_index}|${err.column}` in editingInputs" class="ml-5 flex items-center gap-2">
                        <input
                          :value="editingInputs[`${err.row_index}|${err.column}`]"
                          @input="editingInputs[`${err.row_index}|${err.column}`] = ($event.target as HTMLInputElement).value"
                          type="text"
                          :placeholder="`Nuevo valor para ${err.column}`"
                          class="flex-1 min-w-0 border border-amber-300 rounded px-2 py-1 text-xs text-foreground bg-amber-50 focus:outline-none focus:border-amber-500"
                        />
                        <span class="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">actual: <span class="font-mono">{{ String(err.value ?? '(nulo)') }}</span></span>
                      </div>
                    </div>
                    <!-- Controles eliminar seleccionadas -->
                    <div v-if="selectedTypeErrors.length > 0" class="pt-2 mt-1 space-y-2 border-t border-red-100">
                      <input
                        v-model="deleteReason"
                        type="text"
                        placeholder="Motivo de eliminación (requerido)"
                        maxlength="200"
                        class="w-full border border-red-200 rounded-md px-2 py-1.5 text-xs text-foreground bg-white focus:outline-none focus:border-red-400 placeholder:text-muted-foreground/60"
                      />
                      <div class="flex items-center gap-2 flex-wrap">
                        <button
                          @click="handleDeleteSelected"
                          :disabled="!deleteReason.trim() || previewingDelete || datasetsStore.deletingRows !== null"
                          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span v-if="previewingDelete" class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <Trash2 v-else class="w-3 h-3" />
                          Eliminar {{ selectedTypeErrors.length }} fila{{ selectedTypeErrors.length !== 1 ? 's' : '' }} seleccionada{{ selectedTypeErrors.length !== 1 ? 's' : '' }}
                        </button>
                        <button
                          @click="clearSelection"
                          class="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Deseleccionar todo
                        </button>
                      </div>
                      <p v-if="previewError" class="text-xs text-red-700">{{ previewError }}</p>
                    </div>
                    <!-- Controles guardar ediciones de celdas -->
                    <div v-if="Object.keys(editingInputs).length > 0" class="pt-2 mt-1 space-y-1.5 border-t border-amber-100">
                      <p class="text-xs text-amber-700 font-medium">
                        {{ Object.keys(editingInputs).length }} celda{{ Object.keys(editingInputs).length !== 1 ? 's' : '' }} pendiente{{ Object.keys(editingInputs).length !== 1 ? 's' : '' }} de guardar
                      </p>
                      <div class="flex items-center gap-2 flex-wrap">
                        <button
                          @click="handleSaveCellEdits"
                          :disabled="datasetsStore.editingCells !== null"
                          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span v-if="datasetsStore.editingCells !== null" class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <Save v-else class="w-3 h-3" />
                          Guardar {{ Object.keys(editingInputs).length }} edición{{ Object.keys(editingInputs).length !== 1 ? 'es' : '' }}
                        </button>
                        <button
                          @click="clearCellEdits"
                          class="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Cancelar todo
                        </button>
                      </div>
                    </div>
                  </template>
                  <!-- Solo lectura (no admin o dataset confirmado) -->
                  <template v-else>
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
                  </template>
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

  <ConfirmDialog
    v-if="confirm.visible"
    :title="confirm.title"
    :message="confirm.message"
    :confirm-label="confirm.confirmLabel"
    :variant="confirm.variant ?? 'normal'"
    @confirm="() => { confirm.action(); confirm.visible = false }"
    @cancel="confirm.visible = false"
  />
</template>
