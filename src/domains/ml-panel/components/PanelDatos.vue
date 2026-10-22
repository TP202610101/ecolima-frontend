<script setup lang="ts">
import { onMounted, computed, ref, watch } from 'vue'
import { Calendar, Upload, Database, FileText, X, Download, Trash2, Pencil, Save, History, FileX, Info } from '@lucide/vue'
import { useDatasetsStore } from '@/domains/datasets/stores/useDatasetsStore'
import { DatasetsRepository } from '@/domains/datasets/repositories/DatasetsRepository'
import type { Dataset } from '@/domains/datasets/entities/Dataset'
import type { DatasetAuditEntry } from '@/domains/datasets/repositories/DatasetsRepository'
import { useAuth } from '@/shared/composables/useAuth'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'
import KpiCard from '@/shared/components/KpiCard.vue'

// Pestaña «Datos» del Panel ML: carga y depuración de datasets de puntos de reciclaje (/api/v1/datasets).
// Viene tal cual de la sección «Dataset» del panel anterior. Confirmar un dataset inserta puntos en el
// mapa público (recycling_points) y no se puede deshacer desde la aplicación; no toca el paquete del modelo.
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

const showHistoryModal = ref(false)
const historyDatasetName = ref('')


const timelineEntries = computed(() => {
  const r = datasetsStore.historyResult
  if (!r) return []
  const all = [
    ...r.uploads,
    ...r.validations,
    ...r.edits,
    ...(r.commit ? [r.commit] : []),
  ] as DatasetAuditEntry[]
  return all.sort((a, b) => {
    if (!a.created_at) return 1
    if (!b.created_at) return -1
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
})

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    upload: 'Cargado',
    validate: 'Validado',
    validation: 'Validado',
    edit_cell: 'Celda editada',
    delete_rows: 'Filas eliminadas',
    delete_incomplete_rows: 'Filas incompletas eliminadas',
    commit: 'Confirmado',
  }
  return map[action] ?? action
}

function actionDotClass(action: string, details: Record<string, unknown> | null): string {
  if (action === 'upload') return 'bg-blue-400'
  if (action === 'validate' || action === 'validation')
    return details?.valid ? 'bg-green-500' : 'bg-red-500'
  if (action === 'edit_cell') return 'bg-amber-400'
  if (action === 'delete_rows' || action === 'delete_incomplete_rows') return 'bg-orange-400'
  if (action === 'commit') return 'bg-green-600'
  return 'bg-gray-400'
}

function actionSummary(action: string, details: Record<string, unknown> | null): string {
  if (!details) return ''
  if (action === 'upload')
    return `${details.row_count} filas`
  if (action === 'validate' || action === 'validation') {
    const base = details.valid ? '✓ Válido' : '✗ Inválido'
    const counts = `${details.valid_rows} filas válidas, ${details.error_rows} con error`
    const types = (details.type_error_count as number) > 0
      ? `, ${details.type_error_count} errores de tipo` : ''
    return `${base} — ${counts}${types}`
  }
  if (action === 'edit_cell')
    return `Columna "${details.column}": ${details.old_value} → ${details.new_value}`
  if (action === 'delete_rows')
    return `${details.deleted_count} fila(s) eliminada(s)${details.reason ? ` · "${details.reason}"` : ''}`
  if (action === 'delete_incomplete_rows')
    return `${details.deleted_count} fila(s) incompleta(s) eliminada(s)`
  if (action === 'commit')
    return `${details.inserted} punto(s) de reciclaje insertado(s), ${details.skipped_duplicates} omitido(s)`
  return ''
}

