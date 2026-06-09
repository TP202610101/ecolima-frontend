<template>
  <div class="flex items-center gap-2">
    <div class="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
      <div
        class="h-2 rounded-full"
        :class="barClass"
        :style="{ width: `${Math.min(Math.max(value, 0), 1) * 100}%` }"
      />
    </div>
    <span v-if="showLabel" class="text-sm font-bold text-foreground w-12 text-right">{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  value: number
  showLabel?: boolean
}>()

const displayValue = computed(() => Math.min(Math.max(props.value ?? 0, 0), 1))
const label = computed(() => `${Math.round(displayValue.value * 100)}%`)

const barClass = computed(() => (
  displayValue.value >= 0.85
    ? 'bg-green-500'
    : displayValue.value >= 0.7
      ? 'bg-yellow-500'
      : 'bg-gray-400'
))
</script>
