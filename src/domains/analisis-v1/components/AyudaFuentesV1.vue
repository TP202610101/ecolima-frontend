<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { X } from '@lucide/vue'
import { useExploracionV1Store } from '../stores/useExploracionV1Store'
import { CONTROLES_CAMPO, REGLAS_REVISION, fechaLarga, fmtEntero, nombreDistrito } from '../utils/lecturaV1'

// «Cómo se ordenan» y «Fuentes y limitaciones» en un mismo diálogo. Las fuentes vienen de /analisis/fuentes.
const props = defineProps<{ seccion: 'orden' | 'fuentes' }>()
const emit = defineEmits<{ cerrar: []; cambiar: [seccion: 'orden' | 'fuentes'] }>()
const store = useExploracionV1Store()

onMounted(() => store.cargarFuentes())

// Uso de cada fuente en palabras del analista (el campo uso_en_v1 del paquete trae nombres de variables).
const USO: Record<string, string> = {
  COPDEM: 'Pendiente del terreno', GHSL: 'Superficie construida', IDEP: 'Límites de los 43 distritos',
  LOTE: 'Estaciones de reciclaje de San Isidro', MINAM: 'Residuos por persona de cada distrito',
  OSM: 'Lugares, vías y puntos de reciclaje registrados', UNIVERSO: 'Lista de lugares evaluados', WORLDPOP: 'Población',
}
const fuentesVisibles = computed(() => {
  const dem = store.fuentes.filter(f => f.codigo.startsWith('COPDEM'))
  const otras = store.fuentes.filter(f => !f.codigo.startsWith('COPDEM'))
  const lista = otras.map(f => ({ ...f, uso: USO[f.codigo.split('-')[0]] ?? '' }))
  if (dem.length) lista.push({ ...dem[0], nombre: `Copernicus DEM GLO-30 (${dem.length} teselas)`, uso: USO.COPDEM })
  return lista
})
const sinLugares = computed(() => store.distritosSinLugares.map(u => nombreDistrito(u)).join(', '))
const distritosConExistentes = computed(() => new Set(store.existentes.map(e => e.ubigeo)).size)
const tab = (s: 'orden' | 'fuentes') => props.seccion === s
  ? 'px-3 py-1.5 text-sm rounded-md bg-primary text-white font-medium'
  : 'px-3 py-1.5 text-sm rounded-md hover:bg-secondary'
</script>

