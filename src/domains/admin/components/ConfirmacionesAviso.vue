<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RefreshCw } from '@lucide/vue'
import { AvisosRepository } from '@/domains/avisos/repositories/AvisosRepository'
import type { ConfirmacionUsuario } from '@/domains/avisos/entities/Aviso'
import { AVISOS_AYUDA, NOMBRE_SECCION_AYUDA, SECCIONES_AYUDA, type SeccionAyuda } from '@/domains/analisis-v1/components/avisoAyuda'

// «Gestión de usuarios»: quién leyó y quién no cada sección de la ayuda del Análisis en su versión actual.
// El backend responde una sección por llamada; se piden las tres y se combinan por cuenta.
interface Fila {
  user_id: number
  email: string
  full_name: string | null
  role: ConfirmacionUsuario['role']
  secciones: Partial<Record<SeccionAyuda, { leida: boolean; fecha: string | null }>>
}

const porSeccion = ref<Partial<Record<SeccionAyuda, ConfirmacionUsuario[]>>>({})
const cargando = ref(false)
const error = ref<string | null>(null)

const filas = computed<Fila[]>(() => {
  const mapa = new Map<number, Fila>()
  for (const s of SECCIONES_AYUDA) {
    for (const u of porSeccion.value[s] ?? []) {
      const f = mapa.get(u.user_id) ?? { user_id: u.user_id, email: u.email, full_name: u.full_name, role: u.role, secciones: {} }
      f.secciones[s] = { leida: u.confirmado, fecha: u.confirmado_en }
      mapa.set(u.user_id, f)
    }
  }
  const pendientes = (f: Fila) => SECCIONES_AYUDA.filter(s => !f.secciones[s]?.leida).length
  return [...mapa.values()].sort((a, b) => pendientes(b) - pendientes(a) || a.email.localeCompare(b.email, 'es'))
})
const leidasDe = (s: SeccionAyuda) => (porSeccion.value[s] ?? []).filter(u => u.confirmado).length
const totalDe = (s: SeccionAyuda) => (porSeccion.value[s] ?? []).length

function fmtFecha(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('es-PE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function cargar() {
  cargando.value = true
  error.value = null
  try {
    const r = await Promise.all(SECCIONES_AYUDA.map(s => AvisosRepository.getConfirmaciones(AVISOS_AYUDA[s])))
    porSeccion.value = Object.fromEntries(SECCIONES_AYUDA.map((s, i) => [s, r[i]]))
  } catch {
    error.value = 'No se pudo cargar quién leyó la ayuda.'
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)
</script>

<template>
  <section
    class="bg-white rounded-lg border border-border overflow-hidden"
    aria-labelledby="confirmaciones-aviso-titulo"
    data-prueba="confirmaciones-aviso"
  >
    <div class="px-4 sm:px-6 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2
          id="confirmaciones-aviso-titulo"
          class="text-sm font-semibold text-foreground"
        >
          Lectura de la ayuda del Análisis
        </h2>
        <p
          v-if="filas.length"
          class="text-xs text-muted-foreground mt-0.5"
          data-prueba="resumen-lecturas"
        >
          <template
            v-for="(s, i) in SECCIONES_AYUDA"
            :key="s"
          >
            {{ i ? ' · ' : '' }}{{ NOMBRE_SECCION_AYUDA[s] }} (v{{ AVISOS_AYUDA[s].version }}): {{ leidasDe(s) }} de {{ totalDe(s) }}
          </template>
        </p>
      </div>
      <button
        type="button"
        :disabled="cargando"
        class="inline-flex items-center gap-1.5 min-h-10 px-3 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-secondary disabled:opacity-50"
        @click="cargar"
      >
        <RefreshCw
          class="w-3.5 h-3.5"
          :class="{ 'animate-spin': cargando }"
        />
        Actualizar
      </button>
    </div>

    <p
      v-if="error"
      role="alert"
      class="px-4 sm:px-6 py-3 text-sm text-red-700"
    >
      {{ error }}
    </p>
    <p
      v-else-if="cargando && !filas.length"
      class="px-4 sm:px-6 py-6 text-sm text-muted-foreground"
    >
      Cargando…
    </p>
    <p
      v-else-if="!filas.length"
      class="px-4 sm:px-6 py-6 text-sm text-muted-foreground"
    >
      No hay cuentas que deban leer la ayuda.
    </p>
    <div
      v-else
      class="overflow-x-auto"
    >
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border bg-gray-50">
            <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Usuario
            </th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Rol
            </th>
            <th
              v-for="s in SECCIONES_AYUDA"
              :key="s"
              class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            >
              {{ NOMBRE_SECCION_AYUDA[s] }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="f in filas"
            :key="f.user_id"
            class="border-b border-border last:border-0"
            :data-usuario="f.email"
          >
            <td class="px-4 py-3">
              <span class="block text-foreground">{{ f.full_name || f.email }}</span>
              <span
                v-if="f.full_name"
                class="block text-xs text-muted-foreground"
              >{{ f.email }}</span>
            </td>
            <td class="px-4 py-3 text-muted-foreground">
              {{ f.role }}
            </td>
            <td
              v-for="s in SECCIONES_AYUDA"
              :key="s"
              class="px-4 py-3 whitespace-nowrap"
              :data-seccion="s"
            >
              <template v-if="f.secciones[s]?.leida">
                <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Leída</span>
                <span class="block text-xs text-muted-foreground mt-0.5">{{ fmtFecha(f.secciones[s]?.fecha ?? null) }}</span>
              </template>
              <span
                v-else
                class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"
              >Pendiente</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
