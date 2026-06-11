<script setup lang="ts">
import { MapPin } from '@lucide/vue'
import type { Recommendation } from '../entities/Recommendation'
import { useAuthStore } from '@/domains/auth/stores/useAuthStore'

const props = withDefaults(defineProps<{
  zone: Recommendation
  isSelected?: boolean
}>(), { isSelected: false })

const emit = defineEmits<{ select: [zone: Recommendation] }>()

const auth = useAuthStore()

function formatScore(zone: Recommendation): string {
  if (auth.isAdmin && zone.ml_score !== undefined) {
    return `${(zone.ml_score * 100).toFixed(0)}%`
  }
  return zone.priority_label
}

function priorityDotClass(label: string): string {
  if (label === 'Alta') return 'bg-green-600'
  if (label === 'Media') return 'bg-yellow-500'
  return 'bg-gray-400'
}
</script>

<template>
  <div
    class="p-3 cursor-pointer hover:bg-secondary border-b border-border transition-colors"
    :class="isSelected ? 'border-l-2 border-primary bg-accent' : 'border-l-2 border-transparent'"
    @click="emit('select', zone)"
  >
    <div class="flex items-center gap-2 mb-1">
      <MapPin class="w-3.5 h-3.5 text-primary flex-shrink-0" />
      <span class="text-sm font-medium text-foreground truncate">{{ zone.zone_id }} · Zona</span>
    </div>
    <p class="text-xs text-muted-foreground mb-2 ml-5">{{ zone.district_name }}</p>
    <div class="flex items-center justify-between ml-5">
      <span class="text-xs text-muted-foreground">Puntaje ML</span>
      <div class="flex items-center gap-1.5">
        <span class="text-sm font-bold text-foreground">{{ formatScore(zone) }}</span>
        <div class="w-2 h-2 rounded-full" :class="priorityDotClass(zone.priority_label)" />
      </div>
    </div>
  </div>
</template>
