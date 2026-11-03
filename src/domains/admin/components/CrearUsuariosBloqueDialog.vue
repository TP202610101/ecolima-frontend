<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Download, Upload, X } from '@lucide/vue'
import TablaFilasCarga from './TablaFilasCarga.vue'
import { useCargaMasivaStore } from '../stores/useCargaMasivaStore'
import { LIMITE_FILAS } from '../entities/CargaMasiva'

// «Crear usuarios en bloque» (solo administrador): 1) elegir el CSV, 2) revisar la validación del servidor,
// 3) ver el resultado. Diálogo modal con foco inicial, trampa de foco y Escape (salvo mientras se envía).
const emit = defineEmits<{ cerrar: [creados: boolean] }>()
const store = useCargaMasivaStore()

const caja = ref<HTMLElement>()
const campoArchivo = ref<HTMLInputElement>()

// Plantilla generada en el cliente: cabecera y una fila de ejemplo. El BOM hace que Excel la abra en UTF-8.
const PLANTILLA = '﻿correo,nombre,rol\nana.perez@ejemplo.pe,Ana Pérez,analista\n'
const hrefPlantilla = `data:text/csv;charset=utf-8,${encodeURIComponent(PLANTILLA)}`

function alElegir(e: Event) {
  store.elegirArchivo((e.target as HTMLInputElement).files?.[0] ?? null)
}

function cerrar() {
  if (store.procesando) return
  const creados = store.paso === 'resultado'
  store.reiniciar()
  emit('cerrar', creados)
}

async function elegirOtro() {
  store.otroArchivo()
  await nextTick()
  campoArchivo.value?.focus()
}

// Al cambiar de paso, el foco vuelve al diálogo para que se lea el nuevo contenido desde el título.
watch(() => store.paso, async () => { await nextTick(); caja.value?.focus() })

const ENFOCABLES = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
function teclado(e: KeyboardEvent) {
  if (e.key === 'Escape') { e.preventDefault(); cerrar(); return }
  if (e.key !== 'Tab' || !caja.value) return
  const el = [...caja.value.querySelectorAll<HTMLElement>(ENFOCABLES)]
  if (!el.length) return
  const primero = el[0], ultimo = el[el.length - 1], activo = document.activeElement
  if (e.shiftKey && (activo === primero || activo === caja.value)) { e.preventDefault(); ultimo.focus() }
  else if (!e.shiftKey && activo === ultimo) { e.preventDefault(); primero.focus() }
}

