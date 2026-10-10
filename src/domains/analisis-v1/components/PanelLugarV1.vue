<script setup lang="ts">
import { computed } from 'vue'
import { MapPin, X, CheckCircle2, MinusCircle, CircleDot, XCircle, Info, ListOrdered, ChevronDown, Users, Trash2, Navigation, Route } from '@lucide/vue'
import { useExploracionV1Store } from '../stores/useExploracionV1Store'
import {
  CLASE_LARGA, CONTROLES_CAMPO, FACTOR_INFO, FACTORES, PROVINCIA, REGLAS_REVISION, RESULTADO_REGLA, SIN_NOMBRE, T,
  distanciaM, explicacionBreve, fmtDec, fmtDist, fmtEntero, fuenteExistente, nivelesFactores, nombreDistrito,
  nombreExistente, ord, valorFactor, type Factor,
} from '../utils/lecturaV1'

// Columna derecha (como ZoneDetailPanel del original). Resumen inicial: nombre (si existe en el paquete),
// tipo y distrito, estado de la revisión preliminar, orden en el distrito, si está entre los primeros de Lima,
// por qué ocupa esa posición, distancia al punto existente más cercano y verificaciones pendientes.
// Todo lo demás va en «Ver más detalles». Nada de puntajes, propensión ni métricas del modelo.
const store = useExploracionV1Store()
const emit = defineEmits<{ ayuda: [seccion: 'orden' | 'fuentes'] }>()

const l = computed(() => store.seleccionado)
const d = computed(() => (store.detalle && store.detalle.sitio_id === l.value?.id ? store.detalle : null))
const nDist = computed(() => (l.value ? store.aptosDistrito(l.value.ubigeo) : 0))
const niveles = computed(() => (l.value && l.value.k ? nivelesFactores(l.value, nDist.value, store.nAptos) : null))
const breve = computed(() => (niveles.value ? explicacionBreve(niveles.value.filas) : null))
const existenteCercano = computed(() => (l.value?.existenteCercano ? store.porId.get(l.value.existenteCercano) ?? null : null))
const controles = computed(() => Object.entries(d.value?.tamizaje.controles_campo ?? {}).filter(([, v]) => v != null))
const pendientes = computed(() => controles.value.filter(([, v]) => v === 'pendiente_campo').length)
const cercanos = computed(() => {
  const x = l.value
  if (!x) return []
  const lista = store.existentes.map(e => ({ e, m: e.id === x.existenteCercano && x.dist != null ? x.dist : distanciaM(x, e) })).sort((a, b) => a.m - b.m)
  const cerca = lista.filter(c => c.m <= 2000).slice(0, 4)
  return cerca.length ? cerca : lista.slice(0, 1)
})
const comparaDistrito = computed(() => niveles.value?.usarDistrito ?? true)
const primeroDelAmbito = computed(() => {
  const s = store.seleccion.find(x => x.rango != null)
  return s ?? null
})
const ICONO: Record<Factor, unknown> = { k1: Users, k2: Trash2, k3: Navigation, k4: Route }
const vacioK = { k1: 0, k2: 0, k3: 0, k4: 0 }
</script>

