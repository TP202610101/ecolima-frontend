<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js'
import type { MetricaSemilla } from '@/domains/analisis-v1/entities/AnalisisV1'

// ROC-AUC e índice de Boyce del modelo de propensión en cada una de las semillas de validación
// (GET /analisis/modelo → metricas_por_semilla). Reemplaza al gráfico SHAP con valores fijos.
Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const props = defineProps<{ semillas: MetricaSemilla[] }>()
const chartCanvas = ref<HTMLCanvasElement>()
let chartInstance: Chart | null = null

function buildChart() {
  if (!chartCanvas.value || !props.semillas.length) return
  if (chartInstance) { chartInstance.destroy(); chartInstance = null }
  chartInstance = new Chart(chartCanvas.value, {
    type: 'bar',
    data: {
      labels: props.semillas.map(s => `Semilla ${s.semilla}`),
      datasets: [
        { label: 'ROC-AUC', data: props.semillas.map(s => s.roc_auc), backgroundColor: '#16a34a', borderRadius: 4 },
        { label: 'Índice de Boyce', data: props.semillas.map(s => s.boyce), backgroundColor: '#2563eb', borderRadius: 4 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, labels: { color: '#1a1a1a', font: { size: 12 } } },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${(ctx.parsed.y as number).toFixed(3)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#737373', font: { size: 11 } },
        },
        y: {
          min: 0,
          max: 1,
          grid: { color: '#e5e5e5' },
          ticks: { color: '#737373', font: { size: 11 } },
        },
      },
    },
  })
}

watch(() => props.semillas, async () => {
  await nextTick()
  buildChart()
})

onMounted(async () => {
  await nextTick()
  buildChart()
})

onUnmounted(() => {
  chartInstance?.destroy()
  chartInstance = null
})
</script>

<template>
  <div
    class="relative h-64"
    data-prueba="grafico-semillas"
  >
    <canvas
      ref="chartCanvas"
      role="img"
      :aria-label="`ROC-AUC e índice de Boyce en ${props.semillas.length} semillas de validación`"
    />
  </div>
</template>
