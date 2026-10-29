import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ModeloV1, ResumenMcda, ResumenTamizaje, VersionActiva } from '@/domains/analisis-v1/entities/AnalisisV1'
import type { ListaVersiones, VersionComparada } from '../entities/ModelVersion'
import { MLRepository } from '../repositories/MLRepository'

// Panel ML (solo admin): estado de solo lectura del paquete de resultados importado.
// Registrar o activar una versión se hace en el backend con el script de importación, no desde aquí.

function mensaje(e: unknown, porDefecto: string): string {
  const x = e as { response?: { status?: number; data?: { detail?: unknown } }; message?: string }
  if (x?.response?.status === 404 && typeof x.response.data?.detail === 'string') return x.response.data.detail
  if (x?.response?.status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.'
  if (x?.response?.status === 403) return 'Tu cuenta no tiene acceso a esta información.'
  if (x?.message === 'Network Error') return 'No se pudo conectar con el servidor.'
  return porDefecto
}

export const useMLStore = defineStore('ml', () => {
  const versiones = ref<ListaVersiones | null>(null)
  const activa = ref<VersionActiva | null>(null)
  const modelo = ref<ModeloV1 | null>(null)
  const mcda = ref<ResumenMcda | null>(null)
  const tamizaje = ref<ResumenTamizaje | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  // Cada bloque puede fallar por separado sin vaciar el resto del panel.
  const errores = ref<Partial<Record<'versiones' | 'activa' | 'modelo' | 'mcda' | 'tamizaje', string>>>({})

  const compareFetching = ref(false)
  const compareResult = ref<{ a: VersionComparada; b: VersionComparada } | null>(null)
  const compareError = ref<string | null>(null)

  let generacion = 0

  const listaVersiones = computed(() => versiones.value?.versiones ?? [])
  const puedeComparar = computed(() => listaVersiones.value.length >= 2)

  async function fetchPanel() {
    const g = ++generacion
    loading.value = true
    error.value = null
    errores.value = {}
    const pedidos = {
      versiones: MLRepository.getVersiones(),
      activa: MLRepository.getVersion(),
      modelo: MLRepository.getModelo(),
      mcda: MLRepository.getMcda(),
      tamizaje: MLRepository.getTamizaje(),
    }
    const claves = Object.keys(pedidos) as Array<keyof typeof pedidos>
    const res = await Promise.allSettled(claves.map(k => pedidos[k]))
    if (g !== generacion) return
    const nuevos: typeof errores.value = {}
    res.forEach((r, i) => {
      const k = claves[i]
      if (r.status === 'rejected') { nuevos[k] = mensaje(r.reason, 'No se pudo cargar esta sección.'); return }
      if (k === 'versiones') versiones.value = r.value as ListaVersiones
      else if (k === 'activa') activa.value = r.value as VersionActiva
      else if (k === 'modelo') modelo.value = r.value as ModeloV1
      else if (k === 'mcda') mcda.value = r.value as ResumenMcda
      else tamizaje.value = r.value as ResumenTamizaje
    })
    errores.value = nuevos
    if (res.every(r => r.status === 'rejected')) error.value = Object.values(nuevos)[0] ?? 'No se pudo cargar el Panel ML.'
    loading.value = false
  }

  async function fetchCompare(vA: string, vB: string) {
    const g = generacion
    compareFetching.value = true
    compareError.value = null
    try {
      const leer = async (v: string): Promise<VersionComparada> => {
        const [version, modeloV] = await Promise.all([MLRepository.getVersion(v), MLRepository.getModelo(v).catch(() => null)])
        return { version, modelo: modeloV }
      }
      const [a, b] = await Promise.all([leer(vA), leer(vB)])
      if (g === generacion) compareResult.value = { a, b }
    } catch (e) {
      if (g === generacion) compareError.value = mensaje(e, 'No se pudieron comparar las versiones.')
    } finally {
      if (g === generacion) compareFetching.value = false
    }
  }

  function clearCompare() {
    compareResult.value = null
    compareError.value = null
  }

  function clearData() {
    generacion++
    versiones.value = null
    activa.value = null
    modelo.value = null
    mcda.value = null
    tamizaje.value = null
    loading.value = false
    error.value = null
    errores.value = {}
    compareFetching.value = false
    compareResult.value = null
    compareError.value = null
  }

  return {
    versiones, activa, modelo, mcda, tamizaje, loading, error, errores,
    compareFetching, compareResult, compareError,
    listaVersiones, puedeComparar,
    fetchPanel, fetchCompare, clearCompare, clearData,
  }
})
