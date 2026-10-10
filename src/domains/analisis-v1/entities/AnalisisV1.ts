// Tipos de las respuestas de /api/v1/analisis/* (resultados V1 importados del paquete versionado).
// Reflejan lo que devuelve el backend; no se recalcula nada en el cliente.

export type EstadoTamizaje = 'apto_tamizaje' | 'excluido_tamizaje' | 'punto_existente'
export type ClaseOportunidad =
  | 'paradero_transporte_publico'
  | 'mercado_municipal_no_confirmado'
  | 'centro_comercial'
  | 'parque'
export type RolSitio = 'positivo' | 'fondo'

export interface Atribucion {
  licencia: string
  licencia_url: string | null
  aviso: string
  fuentes: string
  paquete_version: string
}

export interface Avisos {
  tamizaje: string
  propension: string
  mcda: string
}

export interface VersionActiva {
  paquete_version: string
  dataset_version: string
  modelo_version: string
  mcda_version: string
  fecha_paquete: string
  descripcion: string
  licencia_datos: string
  activa: boolean
  importado_en: string
  manifest_sha256: string
  conteos: {
    sitios: number
    positivos: number
    fondo: number
    distritos_con_sitios: number
    distritos: number
    estado_tamizaje: Partial<Record<EstadoTamizaje, number>>
  }
  dataset: {
    version: string
    filas: number
    positivos: number
    fondo: number
    distritos: number
    distritos_con_positivos: number
    unidades: Record<string, string>
  }
  modelo: { version: string; algoritmo: string; cv: string; semillas: number[]; features: string[] }
  mcda: {
    version: string
    metodo: string
    radio_principal_m: number
    top_k: number
    top_k_fraccion: number
    montecarlo_n: number
    montecarlo_semilla: number
    esquema_principal: string
  }
  avisos: Avisos
  atribucion: Atribucion
}

export interface McdaSitio {
  puntaje: number
  rango: number
  en_top_k: boolean
}

export type CriterioK = 'K1_demanda' | 'K2_generacion' | 'K3_brecha' | 'K4_accesibilidad'
export interface CriterioValor { bruto: number; norm: number }

export interface SitioResumen {
  sitio_id: string
  lon: number
  lat: number
  ubigeo: string
  distrito: string
  clase_oportunidad: ClaseOportunidad
  rol: RolSitio
  estado_tamizaje: EstadoTamizaje
  codigo_exclusion: string | null
  propension_percentil: number
  // Solo los sitios apto_tamizaje tienen MCDA; el resto llega con null.
  mcda: McdaSitio | null
  mc_frecuencia_top_k: number | null
  // Ampliación 2026-10-10 de /sitios (del tamizaje y de criterio_mcda del paquete; no se recalculan).
  dist_punto_existente_m?: number | null
  punto_existente_mas_cercano?: string | null
  criterios_mcda?: Record<CriterioK, CriterioValor> | null
}

export interface PaginaSitios {
  paquete_version: string
  esquema: string
  total: number
  limit: number
  offset: number
  items: SitioResumen[]
  avisos: Avisos
  atribucion: Atribucion
}

export type SitioProps = Omit<SitioResumen, 'lon' | 'lat'>

export interface SitiosGeoJSON {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    id: string
    geometry: { type: 'Point'; coordinates: [number, number] }
    properties: SitioProps
  }>
  paquete_version: string
  esquema: string
}

export interface DistritoProps {
  ubigeo: string
  nombre: string
  n_sitios: number
  n_apto_tamizaje: number
  n_excluido_tamizaje: number
  n_punto_existente: number
  n_top_k: number
}

export interface DistritosGeoJSON {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    id: string
    geometry: GeoJSON.MultiPolygon | GeoJSON.Polygon | null
    properties: DistritoProps
  }>
}

export type ResultadoRegla = 'cumple' | 'cumple_parcial' | 'no_cumple'

export interface DetalleSitio {
  sitio_id: string
  lon: number
  lat: number
  ubigeo: string
  distrito: string
  clase_oportunidad: ClaseOportunidad
  rol: RolSitio
  tamizaje: {
    estado_tamizaje: EstadoTamizaje
    reglas: Record<string, ResultadoRegla | null>
    dist_punto_existente_m: number | null
    punto_existente_mas_cercano: string | null
    codigo_exclusion: string | null
    motivo_exclusion: string | null
    controles_campo: Record<string, string | null>
    estado_verificacion_campo: string | null
  }
  variables: Record<string, { valor: number | string | null; unidad: string | null }>
  propension: {
    percentil_oof: number
    propension_oof: number
    propension_oof_de: number
    percentil_final: number
    propension_final: number
    contribuciones_logit: Record<string, number>
    aviso: string
  }
  criterios_mcda: Record<string, { bruto: number; norm: number }> | null
  mcda: Array<{ esquema: string; puntaje: number; rango: number; en_top_k: boolean; mcda_version: string }>
  montecarlo: {
    mc_rango_mediana: number
    mc_rango_p05: number
    mc_rango_p95: number
    mc_frecuencia_top_k: number
  } | null
  avisos: Avisos
  paquete_version: string
  atribucion: Atribucion
}

export interface Fuente {
  codigo: string
  tipo: string
  nombre: string
  institucion: string
  url_descarga: string | null
  url_pagina: string | null
  licencia: string
  licencia_url: string | null
  licencia_estado: string
  licencia_verificada_en: string
  atribucion: string
  fecha_corte: string | null
  sha256: string
  bytes: number
  uso_en_v1: string
}

export interface Estadistico {
  media: number
  de?: number
  'p2.5'?: number
  'p97.5'?: number
}

export interface ModeloV1 {
  modelo_version: string
  algoritmo: string
  rol: string
  metricas_resumen: Record<string, Estadistico>
  model_card: Record<string, unknown>
  aviso: string
}

export interface ResumenMcda {
  mcda_version: string
  metodo: string
  criterios: Record<string, string>
  radio_principal_m: number
  top_k: number
  top_k_fraccion: number
  esquema_principal: string
  aviso: string
}

export interface ResumenTamizaje {
  estado_tamizaje: Partial<Record<EstadoTamizaje, number>>
  reglas: Record<string, Record<string, number>>
  exclusiones: Array<{ codigo_exclusion: string; motivo_exclusion: string; n: number }>
  estado_verificacion_campo: Record<string, number>
  aviso: string
}

export interface FiltrosV1 {
  ubigeo: string | null
  estado_tamizaje: EstadoTamizaje | null
  solo_top_k: boolean
}
