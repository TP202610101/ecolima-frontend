<template>
  <span :class="badgeClass" class="inline-flex items-center px-2.5 rounded-full text-xs font-medium">
    <slot>{{ label }}</slot>
  </span>
</template>

<script setup lang="ts">
const props = defineProps<{
  variant: 'alta' | 'media' | 'baja' | 'recomendado' | 'existente'
  label?: string
}>()

const label = props.label ?? {
  alta: 'Prioridad Alta',
  media: 'Prioridad Media',
  baja: 'Prioridad Baja',
  recomendado: 'Recomendado',
  existente: 'Existente'
}[props.variant]

const badgeClass = {
  alta: 'bg-green-600 text-white py-1',
  media: 'bg-yellow-500 text-white py-1',
  baja: 'bg-gray-400 text-white py-1',
  recomendado: 'bg-green-100 text-green-800 py-0.5',
  existente: 'bg-blue-100 text-blue-800 py-0.5'
}[props.variant]
</script>
