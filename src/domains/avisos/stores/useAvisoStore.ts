import { defineStore } from 'pinia'
import { ref } from 'vue'
import { AvisosRepository } from '../repositories/AvisosRepository'
import { AVISOS_AYUDA, type SeccionAyuda } from '@/domains/analisis-v1/components/avisoAyuda'

// Lectura de cada sección de la ayuda del Análisis (AVISOS_AYUDA) para la cuenta en sesión, en su versión actual.
// Cada sección se consulta y se confirma por separado. Si el servicio falla (o el backend aún no tiene los
// endpoints), esa sección no se exige: la ayuda se abre y se cierra con normalidad.
export type EstadoLectura = 'inactivo' | 'comprobando' | 'pendiente' | 'confirmado' | 'error'

const vacio = (): Record<SeccionAyuda, EstadoLectura> => ({ orden: 'inactivo', fuentes: 'inactivo', modelo: 'inactivo' })

export const useAvisoStore = defineStore('aviso', () => {
  const estados = ref(vacio())
  const usuario = ref<string | null>(null)
  // Sube en clearData o al cambiar de cuenta: una respuesta que llega después no se aplica a la cuenta siguiente.
  let turno = 0

  /** Mientras se comprueba también se exige: así no se puede cerrar antes de saber la respuesta. */
  const pideLectura = (s: SeccionAyuda) => estados.value[s] === 'pendiente' || estados.value[s] === 'comprobando'

  async function comprobar(usuarioId: string, s: SeccionAyuda) {
    if (usuario.value !== usuarioId) { turno++; estados.value = vacio(); usuario.value = usuarioId }
    if (estados.value[s] === 'confirmado' || estados.value[s] === 'comprobando' || estados.value[s] === 'pendiente') return
    const t = turno
    estados.value = { ...estados.value, [s]: 'comprobando' }
    try {
      const r = await AvisosRepository.getEstado(AVISOS_AYUDA[s])
      if (t === turno) estados.value = { ...estados.value, [s]: r.confirmado ? 'confirmado' : 'pendiente' }
    } catch {
      if (t === turno) estados.value = { ...estados.value, [s]: 'error' }
    }
  }

  /** Registra la lectura de una sección. Devuelve false si no se pudo (la sección sigue pendiente). */
  async function confirmar(s: SeccionAyuda): Promise<boolean> {
    const t = turno
    try {
      await AvisosRepository.confirmar(AVISOS_AYUDA[s])
      if (t === turno) estados.value = { ...estados.value, [s]: 'confirmado' }
      return true
    } catch {
      return false
    }
  }

  function clearData() {
    turno++
    estados.value = vacio()
    usuario.value = null
  }

  return { estados, usuario, pideLectura, comprobar, confirmar, clearData }
})
