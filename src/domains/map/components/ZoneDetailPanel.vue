<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { MapPin, Info, CheckCircle2, X, Navigation, AlertTriangle, Users } from '@lucide/vue'
import { useRecommendationsStore } from '@/domains/recommendations/stores/useRecommendationsStore'
import { useAuthStore } from '@/domains/auth/stores/useAuthStore'
import Badge from '@/shared/components/Badge.vue'
import { GetNearbyUseCase } from '@/domains/map/use-cases/GetNearbyUseCase'
import type { RecyclingPoint } from '@/domains/map/entities/RecyclingPoint'
import { formatMetric, formatDistance } from '@/shared/utils/formatters'

const recStore = useRecommendationsStore()
const auth = useAuthStore()

const zone = computed(() => recStore.selectedZone)
const nearbyPoints = ref<RecyclingPoint[]>([])
const loadingNearby = ref(false)

watch(zone, async (newZone) => {
  nearbyPoints.value = []
  if (!newZone) return
  loadingNearby.value = true
  try {
    nearbyPoints.value = await GetNearbyUseCase(newZone.centroid_lat, newZone.centroid_lon)
  } catch {
    // puntos cercanos son no críticos — fallo silencioso
  } finally {
    loadingNearby.value = false
  }
})

function parseReasons(reason: string): string[] {
  if (!reason) return []
  const withoutPrefix = reason.replace('Zona recomendada por: ', '')
  return withoutPrefix
    .replace(/\.$/, '')
    .split(/,\s*|\s+y\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
}

/** Maximum road density for Lima used to normalize the accessibility index (m of road per km²). */
const MAX_ROAD_DENSITY_M_PER_KM2 = 30000

function roadAccessPct(road_density?: number | null): number {
  if (road_density == null) return 0
  return Math.min((road_density / MAX_ROAD_DENSITY_M_PER_KM2) * 100, 100)
}

function close() {
  recStore.selectZone(null)
}
</script>

<template>
  <aside class="w-full h-full border-l border-border overflow-y-auto bg-white flex flex-col">

    <!-- Estado vacío -->
    <div
      v-if="!zone"
      class="flex flex-col items-center justify-center h-full text-center p-8"
    >
      <MapPin class="w-12 h-12 text-muted-foreground/30 mb-3" />
      <p class="text-sm font-medium text-foreground mb-1">Selecciona una zona en el mapa</p>
      <p class="text-xs text-muted-foreground">Haz clic en un círculo del mapa o en una zona de la lista</p>
    </div>

    <!-- Zona seleccionada -->
    <template v-else>

      <!-- Header -->
      <div class="px-4 py-3 border-b border-border flex items-start justify-between flex-shrink-0">
        <div class="min-w-0">
          <h2 class="text-sm font-semibold text-foreground">Zona {{ zone.zone_id }}</h2>
          <p class="text-xs text-muted-foreground mt-0.5">{{ zone.district_name }}</p>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0 ml-2">
          <Badge :variant="zone.priority_label.toLowerCase() as 'alta' | 'media' | 'baja'" />
          <button
            @click="close"
            class="p-1 rounded hover:bg-secondary transition-colors"
            aria-label="Cerrar"
          >
            <X class="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <!-- Contenido -->
      <div class="p-4 space-y-4 flex-1 overflow-y-auto">

        <!-- Puntaje ML (solo admin) -->
        <div
          v-if="auth.isAdmin && zone.ml_score !== undefined"
          class="bg-gray-50 rounded-lg p-3 border border-border"
        >
          <p class="text-xs text-muted-foreground mb-0.5">Puntaje ML</p>
          <p class="text-2xl font-bold text-primary">{{ (zone.ml_score * 100).toFixed(1) }}%</p>
          <p class="text-xs text-muted-foreground mt-0.5">{{ zone.model_version ?? '—' }}</p>
        </div>

        <!-- Card SHAP: ¿Por qué se recomienda? -->
        <div class="bg-accent rounded-lg p-4 border border-green-200">
          <div class="flex items-center gap-2 mb-3">
            <Info class="w-5 h-5 text-green-700 flex-shrink-0" />
            <h3 class="text-sm text-green-900 font-semibold">¿Por qué se recomienda esta zona?</h3>
          </div>
          <ul class="space-y-2">
            <template v-if="parseReasons(zone.recommendation_reason).length">
              <li
                v-for="reason in parseReasons(zone.recommendation_reason)"
                :key="reason"
                class="flex items-start gap-2 text-sm text-green-800"
              >
                <CheckCircle2 class="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>{{ reason }}</span>
              </li>
            </template>
            <li v-else class="text-sm text-green-800 italic">
              {{ zone.recommendation_reason || 'Sin razones disponibles' }}
            </li>
          </ul>
        </div>

        <!-- Card: Habitantes sin cobertura en radio de 500m -->
        <div class="bg-accent border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle class="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div class="min-w-0">
            <p class="text-sm text-green-800 mb-1">Habitantes sin cobertura en radio de 500m</p>
            <p class="text-3xl font-bold text-foreground">{{ formatMetric(zone.coverage_gap_m) }}</p>
          </div>
        </div>

        <!-- Métricas de la zona -->
        <div>
          <h3 class="text-sm font-medium text-muted-foreground mb-2">Métricas de la zona</h3>
          <div class="space-y-2">

            <!-- Densidad poblacional -->
            <div class="bg-white border border-border rounded-lg p-3 flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                <Users class="w-4 h-4 text-green-600" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-xs text-muted-foreground">Densidad poblacional</p>
                <p class="text-sm font-semibold text-foreground">{{ formatMetric(zone.population_density, 'hab/km²') }}</p>
              </div>
            </div>

            <!-- Índice accesibilidad vial -->
            <div class="bg-white border border-border rounded-lg p-3 flex items-start gap-3">
              <div class="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Navigation class="w-4 h-4 text-green-600" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-xs text-muted-foreground">Índice accesibilidad vial</p>
                <p class="text-sm font-semibold text-foreground mb-1.5">{{ formatMetric(zone.road_density, 'm/km²') }}</p>
                <div class="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    class="bg-green-500 h-1.5 rounded-full transition-all"
                    :style="{ width: `${roadAccessPct(zone.road_density)}%` }"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- Puntos de reciclaje cercanos -->
        <div>
          <h3 class="text-sm font-medium text-muted-foreground mb-2">Puntos de reciclaje cercanos</h3>

          <!-- Loading -->
          <div v-if="loadingNearby" class="space-y-2">
            <div v-for="i in 3" :key="i" class="h-10 bg-gray-100 rounded animate-pulse" />
          </div>

          <!-- Sin resultados -->
          <p
            v-else-if="!nearbyPoints.length"
            class="text-sm text-muted-foreground italic"
          >
            No hay puntos existentes en un radio de 2 km
          </p>

          <!-- Lista -->
          <ul v-else class="divide-y divide-border">
            <li
              v-for="point in nearbyPoints"
              :key="point.point_id"
              class="py-2.5 flex items-center justify-between gap-2"
            >
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-foreground truncate">
                  {{ point.address || 'Punto de reciclaje' }}
                </p>
                <p class="text-sm text-muted-foreground">{{ formatDistance(point.distance_m) }}</p>
              </div>
              <MapPin class="w-4 h-4 text-blue-500 flex-shrink-0" />
            </li>
          </ul>
        </div>

      </div>
    </template>
  </aside>
</template>
