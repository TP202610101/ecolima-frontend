<script setup lang="ts">
import { ref } from 'vue'
import { X, Upload, CheckCircle2, AlertCircle, FileText } from '@lucide/vue'
import { useDatasetsStore } from '../stores/useDatasetsStore'

const emit = defineEmits<{ close: [] }>()
const store = useDatasetsStore()

const selectedFile = ref<File | null>(null)

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  selectedFile.value = input.files?.[0] ?? null
  store.clearUploadState()
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

async function onUpload() {
  if (!selectedFile.value) return
  await store.uploadDataset(selectedFile.value)
}

function onClose() {
  store.clearUploadState()
  selectedFile.value = null
  emit('close')
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
    @click.self="onClose"
  >
    <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">

      <button
        @click="onClose"
        class="absolute top-4 right-4 p-1 rounded hover:bg-secondary transition-colors"
        aria-label="Cerrar"
      >
        <X class="w-4 h-4 text-muted-foreground" />
      </button>

      <div class="flex items-center gap-3 mb-6">
        <div class="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
          <Upload class="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 class="text-base font-semibold text-foreground">Subir nuevo dataset</h2>
          <p class="text-xs text-muted-foreground">Solo archivos CSV</p>
        </div>
      </div>

      <!-- Estado éxito -->
      <div v-if="store.uploadResult" class="text-center py-6">
        <CheckCircle2 class="w-12 h-12 text-green-600 mx-auto mb-3" />
        <p class="text-sm font-semibold text-foreground">Dataset cargado correctamente</p>
        <p class="text-xs text-muted-foreground mt-1">
          {{ store.uploadResult.row_count.toLocaleString('es-PE') }} filas procesadas
        </p>
        <p class="text-xs text-muted-foreground mt-0.5 truncate px-4">{{ store.uploadResult.filename }}</p>
        <button
          @click="onClose"
          class="mt-5 px-4 py-2 bg-primary text-white text-sm rounded-md font-medium hover:bg-primary-hover transition-colors"
        >
          Cerrar
        </button>
      </div>

      <!-- Formulario de subida -->
      <template v-else>

        <!-- Zona de selección de archivo -->
        <label
          class="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-8 cursor-pointer hover:border-primary hover:bg-accent/30 transition-colors"
          :class="{ 'border-primary bg-accent/30': selectedFile }"
        >
          <input type="file" accept=".csv" class="hidden" @change="onFileChange" />
          <FileText
            class="w-8 h-8 mb-2 transition-colors"
            :class="selectedFile ? 'text-primary' : 'text-muted-foreground'"
          />
          <span v-if="!selectedFile" class="text-sm text-muted-foreground text-center">
            Haz clic para seleccionar un archivo CSV
          </span>
          <template v-else>
            <span class="text-sm font-medium text-foreground text-center break-all">{{ selectedFile.name }}</span>
            <span class="text-xs text-muted-foreground mt-1">{{ formatSize(selectedFile.size) }}</span>
          </template>
        </label>

        <!-- Progreso de subida -->
        <div v-if="store.uploading" class="mt-4">
          <p class="text-xs text-muted-foreground mb-1.5">Subiendo archivo...</p>
          <div class="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div class="bg-primary h-1.5 rounded-full animate-pulse w-full" />
          </div>
        </div>

        <!-- Error -->
        <div v-if="store.uploadError" class="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle class="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p class="text-sm text-red-700">{{ store.uploadError }}</p>
        </div>

        <!-- Acciones -->
        <div class="flex gap-2 mt-6">
          <button
            @click="onClose"
            class="flex-1 px-4 py-2 border border-border rounded-md text-sm text-foreground hover:bg-secondary transition-colors"
          >
            Cancelar
          </button>
          <button
            @click="onUpload"
            :disabled="!selectedFile || store.uploading"
            class="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span
              v-if="store.uploading"
              class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
            />
            <Upload v-else class="w-4 h-4" />
            {{ store.uploading ? 'Subiendo...' : 'Subir dataset' }}
          </button>
        </div>

      </template>
    </div>
  </div>
</template>
