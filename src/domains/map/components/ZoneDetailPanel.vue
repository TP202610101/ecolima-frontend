<script setup lang="ts">
import { computed } from 'vue'
import { MapPin, Info, CheckCircle2, X } from '@lucide/vue'
import { useRecommendationsStore } from '@/domains/recommendations/stores/useRecommendationsStore'
import { useAuthStore } from '@/domains/auth/stores/useAuthStore'
import Badge from '@/shared/components/Badge.vue'

const recStore = useRecommendationsStore()
const auth = useAuthStore()

const zone = computed(() => recStore.selectedZone)

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

function formatCoverage(meters: number | null): string {
  if (meters === null || meters === undefined) return '—'
  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)} km`
    : `${Math.round(meters)} m`
}

function close() {
  recStore.selectZone(null)
}
</script>

<template>
  <aside class="w-96 border-l border-border overflow-y-auto bg-white flex flex-col">

    <!-- Empty state -->
    <div
      v-if="!zone"
      class="flex flex-col items-center justify-center h-full text-center p-8"
    >
      <MapPin class="w-12 h-12 text-muted-foreground/30 mb-3" />
      <p class="text-sm text-muted-foreground">Selecciona una zona en el mapa para ver su análisis</p>
    </div>

    <!-- Zone detail -->
    <template v-else>
      <!-- Header -->
      <div class="px-4 py-3 border-b border-border flex items-start justify-between flex-shrink-0">
        <div>
          <h2 class="text-sm font-semibold text-foreground">Zona {{ zone.zone_id }}</h2>
          <p class="text-xs text-muted-foreground mt-0.5">{{ zone.district_name }}</p>
        </div>
        <div class="flex items-center gap-2">
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

      <!-- Content -->
      <div class="p-4 space-y-4 overflow-y-auto">

        <!-- ML Score (solo admin) -->
        <div v-if="auth.isAdmin && zone.ml_score !== undefined" class="bg-gray-50 rounded-lg p-3">
          <p class="text-xs text-muted-foreground mb-0.5">Puntaje ML</p>
          <p class="text-2xl font-bold text-primary">{{ (zone.ml_score * 100).toFixed(1) }}%</p>
          <p class="text-xs text-muted-foreground mt-0.5">{{ zone.model_version ?? '—' }}</p>
        </div>

        <!-- ¿Por qué se recomienda? -->
        <div class="bg-accent rounded-lg p-4 border border-green-200">
          <div class="flex items-center gap-2 mb-3">
            <Info class="w-5 h-5 text-green-700 flex-shrink-0" />
            <h3 class="text-sm text-green-900 font-semibold">¿Por qué se recomienda esta zona?</h3>
          </div>
          <ul class="space-y-2">
            <li
              v-for="reason in parseReasons(zone.recommendation_reason)"
              :key="reason"
              class="flex items-start gap-2 text-sm text-green-800"
            >
              <CheckCircle2 class="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>{{ reason }}</span>
            </li>
            <li v-if="!parseReasons(zone.recommendation_reason).length" class="text-sm text-green-800">
              {{ zone.recommendation_reason }}
            </li>
          </ul>
        </div>

        <!-- Métricas -->
        <div class="space-y-2">
          <h3 class="text-sm font-semibold text-foreground">Métricas</h3>
          <div class="grid grid-cols-1 gap-2">
            <div class="flex items-center justify-between py-2 border-b border-border">
              <span class="text-sm text-muted-foreground">Brecha de cobertura</span>
              <span
                class="text-sm font-medium"
                :class="(zone.coverage_gap_m ?? 0) > 5000 ? 'text-orange-500' : 'text-foreground'"
              >
                {{ formatCoverage(zone.coverage_gap_m) }}
              </span>
            </div>
            <div class="flex items-center justify-between py-2 border-b border-border">
              <span class="text-sm text-muted-foreground">Coordenadas</span>
              <span class="text-xs text-muted-foreground font-mono">
                {{ zone.centroid_lat.toFixed(4) }}, {{ zone.centroid_lon.toFixed(4) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </aside>
</template>