function fmtDateTime(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-PE', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

async function handleViewHistory(ds: { dataset_id: number; filename: string }) {
  historyDatasetName.value = ds.filename
  showHistoryModal.value = true
  await datasetsStore.fetchHistory(ds.dataset_id)
}

function closeHistoryModal() {
  showHistoryModal.value = false
  datasetsStore.clearHistory()
  historyDatasetName.value = ''
}

const exportingId = ref<string | null>(null)
const exportError = ref<string | null>(null)

const selectedTypeErrors = ref<number[]>([])
const deleteReason = ref('')
const previewingDelete = ref(false)
const previewError = ref<string | null>(null)

const editingInputs = ref<Record<string, string>>({})

const validationDataset = computed(() => {
  const lv = datasetsStore.lastValidation
  if (!lv) return null
  return datasetsStore.datasets.find(d => d.dataset_id === lv.datasetId) ?? null
})

function fmtDate(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-PE', { year: 'numeric', month: 'short', day: 'numeric' })
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

function handleDeleteDataset(ds: Dataset) {
  confirm.value = {
    visible: true,
    title: 'Eliminar dataset',
    message: `¿Eliminar "${ds.filename}"? Esto eliminará el dataset completo, incluyendo el archivo subido. Esta acción no se puede deshacer.`,
    confirmLabel: 'Eliminar',
    variant: 'danger',
    action: () => datasetsStore.deleteDataset(ds.dataset_id),
  }
}

function handleCommit(ds: Dataset) {
  confirm.value = {
    visible: true,
    title: 'Confirmar dataset',
    message: `Los puntos válidos de "${ds.filename}" se agregarán al mapa público. Esta acción no se puede deshacer desde la aplicación y no cambia el paquete del modelo.`,
    confirmLabel: 'Confirmar',
    action: () => datasetsStore.commitDataset(ds.dataset_id, ds.filename),
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

onMounted(() => datasetsStore.fetchDatasets())
</script>

<template>
  <div class="space-y-4">
    <div
      class="flex items-start gap-2 p-3 rounded-lg border border-blue-200 bg-blue-50 text-sm text-blue-900"
      role="note"
      data-prueba="aviso-datasets"
    >
      <Info class="w-4 h-4 mt-0.5 flex-shrink-0" />
      <p>Los datasets confirmados actualizan los puntos del mapa público, no el paquete del modelo.</p>
    </div>

    <!-- Modal historial de dataset -->
    <Teleport to="body">
      <div
        v-if="showHistoryModal"
        class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      >
        <div
          class="absolute inset-0 bg-black/50"
          @click="closeHistoryModal"
        />
        <div class="relative bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-white">
            <div class="flex items-center gap-2 min-w-0">
              <History class="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <h2 class="text-sm font-semibold text-foreground truncate">
                Historial — {{ historyDatasetName }}
              </h2>
            </div>
            <button
              class="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 ml-2"
              @click="closeHistoryModal"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <div class="p-6">
            <!-- Loading -->
            <div
              v-if="datasetsStore.loadingHistory"
              class="space-y-3"
            >
              <div
                v-for="i in 4"
                :key="i"
                class="h-14 bg-gray-100 rounded animate-pulse"
              />
            </div>

            <!-- Error -->
            <div
              v-else-if="datasetsStore.historyError"
              class="p-4 bg-red-50 border border-red-200 rounded-lg"
            >
              <p class="text-sm text-red-700">
                {{ datasetsStore.historyError }}
              </p>
            </div>

            <!-- Vacío -->
            <div
              v-else-if="timelineEntries.length === 0"
              class="flex flex-col items-center justify-center py-8 text-center"
            >
              <History class="w-10 h-10 text-muted-foreground/30 mb-2" />
              <p class="text-sm text-muted-foreground">
                Sin acciones registradas para este dataset
              </p>
            </div>

            <!-- Timeline -->
            <div
              v-else
              class="relative pl-6"
            >
              <div class="absolute left-[9px] top-2 bottom-2 w-px bg-border" />
              <div
                v-for="(entry, idx) in timelineEntries"
                :key="entry.audit_id ?? idx"
                class="relative mb-5 last:mb-0"
              >
                <span
                  class="absolute -left-6 top-0.5 w-3 h-3 rounded-full border-2 border-white flex-shrink-0"
                  :class="actionDotClass(entry.action, entry.details)"
                />
                <div>
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-sm font-medium text-foreground">{{ actionLabel(entry.action) }}</span>
                    <span class="text-xs text-muted-foreground">{{ fmtDateTime(entry.created_at) }}</span>
                  </div>
                  <p
                    v-if="actionSummary(entry.action, entry.details)"
                    class="text-xs text-muted-foreground mt-0.5"
                  >
                    {{ actionSummary(entry.action, entry.details) }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>


    <section class="space-y-4">
      <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <h2 class="text-lg font-semibold text-foreground flex-1">
          Datasets de puntos de reciclaje
        </h2>
        <button
          class="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 border border-primary text-primary text-sm font-medium rounded-md hover:bg-accent transition-colors"
          @click="datasetsStore.openUploader()"
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
          <h3 class="text-sm font-semibold text-foreground">
            Preview del dataset (últimos 5)
          </h3>
        </div>

        <div
          v-if="datasetsStore.loading"
          class="p-4 space-y-3"
        >
          <div
            v-for="i in 5"
            :key="i"
            class="h-10 bg-gray-100 rounded animate-pulse"
          />
        </div>

        <div
          v-else-if="!datasetsStore.datasets.length"
          class="flex flex-col items-center justify-center py-12 text-center"
        >
          <FileText class="w-10 h-10 text-muted-foreground/30 mb-2" />
          <p class="text-sm text-muted-foreground">
            No hay datasets subidos aún
          </p>
        </div>

        <div
          v-else
          class="overflow-x-auto"
        >
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border bg-gray-50">
                <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  ID
                </th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Nombre archivo
                </th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Filas
                </th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Estado
                </th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Fecha
                </th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="ds in datasetsStore.datasets.slice(0, 5)"
                :key="ds.dataset_id"
                class="border-b border-border hover:bg-secondary transition-colors last:border-0"
              >
                <td class="px-4 py-4 text-muted-foreground">
                  {{ ds.dataset_id }}
                </td>
                <td class="px-4 py-4">
                  <div class="flex items-center gap-2">
                    <FileText class="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span class="font-medium text-foreground truncate max-w-[220px]">{{ ds.filename }}</span>
                  </div>
                </td>
                <td class="px-4 py-4 text-foreground">
                  {{ ds.row_count.toLocaleString('es-PE') }}
                </td>
                <td class="px-4 py-4">
                  <span
                    :class="['inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', datasetStatusClass(ds.status)]"
                  >
                    {{ datasetStatusLabel(ds.status) }}
                  </span>
                </td>
                <td class="px-4 py-4 text-muted-foreground">
                  {{ fmtDate(ds.uploaded_at) }}
                </td>
                <td class="px-4 py-4">
                  <div class="flex flex-wrap items-center gap-1">
                    <!-- Validar: pending, invalid o failed -->
                    <button
                      v-if="ds.status === 'pending' || ds.status === 'invalid' || ds.status === 'failed'"
                      :disabled="datasetsStore.validatingId !== null || datasetsStore.committingId !== null"
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      @click="datasetsStore.validateDataset(ds.dataset_id, ds.filename)"
                    >
                      <span
                        v-if="datasetsStore.validatingId === ds.dataset_id"
                        class="w-3 h-3 border border-gray-500 border-t-transparent rounded-full animate-spin"
                      />
                      {{ datasetsStore.validatingId === ds.dataset_id ? 'Validando…' : 'Validar' }}
                    </button>
                    <!-- Confirmar: valid -->
                    <button
                      v-else-if="ds.status === 'valid'"
                      :disabled="datasetsStore.validatingId !== null || datasetsStore.committingId !== null"
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-md hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      @click="handleCommit(ds)"
                    >
                      <span
                        v-if="datasetsStore.committingId === ds.dataset_id"
                        class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"
                      />
                      {{ datasetsStore.committingId === ds.dataset_id ? 'Aplicando…' : 'Confirmar' }}
                    </button>
                    <!-- committed: exportar CSV / XLSX -->
                    <template v-else>
                      <button
                        v-for="fmt in (['csv', 'xlsx'] as const)"
                        :key="fmt"
                        :disabled="exportingId !== null"
                        class="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase"
                        @click="handleExport(ds.dataset_id, fmt)"
                      >
                        <span
                          v-if="exportingId === `${ds.dataset_id}-${fmt}`"
                          class="w-3 h-3 border border-gray-500 border-t-transparent rounded-full animate-spin"
                        />
                        <Download
                          v-else
                          class="w-3 h-3"
                        />
                        {{ fmt }}
                      </button>
                    </template>
                    <!-- Eliminar filas incompletas — solo admin, solo no confirmado -->
                    <button
                      v-if="isAdmin && ds.status !== 'committed'"
                      :disabled="datasetsStore.deletingRows !== null"
                      :title="`Eliminar filas sin lat/lon/distrito en ${ds.filename}`"
                      class="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      @click="handleDeleteIncomplete(ds)"
                    >
                      <span
                        v-if="datasetsStore.deletingRows === ds.dataset_id"
                        class="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin"
                      />
                      <Trash2
                        v-else
                        class="w-3 h-3"
                      />
                      Limpiar
                    </button>
                    <!-- Ver historial -->
                    <button
                      :title="`Ver historial de acciones de ${ds.filename}`"
                      class="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-secondary transition-colors"
                      @click="handleViewHistory(ds)"
                    >
                      <History class="w-3 h-3" />
                      Historial
                    </button>
                    <!-- Eliminar dataset — solo no confirmados -->
                    <button
                      v-if="ds.status !== 'committed'"
                      :disabled="datasetsStore.deletingDataset !== null"
                      :title="`Eliminar dataset ${ds.filename} por completo`"
                      class="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      @click="handleDeleteDataset(ds)"
                    >
                      <span
                        v-if="datasetsStore.deletingDataset === ds.dataset_id"
                        class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"
                      />
                      <FileX
                        v-else
                        class="w-3 h-3"
                      />
                      Eliminar
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
            <p class="text-sm font-semibold text-green-800">
              ✓ Filas eliminadas correctamente
            </p>
            <p class="text-xs text-green-700 mt-0.5">
              {{ datasetsStore.deleteRowsResult.deleted_count }} fila{{ datasetsStore.deleteRowsResult.deleted_count !== 1 ? 's' : '' }}
              eliminada{{ datasetsStore.deleteRowsResult.deleted_count !== 1 ? 's' : '' }} de "{{ datasetsStore.deleteRowsResult.filename }}".
              Quedan {{ datasetsStore.deleteRowsResult.remaining_rows }} en el dataset.
              <span class="font-medium">Valida de nuevo antes de confirmar.</span>
            </p>
          </template>
          <template v-else>
            <p class="text-sm font-semibold text-red-800">
              Error al eliminar filas
            </p>
            <p class="text-xs text-red-700">
              {{ datasetsStore.deleteRowsError }}
            </p>
          </template>
        </div>
        <button
          class="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
          aria-label="Cerrar"
          @click="datasetsStore.clearDeleteResult()"
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
            <p class="text-sm font-semibold text-amber-800">
              ✓ Celdas editadas correctamente
            </p>
            <p class="text-xs text-amber-700 mt-0.5">
              {{ datasetsStore.editCellsResult.edited_count }} celda{{ datasetsStore.editCellsResult.edited_count !== 1 ? 's' : '' }}
              modificada{{ datasetsStore.editCellsResult.edited_count !== 1 ? 's' : '' }} en "{{ datasetsStore.editCellsResult.filename }}".
              <span class="font-medium">Valida de nuevo antes de confirmar.</span>
            </p>
          </template>
          <template v-else>
            <p class="text-sm font-semibold text-red-800">
              Error al editar celdas
            </p>
            <p class="text-xs text-red-700">
              {{ datasetsStore.editCellsError }}
            </p>
          </template>
        </div>
        <button
          class="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
          aria-label="Cerrar"
          @click="datasetsStore.clearEditCellsResult()"
        >
          <X class="w-3.5 h-3.5 opacity-50" />
        </button>
      </div>

      <!-- Error al eliminar dataset -->
      <div
        v-if="datasetsStore.deleteDatasetError"
        class="flex items-center justify-between gap-2 p-3 bg-red-50 border border-red-200 rounded-lg"
      >
        <p class="text-sm text-red-700">
          {{ datasetsStore.deleteDatasetError }}
        </p>
        <button
          class="p-1 rounded hover:bg-black/10 transition-colors flex-shrink-0"
          aria-label="Cerrar"
          @click="datasetsStore.clearDeleteDatasetError()"
        >
          <X class="w-3.5 h-3.5 opacity-50" />
        </button>
      </div>

      <!-- Error de exportación -->
      <div
        v-if="exportError"
        class="flex items-center justify-between gap-2 p-3 bg-red-50 border border-red-200 rounded-lg"
      >
        <p class="text-sm text-red-700">
          {{ exportError }}
        </p>
        <button
          class="p-1 rounded hover:bg-black/10 transition-colors"
          aria-label="Cerrar"
          @click="exportError = null"
        >
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
              <p
                class="text-sm font-semibold"
                :class="datasetsStore.lastValidation.result.valid ? 'text-green-800' : 'text-red-800'"
              >
                {{ datasetsStore.lastValidation.result.valid ? '✓ Dataset válido' : '✗ Dataset inválido' }}
                <span class="font-normal ml-1.5 opacity-70 truncate">{{ datasetsStore.lastValidation.filename }}</span>
              </p>
              <p
                class="text-xs"
                :class="datasetsStore.lastValidation.result.valid ? 'text-green-700' : 'text-red-700'"
              >
                {{ datasetsStore.lastValidation.result.valid_rows.toLocaleString('es-PE') }} filas válidas de {{ datasetsStore.lastValidation.result.row_count.toLocaleString('es-PE') }} totales
              </p>
              <!-- Columnas faltantes -->
              <div v-if="datasetsStore.lastValidation.result.missing_columns.length">
                <p class="text-xs font-medium text-red-800 mb-1">
                  Columnas faltantes:
                </p>
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="col in datasetsStore.lastValidation.result.missing_columns"
                    :key="col"
                    class="px-1.5 py-0.5 bg-red-100 text-red-800 text-xs rounded font-mono"
                  >{{ col }}</span>
                </div>
              </div>
              <!-- Errores de tipo -->
              <div
                v-if="datasetsStore.lastValidation.result.type_errors?.length"
                class="space-y-1"
              >
                <p class="text-xs font-medium text-red-800">
                  Errores de tipo — {{ datasetsStore.lastValidation.result.error_rows }} fila{{ datasetsStore.lastValidation.result.error_rows !== 1 ? 's' : '' }} afectada{{ datasetsStore.lastValidation.result.error_rows !== 1 ? 's' : '' }}:
                </p>
                <!-- Admin + dataset no confirmado: checkboxes + edición inline -->
                <template v-if="isAdmin && validationDataset && validationDataset.status !== 'committed'">
                  <div
                    v-for="err in (datasetsStore.lastValidation.result.type_errors ?? [])"
                    :key="`${err.row_index}-${err.column}`"
                    class="space-y-1"
                  >
                    <div class="flex items-start gap-2 text-xs text-red-700">
                      <input
                        type="checkbox"
                        :checked="selectedTypeErrors.includes(err.row_index)"
                        class="mt-0.5 accent-red-600 flex-shrink-0 cursor-pointer"
                        @change="toggleErrorRow(err.row_index)"
                      >
                      <span class="flex-1">
                        Fila {{ err.row_index + 1 }} — <span class="font-mono">{{ err.column }}</span>: {{ err.error }}
                      </span>
                      <button
                        :class="[
                          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs transition-colors flex-shrink-0',
                          `${err.row_index}|${err.column}` in editingInputs
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                        ]"
                        @click="toggleCellEdit(err)"
                      >
                        <Pencil class="w-2.5 h-2.5" />
                        {{ `${err.row_index}|${err.column}` in editingInputs ? 'Cancelar' : 'Editar' }}
                      </button>
                    </div>
                    <div
                      v-if="`${err.row_index}|${err.column}` in editingInputs"
                      class="ml-5 flex items-center gap-2"
                    >
                      <input
                        :value="editingInputs[`${err.row_index}|${err.column}`]"
                        type="text"
                        :placeholder="`Nuevo valor para ${err.column}`"
                        class="flex-1 min-w-0 border border-amber-300 rounded px-2 py-1 text-xs text-foreground bg-amber-50 focus:outline-none focus:border-amber-500"
                        @input="editingInputs[`${err.row_index}|${err.column}`] = ($event.target as HTMLInputElement).value"
                      >
                      <span class="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">actual: <span class="font-mono">{{ String(err.value ?? '(nulo)') }}</span></span>
                    </div>
                  </div>
                  <!-- Controles eliminar seleccionadas -->
                  <div
                    v-if="selectedTypeErrors.length > 0"
                    class="pt-2 mt-1 space-y-2 border-t border-red-100"
                  >
                    <input
                      v-model="deleteReason"
                      type="text"
                      placeholder="Motivo de eliminación (requerido)"
                      maxlength="200"
                      class="w-full border border-red-200 rounded-md px-2 py-1.5 text-xs text-foreground bg-white focus:outline-none focus:border-red-400 placeholder:text-muted-foreground/60"
                    >
                    <div class="flex items-center gap-2 flex-wrap">
                      <button
                        :disabled="!deleteReason.trim() || previewingDelete || datasetsStore.deletingRows !== null"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        @click="handleDeleteSelected"
                      >
                        <span
                          v-if="previewingDelete"
                          class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"
                        />
                        <Trash2
                          v-else
                          class="w-3 h-3"
                        />
                        Eliminar {{ selectedTypeErrors.length }} fila{{ selectedTypeErrors.length !== 1 ? 's' : '' }} seleccionada{{ selectedTypeErrors.length !== 1 ? 's' : '' }}
                      </button>
                      <button
                        class="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        @click="clearSelection"
                      >
                        Deseleccionar todo
                      </button>
                    </div>
                    <p
                      v-if="previewError"
                      class="text-xs text-red-700"
                    >
                      {{ previewError }}
                    </p>
                  </div>
                  <!-- Controles guardar ediciones de celdas -->
                  <div
                    v-if="Object.keys(editingInputs).length > 0"
                    class="pt-2 mt-1 space-y-1.5 border-t border-amber-100"
                  >
                    <p class="text-xs text-amber-700 font-medium">
                      {{ Object.keys(editingInputs).length }} celda{{ Object.keys(editingInputs).length !== 1 ? 's' : '' }} pendiente{{ Object.keys(editingInputs).length !== 1 ? 's' : '' }} de guardar
                    </p>
                    <div class="flex items-center gap-2 flex-wrap">
                      <button
                        :disabled="datasetsStore.editingCells !== null"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        @click="handleSaveCellEdits"
                      >
                        <span
                          v-if="datasetsStore.editingCells !== null"
                          class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"
                        />
                        <Save
                          v-else
                          class="w-3 h-3"
                        />
                        Guardar {{ Object.keys(editingInputs).length }} edición{{ Object.keys(editingInputs).length !== 1 ? 'es' : '' }}
                      </button>
                      <button
                        class="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        @click="clearCellEdits"
                      >
                        Cancelar todo
                      </button>
                    </div>
                  </div>
                </template>
                <!-- Solo lectura (no admin o dataset confirmado) -->
                <template v-else>
                  <p
                    v-for="err in (datasetsStore.lastValidation.result.type_errors?.slice(0, 5) ?? [])"
                    :key="`${err.row_index}-${err.column}`"
                    class="text-xs text-red-700"
                  >
                    Fila {{ err.row_index + 1 }} — <span class="font-mono">{{ err.column }}</span>: {{ err.error }}
                  </p>
                  <p
                    v-if="(datasetsStore.lastValidation.result.type_errors?.length ?? 0) > 5"
                    class="text-xs text-red-600 italic"
                  >
                    y {{ (datasetsStore.lastValidation.result.type_errors?.length ?? 0) - 5 }} errores más…
                  </p>
                </template>
              </div>
              <!-- Coordenadas duplicadas dentro del archivo (advertencia, no bloquea validez) -->
              <div
                v-if="datasetsStore.lastValidation.result.duplicate_rows?.length"
                class="space-y-0.5"
              >
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
              <p
                class="text-sm font-semibold"
                :class="datasetsStore.lastCommit.result.inserted > 0 ? 'text-green-800' : 'text-orange-800'"
              >
                {{ datasetsStore.lastCommit.result.inserted > 0 ? '✓ Dataset confirmado' : '⚠ Sin filas insertadas' }}
                <span class="font-normal ml-1.5 opacity-70">{{ datasetsStore.lastCommit.filename }}</span>
              </p>
              <div
                class="space-y-0.5 text-xs"
                :class="datasetsStore.lastCommit.result.inserted > 0 ? 'text-green-700' : 'text-orange-700'"
              >
                <p><strong>{{ datasetsStore.lastCommit.result.inserted.toLocaleString('es-PE') }}</strong> punto{{ datasetsStore.lastCommit.result.inserted !== 1 ? 's' : '' }} de reciclaje insertado{{ datasetsStore.lastCommit.result.inserted !== 1 ? 's' : '' }}</p>
                <p v-if="datasetsStore.lastCommit.result.skipped_duplicates > 0">
                  {{ datasetsStore.lastCommit.result.skipped_duplicates }} duplicado{{ datasetsStore.lastCommit.result.skipped_duplicates !== 1 ? 's' : '' }} omitido{{ datasetsStore.lastCommit.result.skipped_duplicates !== 1 ? 's' : '' }}
                </p>
                <p v-if="datasetsStore.lastCommit.result.errors.length > 0">
                  {{ datasetsStore.lastCommit.result.errors.length }} fila{{ datasetsStore.lastCommit.result.errors.length !== 1 ? 's' : '' }} con error
                </p>
              </div>
            </template>

            <!-- Error de API -->
            <template v-else-if="datasetsStore.actionError">
              <p class="text-sm font-semibold text-red-800">
                Error al procesar el dataset
              </p>
              <p class="text-xs text-red-700">
                {{ datasetsStore.actionError }}
              </p>
            </template>
          </div>
          <button
            class="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
            aria-label="Cerrar"
            @click="datasetsStore.clearLastResult()"
          >
            <X class="w-3.5 h-3.5 opacity-50" />
          </button>
        </div>
      </div>
    </section>
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