<template>
  <div
    class="fixed inset-0 z-[2000] bg-black/30 flex items-center justify-center p-4 print:hidden"
    @click.self="emit('cerrar')"
    @keydown.esc="emit('cerrar')"
  >
    <div
      class="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col"
      role="dialog"
      aria-modal="true"
      :aria-label="props.seccion === 'orden' ? 'Cómo se ordenan los lugares' : 'Fuentes y limitaciones'"
      data-prueba="ayuda-fuentes"
    >
      <div class="px-5 py-3 border-b border-border flex items-center gap-2">
        <button
          type="button"
          :class="tab('orden')"
          @click="emit('cambiar', 'orden')"
        >
          Cómo se ordenan
        </button>
        <button
          type="button"
          :class="tab('fuentes')"
          @click="emit('cambiar', 'fuentes')"
        >
          Fuentes y limitaciones
        </button>
        <button
          type="button"
          class="ml-auto p-1.5 rounded hover:bg-secondary"
          aria-label="Cerrar"
          @click="emit('cerrar')"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div
        v-if="props.seccion === 'orden'"
        class="flex-1 overflow-y-auto px-5 py-4 text-sm text-neutral-700 space-y-3"
      >
        <h2 class="text-lg font-bold text-foreground">
          Cómo se ordenan los lugares
        </h2>
        <p>Lugares públicos donde podría analizarse un punto de reciclaje, en un orden que ayuda a decidir por cuáles empezar la revisión.</p>
        <h3 class="font-semibold text-foreground">
          ¿Por qué paraderos, mercados, centros comerciales y parques?
        </h3>
        <p>Se evalúan como posibles lugares de oportunidad porque reúnen personas. No aparecen porque ya tengan permiso o espacio adecuado.</p>
        <h3 class="font-semibold text-foreground">
          ¿Qué es la revisión preliminar?
        </h3>
        <p>Cinco comprobaciones hechas con datos públicos, sin visitar el lugar:</p>
        <ul class="list-disc pl-5">
          <li
            v-for="(t, k) in REGLAS_REVISION"
            :key="k"
          >
            {{ t }}.
          </li>
        </ul>
        <p>
          En toda Lima la superaron {{ fmtEntero(store.nAptos) }} lugares y {{ store.lugares.filter(l => l.grupo === 'excl').length }} se descartaron.
          <strong>Superarla no significa que el lugar sea viable ni que esté autorizado.</strong>
        </p>
        <h3 class="font-semibold text-foreground">
          ¿Cómo se decide el orden?
        </h3>
        <p>Con cuatro factores que pesan lo mismo, medidos a 500 m del lugar: personas que viven cerca, generación potencial de residuos, distancia al punto de reciclaje registrado más cercano (más lejos suma más) y densidad de vías, como aproximación al acceso.</p>
        <h3 class="font-semibold text-foreground">
          Orden en mi distrito y primeros de Lima
        </h3>
        <p>El orden de revisión de un distrito es el orden de toda Lima mirando solo los lugares de ese distrito: no cambia el orden provincial. Los {{ store.topK }} primeros lugares de Lima salen de comparar toda la provincia; muchos distritos no tienen ninguno, y eso no impide revisar sus propios primeros lugares. Estar entre los {{ store.topK }} primeros no es una aprobación.</p>
        <h3 class="font-semibold text-foreground">
          ¿Qué falta comprobar?
        </h3>
        <p>Las verificaciones de campo y con documentos de la municipalidad (en los resultados V1 todas están pendientes):</p>
        <ul class="list-disc pl-5">
          <li
            v-for="(t, c) in CONTROLES_CAMPO"
            :key="c"
          >
            {{ t }}
          </li>
        </ul>
      </div>

      <div
        v-else
        class="flex-1 overflow-y-auto px-5 py-4 text-sm text-neutral-700 space-y-3"
      >
        <h2 class="text-lg font-bold text-foreground">
          Fuentes y limitaciones
        </h2>
        <p v-if="store.version">
          Paquete de resultados {{ store.version.paquete_version }} del {{ fechaLarga(store.version.fecha_paquete) }}. Licencia de los datos:
          <a
            v-if="store.version.atribucion.licencia_url"
            :href="store.version.atribucion.licencia_url"
            target="_blank"
            rel="noopener"
            class="underline"
          >{{ store.version.atribucion.licencia }}</a>.
        </p>
        <h3 class="font-semibold text-foreground">
          Limitaciones
        </h3>
        <ul class="list-disc pl-5 space-y-1">
          <li>Ningún lugar está aprobado ni autorizado. La revisión preliminar usa datos abiertos y no reemplaza permisos ni visitas.</li>
          <li>Solo se cuentan los puntos de reciclaje registrados en OpenStreetMap y en el plan de San Isidro ({{ store.existentes.length }} en {{ distritosConExistentes }} distritos). No se afirma quién los administra. Donde hay puntos sin registrar, la distancia al más cercano parece mayor de lo real.</li>
          <li>El paquete no trae nombres, direcciones, responsables ni medidas del espacio: los lugares se identifican por su tipo y su código.</li>
          <li>Varios lugares muy cercanos pueden ser el mismo paradero registrado más de una vez.</li>
          <li>La población es de 2020 y los residuos por persona son el promedio de cada distrito.</li>
          <li>El alcance es la provincia de Lima (43 distritos), sin el Callao. Sin lugares evaluados en esta versión: {{ sinLugares }}.</li>
        </ul>
        <h3 class="font-semibold text-foreground">
          Fuentes de información
        </h3>
        <p
          v-if="store.errorFuentes"
          class="text-red-700"
        >
          {{ store.errorFuentes }}
        </p>
        <ul
          class="divide-y divide-border"
          data-prueba="lista-fuentes"
        >
          <li
            v-for="f in fuentesVisibles"
            :key="f.codigo"
            class="py-2 grid grid-cols-[1fr_auto] gap-x-4"
          >
            <div>
              <p class="font-medium text-foreground">
                {{ f.uso }}
              </p>
              <p class="text-xs text-muted-foreground">
                {{ f.nombre }}. {{ f.institucion }}.
              </p>
            </div>
            <div class="text-xs text-muted-foreground text-right">
              <p>
                <a
                  v-if="f.licencia_url"
                  :href="f.licencia_url"
                  target="_blank"
                  rel="noopener"
                  class="underline"
                >{{ f.licencia.split('(')[0].trim() }}</a>
                <span v-else>{{ f.licencia.split('.')[0] }}</span>
              </p>
              <p v-if="f.fecha_corte">
                {{ f.fecha_corte }}
              </p>
            </div>
          </li>
        </ul>
        <p class="text-xs text-muted-foreground">
          {{ store.version?.atribucion.aviso }}
        </p>
      </div>
    </div>
  </div>
</template>
