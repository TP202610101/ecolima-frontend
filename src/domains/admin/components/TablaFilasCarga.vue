<script setup lang="ts">
import { CheckCircle2, XCircle } from '@lucide/vue'
import type { FilaCarga } from '../entities/CargaMasiva'

// Filas del CSV tal como las validó el servidor. El estado se indica con texto e icono, no solo con color,
// y los mensajes de error se muestran tal cual llegan (en español) bajo cada fila.
defineProps<{ filas: FilaCarga[] }>()
</script>

<template>
  <div class="overflow-x-auto border border-border rounded-lg">
    <table
      class="w-full text-sm"
      data-prueba="tabla-filas-carga"
    >
      <caption class="sr-only">
        Filas del archivo y su estado
      </caption>
      <thead>
        <tr class="border-b border-border bg-gray-50 text-left text-xs font-semibold text-muted-foreground">
          <th
            scope="col"
            class="px-3 py-2"
          >
            Línea
          </th>
          <th
            scope="col"
            class="px-3 py-2"
          >
            Correo
          </th>
          <th
            scope="col"
            class="px-3 py-2"
          >
            Nombre
          </th>
          <th
            scope="col"
            class="px-3 py-2"
          >
            Rol
          </th>
          <th
            scope="col"
            class="px-3 py-2"
          >
            Estado
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="f in filas"
          :key="f.line"
          class="border-b border-border last:border-0 align-top"
          :class="f.status === 'error' ? 'bg-red-50/60' : ''"
          :data-linea="f.line"
        >
          <td class="px-3 py-2 tabular-nums">
            {{ f.line }}
          </td>
          <td class="px-3 py-2 break-all">
            {{ f.email || '—' }}
          </td>
          <td class="px-3 py-2">
            {{ f.full_name || '—' }}
          </td>
          <td class="px-3 py-2">
            {{ f.role || '—' }}
          </td>
          <td class="px-3 py-2 min-w-[12rem]">
            <span
              v-if="f.status === 'ok'"
              class="inline-flex items-center gap-1 font-medium text-green-800"
            >
              <CheckCircle2
                class="w-4 h-4"
                aria-hidden="true"
              />Correcto
            </span>
            <template v-else>
              <span class="inline-flex items-center gap-1 font-medium text-red-700">
                <XCircle
                  class="w-4 h-4"
                  aria-hidden="true"
                />Error
              </span>
              <ul class="mt-1 list-disc pl-5 text-xs text-red-800 space-y-0.5">
                <li
                  v-for="(e, i) in f.errors"
                  :key="`${e.code}-${i}`"
                  :data-codigo="e.code"
                >
                  {{ e.message }}
                </li>
              </ul>
            </template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
