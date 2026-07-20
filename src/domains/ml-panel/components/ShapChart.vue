<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
} from 'chart.js'
import { useMLStore } from '../stores/useMLStore'

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip)

const mlStore = useMLStore()
const chartCanvas = ref<HTMLCanvasElement>()
let chartInstance: Chart | null = null

const SHAP_LABELS = [
  'Gasto combustible',
  'Densidad poblacional',
  'Potencial de reciclaje',
  'GPC (kg/hab/día)',
  'Dist. punto cercano',
  'Puntos en 500m',
  'Estrato de ingreso',
  '% Plástico',
]
const SHAP_VALUES = [0.38, 0.32, 0.28, 0.22, 0.18, 0.14, 0.10, 0.08]

function buildChart() {
  if (!chartCanvas.value) return
  if (chartInstance) { chartInstance.destroy(); chartInstance = null }
  chartInstance = new Chart(chartCanvas.value, {
    type: 'bar',
    data: {
      labels: SHAP_LABELS,
      datasets: [{
        data: SHAP_VALUES,
        backgroundColor: '#16a34a',
        borderRadius: 4,
        barThickness: 18,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${(ctx.parsed.x as number).toFixed(3)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: '#e5e5e5' },
          ticks: { color: '#737373', font: { size: 11 } },
          title: {
            display: true,
            text: 'Importancia SHAP',
            color: '#737373',
            font: { size: 11 },
          },
        },
        y: {
          grid: { display: false },
          ticks: { color: '#1a1a1a', font: { size: 12 } },
        },
      },
    },
  })
}

watch(() => mlStore.activeModel, async model => {
  if (model) {
    await nextTick()
    buildChart()
  }
})

onMounted(async () => {
  if (mlStore.activeModel) {
    await nextTick()
    buildChart()
  }
})

onUnmounted(() => {
  chartInstance?.destroy()
  chartInstance = null
})
</script>

<template>
  <div class="bg-white rounded-lg border border-border p-6">
    <h3 class="text-sm font-semibold text-foreground mb-4">Importancia de variables (SHAP)</h3>

    <div
      v-if="!mlStore.activeModel && !mlStore.loading"
      class="flex items-center justify-center h-48 text-sm text-muted-foreground"
    >
      No hay modelo activo
    </div>
    <div v-else-if="mlStore.loading" class="h-64 bg-gray-100 rounded animate-pulse" />
    <div v-else class="relative h-64">
      <canvas ref="chartCanvas" />
    </div>
  </div>
</template>