<template>
  <aside
    class="flex flex-col h-full min-h-0 bg-white overflow-y-auto"
    aria-label="Detalle del lugar"
    aria-live="polite"
    data-prueba="panel"
  >
    <!-- Sin selección -->
    <div
      v-if="!l"
      class="flex-1 flex flex-col items-center justify-center text-center p-8"
      data-prueba="panel-vacio"
    >
      <MapPin class="w-12 h-12 text-muted-foreground/30 mb-3" />
      <h2 class="text-sm font-medium mb-1">
        Selecciona un lugar en el mapa
      </h2>
      <p class="text-xs text-muted-foreground max-w-[290px]">
        Haz clic en un punto del mapa o en un lugar de la lista para ver por qué aparece en ese orden y qué falta comprobar.
      </p>
      <p
        v-if="primeroDelAmbito"
        class="text-xs text-muted-foreground mt-3.5"
      >
        Para empezar:
        <button
          type="button"
          class="text-primary underline underline-offset-2"
          @click="store.elegir(primeroDelAmbito.id)"
        >
          el 1.º {{ store.ambito === PROVINCIA ? 'de la provincia' : `en ${nombreDistrito(store.ambito)}` }}
        </button>.
      </p>
      <p class="text-xs text-muted-foreground mt-5 pt-3.5 border-t border-border text-left max-w-[290px]">
        Paraderos, mercados, centros comerciales y parques se evalúan como <strong>posibles lugares de oportunidad</strong>
        porque reúnen personas, no porque ya tengan permiso o espacio adecuado.
        <button
          type="button"
          class="text-primary underline underline-offset-2"
          @click="emit('ayuda', 'orden')"
        >
          Cómo se ordenan
        </button>
      </p>
    </div>

    <template v-else>
      <div class="sticky top-0 z-10 bg-white px-4 py-3 border-b border-border flex items-start gap-2">
        <div class="flex-1 min-w-0">
          <h2
            class="text-sm font-semibold leading-snug"
            data-prueba="panel-titulo"
          >
            {{ CLASE_LARGA[l.clase] }}
          </h2>
          <p class="text-xs text-muted-foreground mt-0.5">
            {{ nombreDistrito(l.ubigeo) }} · {{ SIN_NOMBRE }}
          </p>
        </div>
        <button
          type="button"
          class="p-1 -mt-0.5 rounded text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Cerrar detalle"
          data-prueba="cerrar-detalle"
          @click="store.elegir(null)"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="p-4 flex flex-col gap-4">
        <!-- Estado -->
        <div>
          <span
            v-if="l.rango != null"
            class="inline-flex items-center gap-1 rounded-full text-xs font-medium px-2.5 py-0.5 bg-green-100 text-green-800"
          ><CheckCircle2 class="w-3 h-3" />{{ T.ok }}</span>
          <span
            v-else
            class="inline-flex items-center gap-1 rounded-full text-xs font-medium px-2.5 py-0.5 bg-secondary text-neutral-600 border border-border"
          ><XCircle class="w-3 h-3" />{{ T.desc }}</span>
        </div>

        <!-- Posición -->
        <div
          v-if="l.rango != null"
          class="rounded-lg border border-green-200 bg-accent p-4 flex gap-3"
          data-prueba="posicion"
        >
          <ListOrdered class="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div class="flex-1 min-w-0">
            <p class="text-sm text-green-800">
              Orden de revisión en {{ nombreDistrito(l.ubigeo) }}
            </p>
            <p class="text-3xl font-bold leading-tight tabular-nums">
              {{ ord(l.rangoDist!) }}<small class="text-sm font-medium text-muted-foreground ml-1">de {{ fmtEntero(nDist) }}</small>
              <span
                v-if="l.rangoDist === 1"
                class="ml-2 align-middle text-[11px] font-medium rounded-full px-1.5 py-0.5 bg-white text-green-900 ring-1 ring-inset ring-primary"
              >{{ T.primero }}</span>
            </p>
            <p
              class="mt-2.5 pt-2.5 border-t border-green-200 flex gap-2 text-[13px]"
              :class="l.top ? 'text-green-800' : 'text-neutral-600'"
              data-prueba="top-lima"
            >
              <span
                class="mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0"
                :class="l.top ? 'bg-primary' : 'border-2 border-gray-500 bg-white'"
              />
              <span><b v-if="l.top">{{ T.topCorto(store.topK) }}</b><template v-else>{{ T.noTop(store.topK) }}</template>
                <small class="block text-xs opacity-85">Puesto {{ fmtEntero(l.rango) }} de {{ fmtEntero(store.nAptos) }} en toda la provincia</small></span>
            </p>
          </div>
        </div>
        <div
          v-else
          class="rounded-lg border border-border bg-secondary p-4 flex gap-3"
          data-prueba="posicion"
        >
          <XCircle class="w-5 h-5 text-neutral-500 mt-0.5 flex-shrink-0" />
          <div>
            <p class="text-sm text-neutral-600">
              No entra en el orden de revisión
            </p>
            <p class="text-[13px] text-neutral-600 mt-2">
              {{ T.noTop(store.topK) }}<small class="block text-xs">Se descartó antes de ordenar</small>
            </p>
          </div>
        </div>

        <!-- Por qué -->
        <div
          v-if="breve"
          class="rounded-lg border border-green-200 bg-accent p-4"
          data-prueba="porque"
        >
          <h3 class="flex items-center gap-2 text-sm font-semibold text-green-900 mb-2">
            <Info class="w-5 h-5 text-green-700" />¿Por qué ocupa esta posición?
          </h3>
          <p
            v-if="breve.aFavor"
            class="flex gap-2 text-sm text-green-800"
          >
            <CheckCircle2 class="w-4 h-4 mt-0.5 text-primary flex-shrink-0" /><span><b class="font-semibold">A favor:</b> {{ breve.aFavor }}</span>
          </p>
          <p
            v-else
            class="flex gap-2 text-sm text-green-800"
          >
            <CircleDot class="w-4 h-4 mt-0.5 text-primary flex-shrink-0" /><span>Ningún factor destaca: sus valores son intermedios.</span>
          </p>
          <p
            v-if="breve.enContra"
            class="flex gap-2 text-sm text-neutral-600 mt-1.5"
          >
            <MinusCircle class="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" /><span><b class="font-semibold">En contra:</b> {{ breve.enContra }}</span>
          </p>
          <p class="text-xs text-green-800/85 mt-2">
            Comparado con {{ comparaDistrito ? `los demás lugares de ${nombreDistrito(l.ubigeo)}` : `los lugares de toda Lima (${nombreDistrito(l.ubigeo)} tiene pocos lugares)` }}.
          </p>
        </div>
        <div
          v-else
          class="rounded-lg border border-border bg-secondary p-4 text-sm text-neutral-700"
          data-prueba="porque"
        >
          <h3 class="flex items-center gap-2 font-semibold mb-1.5">
            <Info class="w-5 h-5" />¿Por qué no tiene posición?
          </h3>
          Ya hay un punto de reciclaje registrado a <strong>{{ fmtDist(l.dist) }}</strong>{{ existenteCercano ? ` (${nombreExistente(existenteCercano.id)})` : '' }}. Para no duplicarlo, el lugar no se compara con los demás.
        </div>

        <!-- Datos clave -->
        <dl
          class="rounded-lg border border-border divide-y divide-border"
          data-prueba="datos-clave"
        >
          <div class="grid grid-cols-[1fr_auto] gap-x-3 px-3 py-2.5 items-baseline">
            <dt class="text-[13px] text-neutral-700">
              Punto de reciclaje registrado más cercano
            </dt>
            <dd class="text-[15px] font-semibold tabular-nums whitespace-nowrap">
              {{ fmtDist(l.dist) }}
            </dd>
            <dd
              v-if="existenteCercano"
              class="col-span-2 text-xs text-muted-foreground"
            >
              {{ nombreExistente(existenteCercano.id) }} · {{ nombreDistrito(existenteCercano.ubigeo) }}
            </dd>
          </div>
          <div
            v-if="l.rango != null"
            class="grid grid-cols-[1fr_auto] gap-x-3 px-3 py-2.5 items-baseline"
          >
            <dt class="text-[13px] text-neutral-700">
              Verificaciones pendientes
            </dt>
            <dd
              class="text-[15px] font-semibold tabular-nums"
              data-prueba="verificaciones"
            >
              <template v-if="d">
                {{ pendientes }} de {{ controles.length }}
              </template>
              <span
                v-else-if="store.cargandoDetalle"
                class="text-xs font-normal text-muted-foreground"
              >Cargando…</span>
              <span
                v-else
                class="text-xs font-normal text-muted-foreground"
              >—</span>
            </dd>
            <dd class="col-span-2 text-xs text-muted-foreground">
              Falta revisarlo en campo: no está aprobado ni autorizado.
            </dd>
          </div>
        </dl>
        <p
          v-if="store.errorDetalle"
          class="text-xs text-red-700"
          role="alert"
        >
          {{ store.errorDetalle }}
          <button
            type="button"
            class="underline"
            @click="store.elegir(l.id)"
          >
            Reintentar
          </button>
        </p>

        <!-- Ver más detalles -->
        <div class="flex flex-col">
          <button
            type="button"
            class="w-full flex items-center justify-between gap-2 px-3 py-2.5 border border-border text-sm font-medium hover:bg-secondary"
            :class="store.masDetalles ? 'rounded-t-lg bg-secondary' : 'rounded-lg bg-white'"
            :aria-expanded="store.masDetalles"
            aria-controls="v1-mas-detalles"
            data-prueba="mas-detalles"
            @click="store.masDetalles = !store.masDetalles"
          >
            <span>{{ store.masDetalles ? 'Ocultar detalles' : 'Ver más detalles' }}</span>
            <ChevronDown
              class="w-4 h-4 text-muted-foreground transition-transform"
              :class="store.masDetalles ? 'rotate-180' : ''"
            />
          </button>
          <div
            v-show="store.masDetalles"
            id="v1-mas-detalles"
            class="border border-t-0 border-border rounded-b-lg px-3 py-3.5 flex flex-col gap-4"
            data-prueba="detalles"
          >
            <p class="text-xs text-muted-foreground">
              Revisión hecha con datos públicos, sin visitar el lugar. Superarla no significa que sea viable ni equivale a autorización.
            </p>

            <section v-if="niveles">
              <h3 class="text-sm font-semibold text-green-900 mb-2">
                Los cuatro factores, uno por uno
              </h3>
              <ul class="flex flex-col gap-1.5">
                <li
                  v-for="f in niveles.filas"
                  :key="f.f"
                  class="flex gap-2 text-[13px]"
                  :class="f.nivel === 'bajo' ? 'text-neutral-600' : 'text-green-800'"
                >
                  <CheckCircle2
                    v-if="f.nivel === 'alto'"
                    class="w-4 h-4 mt-0.5 text-primary flex-shrink-0"
                  />
                  <MinusCircle
                    v-else-if="f.nivel === 'bajo'"
                    class="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0"
                  />
                  <CircleDot
                    v-else
                    class="w-4 h-4 mt-0.5 text-primary flex-shrink-0"
                  />
                  <span>{{ FACTOR_INFO[f.f][f.nivel] }} <small class="opacity-80">({{ ord(f.puesto) }} de {{ fmtEntero(niveles.base) }} {{ niveles.usarDistrito ? `en ${nombreDistrito(l.ubigeo)}` : 'en Lima' }})</small></span>
                </li>
              </ul>
              <p class="text-xs text-muted-foreground mt-2">
                Se combinan cuatro factores con el mismo peso, medidos a 500 m del lugar.
              </p>
            </section>

            <section
              v-if="l.k && l.kn"
              data-prueba="factores"
            >
              <h3 class="text-sm font-medium text-muted-foreground mb-2">
                Factores considerados
              </h3>
              <div class="flex flex-col gap-2">
                <div
                  v-for="f in FACTORES"
                  :key="f"
                  class="border border-border rounded-lg px-3 py-2.5 flex gap-3"
                >
                  <div class="w-8 h-8 rounded-lg bg-green-100 text-primary grid place-items-center flex-shrink-0">
                    <component
                      :is="ICONO[f]"
                      class="w-4 h-4"
                    />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-xs text-muted-foreground">
                      {{ FACTOR_INFO[f].nombre }}
                    </p>
                    <p class="text-sm font-semibold mb-1.5">
                      {{ valorFactor(f, l.k[f]) }}
                    </p>
                    <div
                      class="h-1.5 bg-gray-200 rounded-full overflow-hidden"
                      role="img"
                      :aria-label="`${Math.round((l.kn ?? vacioK)[f] * 100)} de 100 respecto al valor más alto de Lima`"
                    >
                      <i
                        class="block h-full bg-green-500 rounded-full"
                        :style="{ width: `${Math.max(2, l.kn[f] * 100)}%` }"
                      />
                    </div>
                    <p class="text-xs text-muted-foreground mt-1">
                      {{ ord(l.rk[f]) }} de {{ fmtEntero(nDist) }} en {{ nombreDistrito(l.ubigeo) }}.{{ FACTOR_INFO[f].nota ? ` ${FACTOR_INFO[f].nota}` : '' }}
                    </p>
                  </div>
                </div>
              </div>
              <p class="text-xs text-muted-foreground mt-2">
                La barra compara con el valor más alto de toda Lima.
              </p>
            </section>

            <section data-prueba="cercanos">
              <h3 class="text-sm font-medium text-muted-foreground mb-1.5">
                Puntos de reciclaje existentes registrados cercanos
              </h3>
              <ul class="border-t border-border">
                <li
                  v-for="c in cercanos"
                  :key="c.e.id"
                  class="py-2 border-b border-border"
                >
                  <p class="text-sm font-semibold">
                    {{ nombreExistente(c.e.id) }}
                  </p>
                  <p class="text-xs text-muted-foreground">
                    {{ fmtDist(c.m) }} · {{ nombreDistrito(c.e.ubigeo) }} · Fuente: {{ fuenteExistente(c.e.id) }}
                  </p>
                </li>
              </ul>
              <p class="text-xs text-muted-foreground mt-1.5">
                El más cercano se une con una línea azul en el mapa. Puede haber puntos no registrados en estas fuentes; no se afirma quién los administra.
              </p>
            </section>

            <section
              v-if="controles.length && l.rango != null"
              data-prueba="lista-verificaciones"
            >
              <h3 class="text-sm font-medium text-muted-foreground mb-1.5">
                Qué falta comprobar antes de una posible instalación
              </h3>
              <ul class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 flex flex-col gap-1.5">
                <li
                  v-for="[c, v] in controles"
                  :key="c"
                  class="text-[13px] flex gap-2"
                >
                  <CircleDot class="w-3.5 h-3.5 mt-0.5 text-amber-600 flex-shrink-0" />
                  <span>{{ CONTROLES_CAMPO[c] ?? c }} <small class="text-muted-foreground">({{ v === 'pendiente_campo' ? 'pendiente de campo' : v }})</small></span>
                </li>
              </ul>
            </section>

            <section v-if="d && d.tamizaje.reglas">
              <h3 class="text-sm font-medium text-muted-foreground mb-1.5">
                Revisión preliminar
              </h3>
              <ul class="flex flex-col gap-1">
                <li
                  v-for="(v, r) in d.tamizaje.reglas"
                  :key="r"
                  class="text-[13px] flex justify-between gap-3"
                >
                  <span>{{ REGLAS_REVISION[r] ?? r }}</span>
                  <span
                    class="whitespace-nowrap"
                    :class="v === 'no_cumple' ? 'text-red-700' : 'text-muted-foreground'"
                  >{{ v ? RESULTADO_REGLA[v] ?? v : '—' }}</span>
                </li>
              </ul>
              <p
                v-if="d.tamizaje.motivo_exclusion"
                class="text-xs text-muted-foreground mt-1"
              >
                Motivo del descarte: {{ d.tamizaje.motivo_exclusion }}
              </p>
            </section>

            <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs border-t border-border pt-3">
              <dt class="text-muted-foreground">
                Nombre
              </dt>
              <dd>{{ SIN_NOMBRE }} (se muestra el tipo de lugar)</dd>
              <dt class="text-muted-foreground">
                Código del lugar
              </dt>
              <dd class="break-all">
                {{ l.id }}
              </dd>
              <dt class="text-muted-foreground">
                Coordenadas
              </dt>
              <dd>{{ fmtDec(l.lat, 5) }}, {{ fmtDec(l.lon, 5) }}</dd>
              <dt class="text-muted-foreground">
                Dirección
              </dt>
              <dd>No disponible en los datos; se obtiene en la visita</dd>
            </dl>
            <button
              type="button"
              class="self-start text-xs text-primary underline underline-offset-2"
              @click="emit('ayuda', 'fuentes')"
            >
              Fuentes y limitaciones
            </button>
          </div>
        </div>
      </div>
    </template>
  </aside>
</template>
