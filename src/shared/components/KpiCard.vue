<template>
  <div class="bg-white rounded-lg border border-border p-6">
    <div class="flex items-center justify-between mb-3">
      <div :class="['w-12 h-12 rounded-lg flex items-center justify-center', iconBg]">
        <component :is="icon" class="w-6 h-6" />
      </div>
      <slot name="extra" />
    </div>
    <h3 class="text-sm text-muted-foreground mb-1">{{ label }}</h3>
    <p class="text-3xl font-bold text-foreground">{{ value }}</p>
    <p v-if="subtitle" class="text-xs text-muted-foreground mt-2">{{ subtitle }}</p>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

const props = defineProps<{
  icon: Component
  iconBg: string
  label: string
  value: string | number
  subtitle?: string
}>()
</script>
