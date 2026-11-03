import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { CargaMasivaRepository, ErrorCargaMasiva } from '../repositories/CargaMasivaRepository'
import { LIMITE_BYTES, type ResultadoCreacion, type ResultadoValidacion } from '../entities/CargaMasiva'

// Creación de usuarios en bloque desde «Gestión de usuarios», en tres pasos:
//   archivo → revision (resultado de validar) → resultado (usuarios creados).
// El servidor no guarda el archivo: el File se conserva aquí entre la validación y la confirmación.
export type PasoCarga = 'archivo' | 'revision' | 'resultado'

export const useCargaMasivaStore = defineStore('carga-masiva', () => {
  const paso = ref<PasoCarga>('archivo')
  const archivo = ref<File | null>(null)
  const validacion = ref<ResultadoValidacion | null>(null)
  const resultado = ref<ResultadoCreacion | null>(null)
  const procesando = ref(false)
  const error = ref<string | null>(null)
  /** true cuando la revisión viene de un 409 al crear (el servidor encontró errores al revalidar). */
  const rechazadoAlCrear = ref(false)

  const conError = computed(() => validacion.value?.rows.filter(r => r.status === 'error').length ?? 0)
  const puedeCrear = computed(() => validacion.value?.valid === true && !procesando.value)

  /** Comprobación en el cliente: solo extensión .csv y tamaño. El contenido lo valida el servidor. */
  function elegirArchivo(f: File | null) {
    error.value = null
    archivo.value = null
    if (!f) return
    if (!/\.csv$/i.test(f.name)) { error.value = 'El archivo debe tener extensión .csv.'; return }
    if (f.size > LIMITE_BYTES) { error.value = 'El archivo pesa más de 1 MB. Divide la lista en varios archivos.'; return }
    if (f.size === 0) { error.value = 'El archivo está vacío.'; return }
    archivo.value = f
  }

  async function validar() {
    if (!archivo.value || procesando.value) return
    procesando.value = true
    error.value = null
    rechazadoAlCrear.value = false
    try {
      validacion.value = await CargaMasivaRepository.validar(archivo.value)
      paso.value = 'revision'
    } catch (e) {
      error.value = e instanceof ErrorCargaMasiva ? e.message : 'No se pudo procesar el archivo. Intenta de nuevo.'
    } finally {
      procesando.value = false
    }
  }

  async function confirmar(): Promise<boolean> {
    if (!archivo.value || !puedeCrear.value) return false
    procesando.value = true
    error.value = null
    try {
      resultado.value = await CargaMasivaRepository.confirmar(archivo.value)
      paso.value = 'resultado'
      return true
    } catch (e) {
      if (e instanceof ErrorCargaMasiva && e.tipo === 'filas' && e.validacion) {
        // El servidor revalidó y encontró errores: se vuelven a mostrar las filas, sin crear nada.
        validacion.value = e.validacion
        rechazadoAlCrear.value = true
        paso.value = 'revision'
      } else {
        error.value = e instanceof ErrorCargaMasiva ? e.message : 'No se pudo procesar el archivo. Intenta de nuevo.'
      }
      return false
    } finally {
      procesando.value = false
    }
  }

  /** Volver al paso 1 para elegir otro archivo (se descarta el anterior). */
  function otroArchivo() {
    if (procesando.value) return
    archivo.value = null
    validacion.value = null
    error.value = null
    rechazadoAlCrear.value = false
    paso.value = 'archivo'
  }

  function reiniciar() {
    paso.value = 'archivo'
    archivo.value = null
    validacion.value = null
    resultado.value = null
    procesando.value = false
    error.value = null
    rechazadoAlCrear.value = false
  }

  return {
    paso, archivo, validacion, resultado, procesando, error, rechazadoAlCrear, conError, puedeCrear,
    elegirArchivo, validar, confirmar, otroArchivo, reiniciar,
  }
})
