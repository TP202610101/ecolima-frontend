import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DetalleSitio, DistritosGeoJSON, Fuente, ResumenTamizaje, VersionActiva } from '../entities/AnalisisV1'
import { AnalisisV1Repository } from '../repositories/AnalisisV1Repository'
import {
  PROVINCIA, construirLugares, enAmbito, filtrosActivos, filtrosIniciales, nombreAmbito, ORDEN_INICIAL,
  paginar, seleccionar, type Ambito, type FiltrosLugares, type Lugar, type OrdenTabla,
} from '../utils/lecturaV1'

// Experiencia V5 del analista (Análisis V1 y Reportes V1). Solo consume /api/v1/analisis/*:
// versión activa, distritos, todos los sitios (con distancia y K1–K4), tamizaje, detalle y fuentes.
// Lista, mapa, cifras y exportaciones salen de la misma selección. No mezcla datos del prototipo demo.

const CLAVE_MI_DISTRITO = 'ecolima-v1-mi-distrito'

function mensaje(e: unknown, porDefecto: string): string {
  const x = e as { response?: { status?: number }; message?: string }
  if (x?.response?.status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.'
  if (x?.response?.status === 403) return 'Tu cuenta no tiene acceso a los resultados V1.'
  if (x?.message === 'Network Error') return 'No se pudo conectar con el servidor. Revisa que el backend esté encendido.'
  return porDefecto
}

function leerMiDistrito(usuario: string): string | null {
  try { return localStorage.getItem(`${CLAVE_MI_DISTRITO}:${usuario}`) } catch { return null }
}
function guardarMiDistrito(usuario: string, u: string) {
  try { localStorage.setItem(`${CLAVE_MI_DISTRITO}:${usuario}`, u) } catch { /* sin almacenamiento */ }
}

export const useExploracionV1Store = defineStore('exploracionV1', () => {
  // ── Carga ────────────────────────────────────────────────────────────────────────────────────────
  const version = ref<VersionActiva | null>(null)
  const sinVersion = ref(false)
  const distritos = ref<DistritosGeoJSON | null>(null)
  const lugares = ref<Lugar[]>([])
  const tamizaje = ref<ResumenTamizaje | null>(null)
  const cargando = ref(false)
  const error = ref<string | null>(null)
  const cargado = ref(false)

  // ── Cuenta y ámbito ──────────────────────────────────────────────────────────────────────────────
  const usuario = ref('')
  // La cuenta no trae distrito asociado (users no tiene ubigeo): se usa el que el analista fija en este navegador.
  const miDistrito = ref<string | null>(null)
  const ambito = ref<Ambito>(PROVINCIA)

  // ── Filtros y estado de pantalla (compartidos por Análisis y Reportes) ────────────────────────────
  const filtros = ref<FiltrosLugares>(filtrosIniciales())
  const capaExistentes = ref(true)
  const avisoCerrado = ref(false)
  const pag = ref(1)
  const porPag = ref(10)
  const selId = ref<string | null>(null)
  const masDetalles = ref(false)
  const detalle = ref<DetalleSitio | null>(null)
  const cargandoDetalle = ref(false)
  const errorDetalle = ref<string | null>(null)
  const repPag = ref(1)
  const repPorPag = ref(10)
  const repOrden = ref<OrdenTabla>({ ...ORDEN_INICIAL })
  const distPag = ref<number | null>(null)
  const distPorPag = ref(10)
  const fuentes = ref<Fuente[]>([])
  const errorFuentes = ref<string | null>(null)
  let reqDetalle = 0

  // ── Derivados ────────────────────────────────────────────────────────────────────────────────────
  const topK = computed(() => version.value?.mcda.top_k ?? 110)
  const porId = computed(() => new Map(lugares.value.map(l => [l.id, l])))
  const existentes = computed(() => lugares.value.filter(l => l.grupo === 'exist'))
  const conteosDistrito = computed(() => new Map((distritos.value?.features ?? []).map(f => [f.properties.ubigeo, f.properties])))
  /** Distritos con lugares que pasaron la revisión preliminar (los únicos con orden de revisión). */
  const distritosConDatos = computed(() => (distritos.value?.features ?? [])
    .map(f => f.properties).filter(p => p.n_apto_tamizaje > 0)
    .map(p => p.ubigeo))
  const distritosSinLugares = computed(() => (distritos.value?.features ?? [])
    .map(f => f.properties).filter(p => p.n_sitios - p.n_punto_existente === 0).map(p => p.ubigeo))
  const nAptos = computed(() => lugares.value.filter(l => l.rango != null).length)
  const esMiDistrito = computed(() => miDistrito.value != null && ambito.value === miDistrito.value)

  const seleccion = computed(() => seleccionar(lugares.value, ambito.value, filtros.value))
  const existentesAmbito = computed(() => existentes.value.filter(l => enAmbito(l, ambito.value)))
  const lugaresAmbito = computed(() => lugares.value.filter(l => l.grupo !== 'exist' && enAmbito(l, ambito.value)))
  const textoFiltros = computed(() => filtrosActivos(filtros.value, topK.value))
  const hayFiltros = computed(() => textoFiltros.value.length > 0)
  const paginaLista = computed(() => paginar(seleccion.value, pag.value, porPag.value))
  const seleccionado = computed(() => (selId.value ? porId.value.get(selId.value) ?? null : null))

  function cifras(lista: Lugar[]) {
    return {
      ev: lista.length,
      aptos: lista.filter(l => l.rango != null).length,
      excl: lista.filter(l => l.grupo === 'excl').length,
      top: lista.filter(l => l.top).length,
      exist: existentesAmbito.value.length,
    }
  }
  const cifrasAmbito = computed(() => cifras(lugaresAmbito.value))
  const cifrasSeleccion = computed(() => cifras(seleccion.value))
  /** Lugares con orden en el distrito de un lugar (base del «3.º de 73»). */
  const aptosDistrito = (u: string) => conteosDistrito.value.get(u)?.n_apto_tamizaje ?? 0

  // ── Acciones ─────────────────────────────────────────────────────────────────────────────────────
  async function inicializar(usuarioId: string) {
    usuario.value = usuarioId
    miDistrito.value = leerMiDistrito(usuarioId)
    if (cargado.value || cargando.value) return
    cargando.value = true
    error.value = null
    sinVersion.value = false
    try {
      const v = await AnalisisV1Repository.getVersionActiva()
      if (!v) { sinVersion.value = true; return }
      version.value = v
      const [d, s, t] = await Promise.all([
        AnalisisV1Repository.getDistritos(),
        AnalisisV1Repository.getTodosLosSitios(),
        AnalisisV1Repository.getTamizaje(),
      ])
      distritos.value = d
      lugares.value = construirLugares(s.items)
      tamizaje.value = t
      if (miDistrito.value && !distritosConDatos.value.includes(miDistrito.value)) miDistrito.value = null
      ambito.value = miDistrito.value ?? PROVINCIA
      cargado.value = true
    } catch (e) {
      error.value = mensaje(e, 'No se pudieron cargar los resultados V1. Intenta de nuevo.')
    } finally {
      cargando.value = false
    }
  }

  function ambitoValido(a: string) { return a === PROVINCIA || distritosConDatos.value.includes(a) }

  function irAPaginaDe(id: string) {
    const i = seleccion.value.findIndex(l => l.id === id)
    if (i >= 0) pag.value = Math.floor(i / porPag.value) + 1
  }

  function cambiarAmbito(a: string) {
    if (!ambitoValido(a) || a === ambito.value) return
    ambito.value = a
    pag.value = 1
    repPag.value = 1
    const sel = selId.value ? porId.value.get(selId.value) : undefined
    if (sel && !enAmbito(sel, a)) elegir(null)
    else if (selId.value) irAPaginaDe(selId.value)
  }

  function fijarMiDistrito(u: string) {
    if (!distritosConDatos.value.includes(u)) return
    miDistrito.value = u
    guardarMiDistrito(usuario.value, u)
  }

  function alCambiarFiltros() {
    pag.value = 1
    repPag.value = 1
    if (selId.value && !seleccion.value.some(l => l.id === selId.value)) elegir(null)
  }
  function setFiltros(cambios: Partial<FiltrosLugares>) {
    filtros.value = { ...filtros.value, ...cambios, grupos: { ...filtros.value.grupos, ...(cambios.grupos ?? {}) } }
    alCambiarFiltros()
  }
  function restablecerFiltros() {
    filtros.value = filtrosIniciales()
    capaExistentes.value = true
    alCambiarFiltros()
  }

  async function elegir(id: string | null) {
    const r = ++reqDetalle
    if (id !== selId.value) masDetalles.value = false
    selId.value = id
    detalle.value = null
    errorDetalle.value = null
    if (!id) { cargandoDetalle.value = false; return }
    const l = porId.value.get(id)
    if (l && !enAmbito(l, ambito.value)) { ambito.value = l.ubigeo; pag.value = 1 }
    irAPaginaDe(id)
    cargandoDetalle.value = true
    try {
      const d = await AnalisisV1Repository.getSitio(id)
      if (r === reqDetalle) detalle.value = d
    } catch (e) {
      if (r === reqDetalle) errorDetalle.value = mensaje(e, 'No se pudo cargar el detalle de este lugar.')
    } finally {
      if (r === reqDetalle) cargandoDetalle.value = false
    }
  }

  function cambiarPagina(delta: number) { pag.value = paginar(seleccion.value, pag.value + delta, porPag.value).p }
  function cambiarPorPagina(v: number) {
    const primero = paginaLista.value.desde
    porPag.value = v
    pag.value = Math.floor(primero / v) + 1
  }

  async function cargarFuentes() {
    if (fuentes.value.length) return
    errorFuentes.value = null
    try { fuentes.value = await AnalisisV1Repository.getFuentes() } catch (e) { errorFuentes.value = mensaje(e, 'No se pudieron cargar las fuentes.') }
  }

  /** Verificación en campo de un lugar según el resumen de tamizaje de la API (en V1 todo está pendiente). */
  function verificacionCampo(l: Lugar): string {
    const v = tamizaje.value?.estado_verificacion_campo ?? {}
    const candidatos = lugares.value.filter(x => x.grupo !== 'exist').length
    if (l.grupo !== 'exist' && v.pendiente_campo === candidatos) return 'pendiente_campo (C02–C09)'
    return 'ver detalle del lugar'
  }

  return {
    version, sinVersion, distritos, lugares, tamizaje, cargando, error, cargado,
    usuario, miDistrito, ambito, filtros, capaExistentes, avisoCerrado, pag, porPag, selId, masDetalles,
    detalle, cargandoDetalle, errorDetalle, repPag, repPorPag, repOrden, distPag, distPorPag, fuentes, errorFuentes,
    topK, porId, existentes, conteosDistrito, distritosConDatos, distritosSinLugares, nAptos, esMiDistrito,
    seleccion, existentesAmbito, lugaresAmbito, textoFiltros, hayFiltros, paginaLista, seleccionado,
    cifrasAmbito, cifrasSeleccion, aptosDistrito,
    inicializar, ambitoValido, cambiarAmbito, fijarMiDistrito, setFiltros, restablecerFiltros, elegir,
    cambiarPagina, cambiarPorPagina, cargarFuentes, verificacionCampo, irAPaginaDe,
    nombreAmbitoActual: computed(() => nombreAmbito(ambito.value)),
  }
})
