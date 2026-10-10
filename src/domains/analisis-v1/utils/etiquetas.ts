// Etiquetas y textos de la vista Análisis V1.
// Reglas de lectura del paquete V1 que estos textos respetan:
//  - apto_tamizaje no significa «viable»: la verificación en campo está pendiente;
//  - la propensión ML es parecido con puntos existentes, no idoneidad ni probabilidad de éxito;
//  - la MCDA ordena (puntaje y rango); no hay categorías Alta/Media/Baja.
import type { ClaseOportunidad, EstadoTamizaje, SitioResumen } from '../entities/AnalisisV1'

export const ETIQUETA_TAMIZAJE: Record<EstadoTamizaje, string> = {
  apto_tamizaje: 'Pasa el tamizaje',
  excluido_tamizaje: 'Excluido en el tamizaje',
  punto_existente: 'Punto existente registrado',
}

export const ETIQUETA_CLASE: Record<ClaseOportunidad, string> = {
  paradero_transporte_publico: 'Paradero de transporte público',
  mercado_municipal_no_confirmado: 'Mercado (municipal no confirmado)',
  centro_comercial: 'Centro comercial',
  parque: 'Parque',
}

export const ETIQUETA_REGLA: Record<string, string> = {
  T01_territorio: 'T01 · Territorio (E01)',
  T02_acceso_osm: 'T02 · Acceso según OSM (E01)',
  T03_trazabilidad_documental: 'T03 · Trazabilidad documental (C01)',
  T04_datos_secundarios: 'T04 · Datos secundarios completos',
  T05_sin_punto_existente_30m: 'T05 · Sin punto existente a ≤ 30 m',
}

export const ETIQUETA_RESULTADO_REGLA: Record<string, string> = {
  cumple: 'cumple',
  cumple_parcial: 'cumple parcialmente',
  no_cumple: 'no cumple',
}

export const ETIQUETA_GRUPO_CONTRIB: Record<string, string> = {
  clase: 'Clase de oportunidad',
  poblacion: 'Población (WorldPop)',
  vias: 'Densidad vial (OSM)',
  pois: 'Densidad de POI (OSM)',
  construido: 'Superficie construida (GHSL)',
  pendiente: 'Pendiente (Copernicus DEM)',
  sigersol: 'Generación per cápita (SIGERSOL)',
}

export const ETIQUETA_VARIABLE: Record<string, string> = {
  pob_wp_r250: 'Población, 250 m',
  pob_wp_r500: 'Población, 500 m',
  pob_wp_r1000: 'Población, 1000 m',
  vias_km_km2_r250: 'Densidad vial, 250 m',
  vias_km_km2_r500: 'Densidad vial, 500 m',
  vias_km_km2_r1000: 'Densidad vial, 1000 m',
  poi_n_km2_r250: 'Densidad de POI, 250 m',
  poi_n_km2_r500: 'Densidad de POI, 500 m',
  poi_n_km2_r1000: 'Densidad de POI, 1000 m',
  ghsl_frac_construida_r250: 'Fracción construida, 250 m',
  ghsl_frac_construida_r500: 'Fracción construida, 500 m',
  ghsl_frac_construida_r1000: 'Fracción construida, 1000 m',
  pendiente_grados: 'Pendiente',
  sigersol_gpc_municipal_kg_hab_dia: 'Generación per cápita municipal',
}

export const ETIQUETA_ESQUEMA: Record<string, string> = {
  iguales: 'Pesos iguales (principal)',
  critic: 'CRITIC',
  entropia: 'Entropía (solo contraste)',
}

// Coma decimal, como en el paper (0,749).
const nf = (min: number, max: number) =>
  new Intl.NumberFormat('es', { minimumFractionDigits: min, maximumFractionDigits: max })

export function formatoEntero(n: number | null | undefined): string {
  return n == null ? '—' : nf(0, 0).format(n)
}

export function formatoDecimal(n: number | null | undefined, dec = 3): string {
  return n == null ? '—' : nf(dec, dec).format(n)
}

/** Fracción 0–1 como porcentaje («93,6 %»). */
export function formatoPorcentaje(f: number | null | undefined, dec = 1): string {
  return f == null ? '—' : `${nf(dec, dec).format(f * 100)} %`
}

/** percentil_oof (0, 1] → «P21». Es una posición relativa entre los sitios, no una probabilidad. */
export function formatoPercentil(p: number | null | undefined): string {
  if (p == null) return '—'
  return `P${Math.min(100, Math.max(1, Math.round(p * 100)))}`
}

/** Valor de una variable con su unidad del manifiesto. */
export function formatoVariable(valor: number | string | null, unidad: string | null): string {
  if (valor == null) return '—'
  if (typeof valor === 'string') return valor
  const u = unidad && unidad !== 'categoria' ? ` ${unidad.replace('km2', 'km²').replace('kg/hab/dia', 'kg/hab/día')}` : ''
  if (unidad === 'proporcion') return formatoPorcentaje(valor)
  const dec = Math.abs(valor) >= 100 ? 0 : 2
  return `${nf(0, dec).format(valor)}${u}`
}

/** Unidad del valor bruto de cada criterio MCDA (según la definición de K1–K4 del paquete). */
export const UNIDAD_CRITERIO: Record<string, string> = {
  K1_demanda: 'hab',
  K2_generacion: 'kg/día',
  K3_brecha: 'm',
  K4_accesibilidad: 'km/km²',
}

/**
 * Texto para la columna/posición MCDA. Los sitios sin MCDA reciben un texto explícito
 * en lugar de un puntaje ficticio.
 */
export function textoSinMcda(estado: EstadoTamizaje): string {
  switch (estado) {
    case 'punto_existente':
      return 'Sin MCDA: punto existente'
    case 'excluido_tamizaje':
      return 'Sin MCDA: excluido'
    default:
      return 'Sin MCDA'
  }
}

export function explicacionSinMcda(estado: EstadoTamizaje, motivo: string | null): string {
  if (estado === 'punto_existente')
    return 'No se prioriza: es un punto de reciclaje ya registrado. Se usa como referencia para medir la brecha de cobertura (K3).'
  if (estado === 'excluido_tamizaje')
    return `No entra en la MCDA porque fue excluido en el tamizaje${motivo ? `: ${motivo}` : '.'}`
  return 'Este sitio no tiene puntaje MCDA en la versión activa.'
}

/** Categoría visual del sitio en el mapa (no es una escala de prioridad). */
export type CategoriaMapa = 'existente' | 'top_k' | 'candidato' | 'excluido'

export function categoriaMapa(s: Pick<SitioResumen, 'estado_tamizaje' | 'mcda'>): CategoriaMapa {
  if (s.estado_tamizaje === 'punto_existente') return 'existente'
  if (s.estado_tamizaje === 'excluido_tamizaje') return 'excluido'
  return s.mcda?.en_top_k ? 'top_k' : 'candidato'
}

export const COLOR_CATEGORIA: Record<CategoriaMapa, string> = {
  existente: '#2563eb',
  top_k: '#15803d',
  candidato: '#94a3b8',
  excluido: '#ea580c',
}