onMounted(() => {
  store.reiniciar()
  document.addEventListener('keydown', teclado)
  caja.value?.focus()
})
onBeforeUnmount(() => document.removeEventListener('keydown', teclado))
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
    data-prueba="dialogo-bloque"
  >
    <div class="absolute inset-0 bg-black/40" />
    <div
      ref="caja"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bloque-titulo"
      :aria-busy="store.procesando ? 'true' : undefined"
      tabindex="-1"
      class="relative bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col focus:outline-none"
    >
      <div class="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <h2
          id="bloque-titulo"
          class="text-base font-semibold text-foreground"
        >
          Crear usuarios en bloque
        </h2>
        <button
          type="button"
          class="w-10 h-10 flex items-center justify-center rounded hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Cerrar"
          :disabled="store.procesando"
          @click="cerrar"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4 text-sm">
        <!-- Paso 1: archivo -->
        <template v-if="store.paso === 'archivo'">
          <ul
            class="list-disc pl-5 space-y-1 text-neutral-700"
            data-prueba="indicaciones-bloque"
          >
            <li>Archivo CSV (UTF-8) con las columnas <strong>correo, nombre, rol</strong>, separadas por coma o punto y coma.</li>
            <li>Solo se admite el rol <strong>analista</strong>.</li>
            <li>Máximo {{ LIMITE_FILAS }} filas y 1 MB.</li>
            <li>No incluyas contraseñas: cada persona recibe un correo para elegir la suya. El enlace vale 48 horas.</li>
          </ul>
          <a
            :href="hrefPlantilla"
            download="plantilla-usuarios.csv"
            class="inline-flex items-center gap-1.5 text-primary underline underline-offset-2"
            data-prueba="descargar-plantilla"
          >
            <Download
              class="w-4 h-4"
              aria-hidden="true"
            />Descargar plantilla
          </a>
          <div>
            <label
              for="bloque-archivo"
              class="block text-sm font-medium text-foreground mb-1"
            >Archivo CSV</label>
            <input
              id="bloque-archivo"
              ref="campoArchivo"
              type="file"
              accept=".csv,text/csv"
              :disabled="store.procesando"
              :aria-describedby="store.error ? 'bloque-error' : undefined"
              class="block w-full text-sm file:mr-3 file:px-3 file:py-2 file:rounded-md file:border file:border-border file:bg-white hover:file:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
              @change="alElegir"
            >
          </div>
        </template>

        <!-- Paso 2: revisión -->
        <template v-else-if="store.paso === 'revision' && store.validacion">
          <p
            role="status"
            class="font-medium text-foreground"
            data-prueba="resumen-validacion"
          >
            {{ store.validacion.total }} {{ store.validacion.total === 1 ? 'fila' : 'filas' }}, {{ store.conError }} con error
          </p>
          <p
            v-if="store.rechazadoAlCrear"
            role="alert"
            class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700"
          >
            Al crear, el servidor volvió a revisar el archivo y encontró errores. No se creó ningún usuario.
          </p>
          <p
            v-if="store.validacion.valid"
            class="text-green-800"
          >
            Todas las filas son correctas. Al crear, cada persona recibirá un correo para elegir su contraseña.
          </p>
          <p
            v-else
            id="bloque-corregir"
            class="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900"
          >
            Corrige el archivo y vuelve a subirlo. No se creará ningún usuario mientras haya filas con error.
          </p>
          <TablaFilasCarga :filas="store.validacion.rows" />
        </template>

        <!-- Paso 3: resultado -->
        <div
          v-else-if="store.paso === 'resultado' && store.resultado"
          role="status"
          aria-live="polite"
          class="space-y-2"
          data-prueba="resultado-bloque"
        >
          <p class="font-medium text-foreground">
            Se {{ store.resultado.created === 1 ? 'creó 1 usuario' : `crearon ${store.resultado.created} usuarios` }}.
          </p>
          <p>
            Se {{ store.resultado.invitations_sent === 1 ? 'envió 1 correo' : `enviaron ${store.resultado.invitations_sent} correos` }} de invitación.
          </p>
          <div
            v-if="store.resultado.invitations_failed.length"
            class="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 space-y-1"
            data-prueba="invitaciones-fallidas"
          >
            <p>No se pudo enviar la invitación a:</p>
            <ul class="list-disc pl-5">
              <li
                v-for="f in store.resultado.invitations_failed"
                :key="f.email"
              >
                {{ f.email }} (línea {{ f.line }})
              </li>
            </ul>
            <p>La cuenta sí se creó. La persona puede usar «¿Olvidaste tu contraseña?» en el inicio de sesión para elegir su contraseña.</p>
          </div>
        </div>

        <p
          v-if="store.error"
          id="bloque-error"
          role="alert"
          class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700"
        >
          {{ store.error }}
        </p>
      </div>

      <div class="flex flex-wrap justify-end gap-3 px-6 py-4 border-t border-border flex-shrink-0">
        <template v-if="store.paso === 'archivo'">
          <button
            type="button"
            class="min-h-10 px-4 py-2 text-sm border border-border rounded-md hover:bg-secondary disabled:opacity-50"
            :disabled="store.procesando"
            @click="cerrar"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-2 min-h-10 px-4 py-2 text-sm font-medium bg-primary text-white rounded-md hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!store.archivo || store.procesando"
            data-prueba="validar-archivo"
            @click="store.validar()"
          >
            <Upload
              class="w-4 h-4"
              aria-hidden="true"
            />{{ store.procesando ? 'Validando…' : 'Validar archivo' }}
          </button>
        </template>
        <template v-else-if="store.paso === 'revision'">
          <button
            type="button"
            class="min-h-10 px-4 py-2 text-sm border border-border rounded-md hover:bg-secondary disabled:opacity-50"
            :disabled="store.procesando"
            data-prueba="otro-archivo"
            @click="elegirOtro"
          >
            Elegir otro archivo
          </button>
          <button
            type="button"
            class="min-h-10 px-4 py-2 text-sm font-medium bg-primary text-white rounded-md hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!store.puedeCrear"
            :aria-describedby="store.validacion?.valid ? undefined : 'bloque-corregir'"
            data-prueba="crear-usuarios"
            @click="store.confirmar()"
          >
            {{ store.procesando ? 'Creando…' : 'Crear usuarios' }}
          </button>
        </template>
        <button
          v-else
          type="button"
          class="min-h-10 px-4 py-2 text-sm font-medium bg-primary text-white rounded-md hover:bg-primary-hover"
          @click="cerrar"
        >
          Cerrar
        </button>
      </div>
    </div>
  </div>
</template>
