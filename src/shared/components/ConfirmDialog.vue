<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

withDefaults(defineProps<{
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'normal' | 'danger'
}>(), {
  confirmLabel: 'Confirmar',
  cancelLabel: 'Cancelar',
  variant: 'normal',
})

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('cancel')
}

onMounted(() => document.addEventListener('keydown', onKeyDown))
onUnmounted(() => document.removeEventListener('keydown', onKeyDown))
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="confirm-dialog-title"
  >
    <div class="absolute inset-0 bg-black/50" @click="emit('cancel')" />
    <div class="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
      <h2 id="confirm-dialog-title" class="text-base font-semibold text-foreground">{{ title }}</h2>
      <p class="text-sm text-muted-foreground leading-relaxed">{{ message }}</p>
      <div class="flex justify-end gap-3 pt-1">
        <button
          @click="emit('cancel')"
          class="px-4 py-2 text-sm font-medium border border-border rounded-md hover:bg-secondary transition-colors"
        >
          {{ cancelLabel }}
        </button>
        <button
          @click="emit('confirm')"
          autofocus
          :class="[
            'px-4 py-2 text-sm font-medium rounded-md transition-colors',
            variant === 'danger'
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-primary text-white hover:bg-primary-hover',
          ]"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>
