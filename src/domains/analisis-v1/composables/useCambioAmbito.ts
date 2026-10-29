import { computed, ref } from 'vue'
import { useExploracionV1Store } from '../stores/useExploracionV1Store'

// Cambio de distrito (Análisis y Reportes, desde SelectorAmbitoV1).
// - La elección se refleja al instante (estado local) y el recálculo del reporte se hace un cuadro después,
//   para que primero se pinte la elección y el aviso «Actualizando…» (con CPU lenta, recalcular un distrito
//   con datos tarda cientos de ms).
// - Si se eligen varios distritos seguidos, solo se aplica el último.
// - El estado pendiente es uno solo para toda la página: el selector y la vista que lo contiene lo comparten.
// Los datos de todos los distritos ya están en el cliente: cambiar de distrito no hace peticiones.
const pendiente = ref<string | null>(null)
let turno = 0

const siguienteCuadro = (fn: () => void) => {
  const raf = typeof window.requestAnimationFrame === 'function' ? window.requestAnimationFrame : (cb: () => void) => setTimeout(cb, 16)
  raf(() => setTimeout(fn, 0))
}

export function useCambioAmbito() {
  const store = useExploracionV1Store()

  function elegir(valor: string) {
    if (valor === (pendiente.value ?? store.ambito)) return
    pendiente.value = valor
    const t = ++turno
    siguienteCuadro(() => {
      if (t !== turno) return
      store.cambiarAmbito(valor)
      pendiente.value = null
    })
  }

  // Lo que se muestra como elegido: la elección pendiente o, si no hay, el ámbito del store
  // (si el store no acepta el valor, vuelve al ámbito real).
  const valorActual = computed(() => pendiente.value ?? store.ambito)
  const actualizando = computed(() => pendiente.value !== null)

  return { elegir, valorActual, actualizando }
}
