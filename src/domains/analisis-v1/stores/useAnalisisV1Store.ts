import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  DetalleSitio,
  DistritosGeoJSON,
  FiltrosV1,
  Fuente,
  ModeloV1,
  PaginaSitios,
  ResumenMcda,
  SitiosGeoJSON,
  VersionActiva,
} from '../entities/AnalisisV1'
import { AnalisisV1Repository } from '../repositories/AnalisisV1Repository'

export const TAMANO_PAGINA = 25

const FILTROS_INICIALES: FiltrosV1 = { ubigeo: null, estado_tamizaje: null, solo_top_k: false }

function mensaje(e: unknown, porDefecto: string): string {
  return e instanceof Error && e.message ? e.message : porDefecto
}

// Solo consume /api/v1/analisis/* (resultados V1). No mezcla datos del prototipo demo.
export const useAnalisisV1Store = defineStore('analisisV1', () => {
  const version = ref<VersionActiva | null>(null)
  const sinVersion = ref(false)
  const modelo = ref<ModeloV1 | null>(null)
  const mcda = ref<ResumenMcda | null>(null)
  const distritos = ref<DistritosGeoJSON | null>(null)
  const loadingInicial = ref(false)
  const error = ref<string | null>(null)

  const filtros = ref<FiltrosV1>({ ...FILTROS_INICIALES })

  const sitiosGeo = ref<SitiosGeoJSON | null>(null)
  const loadingMapa = ref(false)
  const errorMapa = ref<string | null>(null)

  const pagina = ref<PaginaSitios | null>(null)
  const offset = ref(0)
  const loadingTabla = ref(false)
  const errorTabla = ref<string | null>(null)

  const seleccionadoId = ref<string | null>(null)
  const detalle = ref<DetalleSitio | null>(null)
  const loadingDetalle = ref(false)
  const errorDetalle = ref<string | null>(null)

  const fuentes = ref<Fuente[]>([])
  const loadingFuentes = ref(false)
  const errorFuentes = ref<string | null>(null)

  // Contadores para descartar respuestas viejas cuando los filtros cambian rápido.
  let reqMapa = 0
  let reqTabla = 0
  let reqDetalle = 0

  const opcionesDistrito = computed(() =>
    (distritos.value?.features ?? [])
      .map(f => f.properties)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
  )

  const distritoSeleccionado = computed(() =>
    distritos.value?.features.find(f => f.properties.ubigeo === filtros.value.ubigeo) ?? null,
  )

  const totalMapa = computed(() => sitiosGeo.value?.features.length ?? 0)
  const totalTabla = computed(() => pagina.value?.total ?? 0)

  async function inicializar() {
    loadingInicial.value = true
    error.value = null
    sinVersion.value = false
    try {
      const v = await AnalisisV1Repository.getVersionActiva()
      if (!v) {
        version.value = null
        sinVersion.value = true
        return
      }
      version.value = v
      const [m, mc, d] = await Promise.all([
        AnalisisV1Repository.getModelo(),
        AnalisisV1Repository.getMcda(),
        AnalisisV1Repository.getDistritos(),
      ])
      modelo.value = m
      mcda.value = mc
      distritos.value = d
      await aplicarFiltros()
    } catch (e) {
      error.value = mensaje(e, 'No se pudo cargar el análisis V1.')
    } finally {
      loadingInicial.value = false
    }
  }

  async function cargarMapa() {
    const id = ++reqMapa
    loadingMapa.value = true
    errorMapa.value = null
    try {
      const data = await AnalisisV1Repository.getSitiosGeoJSON(filtros.value)
      if (id === reqMapa) sitiosGeo.value = data
    } catch (e) {
      if (id === reqMapa) errorMapa.value = mensaje(e, 'No se pudieron cargar los sitios del mapa.')
    } finally {
      if (id === reqMapa) loadingMapa.value = false
    }
  }

  async function cargarTabla(nuevoOffset = 0) {
    const id = ++reqTabla
    loadingTabla.value = true
    errorTabla.value = null
    try {
      const data = await AnalisisV1Repository.getSitios(filtros.value, TAMANO_PAGINA, nuevoOffset)
      if (id === reqTabla) {
        pagina.value = data
        offset.value = nuevoOffset
      }
    } catch (e) {
      if (id === reqTabla) errorTabla.value = mensaje(e, 'No se pudo cargar la tabla de priorización.')
    } finally {
      if (id === reqTabla) loadingTabla.value = false
    }
  }

  async function aplicarFiltros() {
    await Promise.all([cargarMapa(), cargarTabla(0)])
  }

  async function setFiltros(cambios: Partial<FiltrosV1>) {
    filtros.value = { ...filtros.value, ...cambios }
    await aplicarFiltros()
  }

  async function limpiarFiltros() {
    filtros.value = { ...FILTROS_INICIALES }
    await aplicarFiltros()
  }

  async function seleccionar(sitioId: string | null) {
    const id = ++reqDetalle
    seleccionadoId.value = sitioId
    errorDetalle.value = null
    if (!sitioId) {
      detalle.value = null
      loadingDetalle.value = false
      return
    }
    loadingDetalle.value = true
    try {
      const data = await AnalisisV1Repository.getSitio(sitioId)
      if (id === reqDetalle) detalle.value = data
    } catch (e) {
      if (id === reqDetalle) {
        detalle.value = null
        errorDetalle.value = mensaje(e, 'No se pudo cargar el detalle del sitio.')
      }
    } finally {
      if (id === reqDetalle) loadingDetalle.value = false
    }
  }

  async function cargarFuentes() {
    if (fuentes.value.length > 0 || loadingFuentes.value) return
    loadingFuentes.value = true
    errorFuentes.value = null
    try {
      fuentes.value = await AnalisisV1Repository.getFuentes()
    } catch (e) {
      errorFuentes.value = mensaje(e, 'No se pudieron cargar las fuentes.')
    } finally {
      loadingFuentes.value = false
    }
  }

  return {
    version,
    sinVersion,
    modelo,
    mcda,
    distritos,
    loadingInicial,
    error,
    filtros,
    sitiosGeo,
    loadingMapa,
    errorMapa,
    pagina,
    offset,
    loadingTabla,
    errorTabla,
    seleccionadoId,
    detalle,
    loadingDetalle,
    errorDetalle,
    fuentes,
    loadingFuentes,
    errorFuentes,
    opcionesDistrito,
    distritoSeleccionado,
    totalMapa,
    totalTabla,
    inicializar,
    cargarMapa,
    cargarTabla,
    aplicarFiltros,
    setFiltros,
    limpiarFiltros,
    seleccionar,
    cargarFuentes,
  }
})
