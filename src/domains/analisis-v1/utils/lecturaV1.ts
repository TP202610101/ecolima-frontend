// Lectura de los resultados V1 para el analista municipal (Análisis V1 y Reportes V1).
// Funciones puras: toman lo que devuelve /api/v1/analisis/* y lo ordenan, filtran, pagina y exportan.
// No recalculan la metodología: el orden dentro de un distrito es el rango provincial del paquete
// filtrado por distrito, y el puesto de cada factor se cuenta entre los lugares del mismo distrito.
// Sin categorías Alta/Media/Baja, sin puntajes ni métricas del modelo en pantalla.
import type { ClaseOportunidad, CriterioK, SitioResumen } from '../entities/AnalisisV1'

export const PROVINCIA = 'lima'
export type Ambito = string // ubigeo del distrito o PROVINCIA
export type Grupo = 'top' | 'cand' | 'excl' | 'exist'
export type Factor = 'k1' | 'k2' | 'k3' | 'k4'
export const FACTORES: Factor[] = ['k1', 'k2', 'k3', 'k4']
const CLAVE_K: Record<Factor, CriterioK> = { k1: 'K1_demanda', k2: 'K2_generacion', k3: 'K3_brecha', k4: 'K4_accesibilidad' }

// ── Nombres oficiales de los 43 distritos (el paquete los trae en mayúsculas y sin tildes) ──────────────
export const NOMBRE_DISTRITO: Record<string, string> = {
  '150101': 'Lima', '150102': 'Ancón', '150103': 'Ate', '150104': 'Barranco', '150105': 'Breña',
  '150106': 'Carabayllo', '150107': 'Chaclacayo', '150108': 'Chorrillos', '150109': 'Cieneguilla',
  '150110': 'Comas', '150111': 'El Agustino', '150112': 'Independencia', '150113': 'Jesús María',
  '150114': 'La Molina', '150115': 'La Victoria', '150116': 'Lince', '150117': 'Los Olivos',
  '150118': 'Lurigancho', '150119': 'Lurín', '150120': 'Magdalena del Mar', '150121': 'Pueblo Libre',
  '150122': 'Miraflores', '150123': 'Pachacámac', '150124': 'Pucusana', '150125': 'Puente Piedra',
  '150126': 'Punta Hermosa', '150127': 'Punta Negra', '150128': 'Rímac', '150129': 'San Bartolo',
  '150130': 'San Borja', '150131': 'San Isidro', '150132': 'San Juan de Lurigancho',
  '150133': 'San Juan de Miraflores', '150134': 'San Luis', '150135': 'San Martín de Porres',
  '150136': 'San Miguel', '150137': 'Santa Anita', '150138': 'Santa María del Mar', '150139': 'Santa Rosa',
  '150140': 'Santiago de Surco', '150141': 'Surquillo', '150142': 'Villa El Salvador',
  '150143': 'Villa María del Triunfo',
}
export function nombreDistrito(ubigeo: string, respaldo = ''): string {
  if (ubigeo === PROVINCIA) return 'provincia de Lima'
  return NOMBRE_DISTRITO[ubigeo] ?? (respaldo ? respaldo.charAt(0) + respaldo.slice(1).toLowerCase() : ubigeo)
}
export const nombreAmbito = (a: Ambito) => (a === PROVINCIA ? 'Provincia de Lima' : nombreDistrito(a))

// ── Vocabulario del analista ────────────────────────────────────────────────────────────────────────
export const CLASE_LARGA: Record<ClaseOportunidad, string> = {
  paradero_transporte_publico: 'Paradero de transporte público',
  mercado_municipal_no_confirmado: 'Mercado (sin confirmar si es municipal)',
  centro_comercial: 'Centro comercial',
  parque: 'Parque',
}
export const CLASE_CORTA: Record<ClaseOportunidad, string> = {
  paradero_transporte_publico: 'Paradero',
  mercado_municipal_no_confirmado: 'Mercado',
  centro_comercial: 'Centro comercial',
  parque: 'Parque',
}
export const CLASE_PLURAL: Record<ClaseOportunidad, string> = {
  paradero_transporte_publico: 'Paraderos',
  mercado_municipal_no_confirmado: 'Mercados',
  centro_comercial: 'Centros comerciales',
  parque: 'Parques',
}
export const CLASES = Object.keys(CLASE_CORTA) as ClaseOportunidad[]

// El paquete V1.0.0 no trae nombre de lugar: se usa una etiqueta genérica por tipo (no se inventan nombres).
export const SIN_NOMBRE = 'Sin nombre en el paquete V1.0.0'
export const etiquetaLugar = (l: { clase: ClaseOportunidad }) => CLASE_LARGA[l.clase]

// Puntos existentes: el paquete solo trae su código. Se nombra la fuente (lote de San Isidro u OpenStreetMap)
// sin afirmar quién los administra.
export function nombreExistente(id: string): string {
  const er = /^POS-SI-(ER\d+)$/.exec(id)
  if (er) return `Estación ${er[1]} del plan de San Isidro`
  return 'Punto registrado en OpenStreetMap'
}
export function fuenteExistente(id: string): string {
  return id.startsWith('POS-SI-') ? 'Municipalidad de San Isidro (lote ER01–ER10)' : 'OpenStreetMap'
}

export const T = {
  topCorto: (k: number) => `Entre los ${k} primeros de Lima`,
  noTop: (k: number) => `No está entre los ${k} primeros de Lima`,
  primero: 'Empieza por aquí',
  cand: 'Otros lugares evaluados',
  excl: 'Descartados en revisión preliminar',
  exist: 'Puntos de reciclaje existentes registrados',
  ok: 'Superó la revisión preliminar',
  desc: 'Descartado en revisión preliminar',
}

export const FACTOR_INFO: Record<Factor, {
  nombre: string; unidad: string; nota?: string
  alto: string; medio: string; bajo: string; cortoAlto: string; cortoBajo: string
}> = {
  k1: {
    nombre: 'Personas que viven cerca', unidad: 'personas a menos de 500 m',
    alto: 'Muchas personas viven cerca', medio: 'Cantidad intermedia de personas cerca', bajo: 'Viven menos personas cerca que en otros lugares',
    cortoAlto: 'viven muchas personas cerca', cortoBajo: 'viven menos personas cerca',
  },
  k2: {
    nombre: 'Generación potencial de residuos', unidad: 'kg al día alrededor (estimado)',
    alto: 'Se generan muchos residuos alrededor (estimado)', medio: 'Generación potencial de residuos intermedia', bajo: 'Se generan menos residuos alrededor (estimado)',
    cortoAlto: 'se generan muchos residuos alrededor', cortoBajo: 'se generan menos residuos alrededor',
  },
  k3: {
    nombre: 'Distancia al punto de reciclaje registrado más cercano', unidad: '', nota: 'Más lejos suma más: la zona estaría menos atendida.',
    alto: 'Está lejos de los puntos de reciclaje registrados', medio: 'Distancia intermedia al punto de reciclaje registrado más cercano', bajo: 'Hay un punto de reciclaje registrado relativamente cerca',
    cortoAlto: 'está lejos de los puntos de reciclaje registrados', cortoBajo: 'hay un punto de reciclaje registrado relativamente cerca',
  },
  k4: {
    nombre: 'Densidad de vías (acceso)', unidad: 'km de vías por km²', nota: 'Aproxima qué tan fácil es llegar al lugar.',
    alto: 'Muchas vías alrededor: buen acceso', medio: 'Densidad de vías intermedia', bajo: 'Pocas vías alrededor: acceso más limitado',
    cortoAlto: 'tiene buen acceso por vías', cortoBajo: 'tiene menos vías de acceso',
  },
}

// Controles de campo del contrato (ESPECIFICACION_VIABILIDAD: C02–C09). Su estado viene de la API.
export const CONTROLES_CAMPO: Record<string, string> = {
  C02: 'Disponibilidad pública, administración y autorización',
  C03: 'Huella, anclaje y operación física',
  C04: 'Acceso universal y seguridad peatonal',
  C05: 'Acceso logístico y compatibilidad con la ruta de recolección',
  C06: 'Dimensionamiento por generación, capacidad y frecuencia',
  C07: 'Configuración multimaterial, rotulado y seguridad del recipiente',
  C08: 'Mantenimiento, limpieza, seguridad y continuidad',
  C09: 'Servicios, patrimonio y condicionantes especiales',
}
// Reglas de la revisión preliminar (T01–T05) en palabras del analista.
export const REGLAS_REVISION: Record<string, string> = {
  T01_territorio: 'Está dentro de la provincia de Lima',
  T02_acceso_osm: 'Figura como lugar de acceso público',
  T03_trazabilidad_documental: 'El origen del dato es conocido',
  T04_datos_secundarios: 'Tiene los datos necesarios completos',
  T05_sin_punto_existente_30m: 'No hay otro punto de reciclaje registrado a menos de 30 m',
}
export const RESULTADO_REGLA: Record<string, string> = { cumple: 'Cumple', cumple_parcial: 'Cumple en parte', no_cumple: 'No cumple' }

// ── Formato (coma decimal, como en el paper) ─────────────────────────────────────────────────────────
const NBSP = ' '
export function fmtEntero(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—'
  const s = String(Math.round(Math.abs(n)))
  return (n < 0 ? '−' : '') + (s.length > 3 ? s.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP) : s)
}
export const fmtDec = (n: number | null | undefined, d = 1) => (n == null ? '—' : n.toFixed(d).replace('.', ','))
export const fmtDist = (m: number | null | undefined) => (m == null ? '—' : m < 1000 ? `${fmtEntero(m)} m` : `${fmtDec(m / 1000, 1)} km`)
export const ord = (n: number) => `${fmtEntero(n)}.º`
export const plural = (n: number, uno: string, varios: string) => `${fmtEntero(n)} ${n === 1 ? uno : varios}`
export const sinAcentos = (t: string) => t.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
export function fechaLarga(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number)
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${d} de ${meses[m - 1]} de ${a}`
}
export function distanciaM(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  // haversine; solo para listar otros puntos registrados alrededor de un lugar
  const R = 6371008.8, r = Math.PI / 180
  const dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// ── Lugares derivados de /sitios ───────────────────────────────────────────────────────────────────
export interface Lugar {
  id: string
  lon: number
  lat: number
  ubigeo: string
  clase: ClaseOportunidad
  estado: SitioResumen['estado_tamizaje']
  grupo: Grupo
  rango: number | null // puesto provincial (MCDA del paquete)
  top: boolean
  rangoDist: number | null // orden dentro del distrito
  dist: number | null // m al punto existente registrado más cercano
  existenteCercano: string | null
  k: Record<Factor, number> | null // valores brutos K1–K4
  kn: Record<Factor, number> | null // normalizados 0–1 (barra respecto a toda Lima)
  rk: Record<Factor, number> // puesto de cada factor en el distrito
  rkL: Record<Factor, number> // puesto de cada factor en Lima
}

const vacioK = (): Record<Factor, number> => ({ k1: 0, k2: 0, k3: 0, k4: 0 })

// Puesto de cada factor (1 = valor más alto). Solo para lugares con criterios (los que tienen orden).
function puestosPorFactor(lista: Lugar[], campo: 'rk' | 'rkL') {
  for (const f of FACTORES) {
    const valor = (l: Lugar) => l.k?.[f] ?? -Infinity
    const v = lista.map(valor).sort((a, b) => b - a)
    for (const l of lista) l[campo][f] = 1 + v.findIndex(x => x <= valor(l))
  }
}

export function construirLugares(items: SitioResumen[]): Lugar[] {
  const lugares: Lugar[] = items.map(s => {
    const c = s.criterios_mcda ?? null
    return {
      id: s.sitio_id, lon: s.lon, lat: s.lat, ubigeo: s.ubigeo, clase: s.clase_oportunidad, estado: s.estado_tamizaje,
      grupo: s.estado_tamizaje === 'punto_existente' ? 'exist' : s.estado_tamizaje === 'excluido_tamizaje' ? 'excl' : s.mcda?.en_top_k ? 'top' : 'cand',
      rango: s.mcda?.rango ?? null, top: !!s.mcda?.en_top_k, rangoDist: null,
      dist: s.dist_punto_existente_m ?? null, existenteCercano: s.punto_existente_mas_cercano ?? null,
      k: c ? { k1: c[CLAVE_K.k1].bruto, k2: c[CLAVE_K.k2].bruto, k3: c[CLAVE_K.k3].bruto, k4: c[CLAVE_K.k4].bruto } : null,
      kn: c ? { k1: c[CLAVE_K.k1].norm, k2: c[CLAVE_K.k2].norm, k3: c[CLAVE_K.k3].norm, k4: c[CLAVE_K.k4].norm } : null,
      rk: vacioK(), rkL: vacioK(),
    }
  })
  const ordenados = lugares.filter(l => l.rango != null && l.k).sort((a, b) => (a.rango ?? 0) - (b.rango ?? 0))
  const porDistrito = new Map<string, Lugar[]>()
  for (const l of ordenados) {
    const lista = porDistrito.get(l.ubigeo) ?? []
    lista.push(l)
    porDistrito.set(l.ubigeo, lista)
  }
  for (const lista of porDistrito.values()) {
    lista.forEach((l, i) => { l.rangoDist = i + 1 })
    puestosPorFactor(lista, 'rk')
  }
  puestosPorFactor(ordenados, 'rkL')
  return lugares
}

// ── Filtros, orden y paginación ─────────────────────────────────────────────────────────────────────
export interface FiltrosLugares {
  grupos: { top: boolean; cand: boolean; excl: boolean }
  tipos: ClaseOportunidad[]
  buscar: string
}
export const filtrosIniciales = (): FiltrosLugares => ({ grupos: { top: true, cand: true, excl: true }, tipos: [...CLASES], buscar: '' })

export const enAmbito = (l: Lugar, a: Ambito) => a === PROVINCIA || l.ubigeo === a

/** Texto que se busca: tipo de lugar, distrito y código (el paquete no trae nombres). */
export function textoBusqueda(l: Lugar): string {
  return sinAcentos(`${CLASE_LARGA[l.clase]} ${nombreDistrito(l.ubigeo)} ${l.id}`)
}

export function pasaFiltros(l: Lugar, f: FiltrosLugares): boolean {
  if (l.grupo === 'exist') return false
  if (!f.tipos.includes(l.clase) || !f.grupos[l.grupo]) return false
  const q = sinAcentos(f.buscar.trim())
  return !q || textoBusqueda(l).includes(q)
}

/** Selección del ámbito: primero los que tienen orden (por rango), luego los descartados. */
export function seleccionar(lugares: Lugar[], a: Ambito, f: FiltrosLugares): Lugar[] {
  return lugares.filter(l => enAmbito(l, a) && pasaFiltros(l, f)).sort((x, y) => {
    if (x.rango != null && y.rango != null) return x.rango - y.rango
    if (x.rango != null) return -1
    if (y.rango != null) return 1
    return x.id.localeCompare(y.id)
  })
}

export const numeroDe = (l: Lugar, a: Ambito) => (l.rango == null ? null : a === PROVINCIA ? l.rango : l.rangoDist)

export function filtrosActivos(f: FiltrosLugares, k: number): string[] {
  const r: string[] = []
  const nombres = { top: T.topCorto(k), cand: T.cand, excl: T.excl }
  const sin = (Object.keys(f.grupos) as Array<keyof typeof f.grupos>).filter(g => !f.grupos[g])
  if (sin.length) r.push(`sin ${sin.map(g => nombres[g].charAt(0).toLowerCase() + nombres[g].slice(1)).join(', ')}`)
  if (f.tipos.length < CLASES.length) {
    r.push(f.tipos.length ? `solo ${CLASES.filter(c => f.tipos.includes(c)).map(c => CLASE_PLURAL[c].toLowerCase()).join(', ')}` : 'ningún tipo de lugar marcado')
  }
  if (f.buscar.trim()) r.push(`búsqueda «${f.buscar.trim()}»`)
  return r
}

export const POR_PAGINA = [10, 20, 50]
export interface Pagina<T> { p: number; total: number; n: number; desde: number; hasta: number; items: T[] }
export function paginar<T>(lista: T[], pag: number, por: number): Pagina<T> {
  const total = Math.max(1, Math.ceil(lista.length / por))
  const p = Math.min(Math.max(1, pag || 1), total)
  return { p, total, n: lista.length, desde: (p - 1) * por, hasta: Math.min(lista.length, p * por), items: lista.slice((p - 1) * por, p * por) }
}

export type ColumnaTabla = 'orden' | 'tipo' | 'distrito' | 'k1' | 'k2' | 'dist' | 'k4'
export interface OrdenTabla { col: ColumnaTabla; dir: 1 | -1 }
export const ORDEN_INICIAL: OrdenTabla = { col: 'orden', dir: 1 }
const VALOR_COL: Record<ColumnaTabla, (l: Lugar, a: Ambito) => number | string | null> = {
  orden: (l, a) => numeroDe(l, a),
  tipo: l => sinAcentos(CLASE_CORTA[l.clase]),
  distrito: l => sinAcentos(nombreDistrito(l.ubigeo)),
  k1: l => l.k?.k1 ?? null,
  k2: l => l.k?.k2 ?? null,
  dist: l => l.dist,
  k4: l => l.k?.k4 ?? null,
}
export const COLUMNA_TEXTO: ColumnaTabla[] = ['tipo', 'distrito']
/** Orden de la tabla de Reportes; los vacíos («—») van siempre al final. La exportación usa el mismo orden. */
export function ordenarTabla(lista: Lugar[], o: OrdenTabla, a: Ambito): Lugar[] {
  const v = VALOR_COL[o.col]
  return lista.map((l, i) => ({ l, i, x: v(l, a) })).sort((p, q) => {
    if (p.x == null && q.x == null) return p.i - q.i
    if (p.x == null) return 1
    if (q.x == null) return -1
    const r = typeof p.x === 'string' ? p.x.localeCompare(String(q.x), 'es') : (p.x as number) - (q.x as number)
    return r * o.dir || p.i - q.i
  }).map(x => x.l)
}

// ── Explicación del orden ──────────────────────────────────────────────────────────────────────────
export interface NivelFactor { f: Factor; puesto: number; nivel: 'alto' | 'medio' | 'bajo' }
/**
 * Nivel de cada factor por su puesto dentro del distrito (o en Lima si el distrito tiene menos de 5 lugares
 * con orden): cuarto superior = «a favor», cuarto inferior = «en contra». Describe factores; no clasifica lugares.
 */
export function nivelesFactores(l: Lugar, nDistrito: number, nLima: number): { filas: NivelFactor[]; base: number; usarDistrito: boolean } {
  const usarDistrito = nDistrito >= 5
  const base = usarDistrito ? nDistrito : nLima
  const cuarto = Math.max(1, Math.ceil(base / 4))
  const filas = FACTORES.map(f => {
    const puesto = usarDistrito ? l.rk[f] : l.rkL[f]
    return { f, puesto, nivel: (puesto <= cuarto ? 'alto' : puesto > base - cuarto ? 'bajo' : 'medio') as NivelFactor['nivel'] }
  }).sort((a, b) => ({ alto: 0, medio: 1, bajo: 2 }[a.nivel] - { alto: 0, medio: 1, bajo: 2 }[b.nivel]) || a.puesto - b.puesto)
  return { filas, base, usarDistrito }
}
const unirY = (a: string[]) => (a.length <= 1 ? a[0] ?? '' : `${a.slice(0, -1).join(', ')} y ${a[a.length - 1]}`)
const mayus = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
export function explicacionBreve(filas: NivelFactor[]): { aFavor: string | null; enContra: string | null } {
  const a = filas.filter(x => x.nivel === 'alto').map(x => FACTOR_INFO[x.f].cortoAlto)
  const b = filas.filter(x => x.nivel === 'bajo').map(x => FACTOR_INFO[x.f].cortoBajo)
  return { aFavor: a.length ? `${mayus(unirY(a))}.` : null, enContra: b.length ? `${mayus(unirY(b))}.` : null }
}
export function valorFactor(f: Factor, v: number): string {
  if (f === 'k3') return fmtDist(v)
  if (f === 'k4') return `${fmtDec(v, 1)} ${FACTOR_INFO.k4.unidad}`
  return `${fmtEntero(v)} ${FACTOR_INFO[f].unidad}`
}

// ── Exportaciones de Reportes: solo el ámbito elegido ─────────────────────────────────────────────────
export interface MetaExportacion {
  ambito: Ambito
  version: string
  fecha: string // ISO del paquete
  topK: number
  filtros: string[]
  verificacion: (l: Lugar) => string
}

export function slug(t: string): string {
  return sinAcentos(t).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
export const nombreArchivoCsv = (m: MetaExportacion) => `ecolima-v${m.version}-${slug(nombreAmbito(m.ambito))}-lugares-para-revisar.csv`

/**
 * Filas del CSV: todos los lugares filtrados del ámbito (en el orden de la tabla) y, al final, los puntos
 * existentes registrados del mismo ámbito. Cada fila lleva el ámbito y la versión del paquete.
 */
export function filasCsv(lugares: Lugar[], existentes: Lugar[], m: MetaExportacion): Array<Array<string | number>> {
  const amb = nombreAmbito(m.ambito), f = m.filtros.join('; ') || 'sin filtros', fecha = m.fecha.slice(0, 10)
  const cab = ['ambito_reporte', 'version_paquete', 'fecha_paquete', 'tipo_registro',
    m.ambito === PROVINCIA ? 'puesto_provincia' : 'orden_revision_distrito', 'tipo_lugar', 'nombre', 'distrito',
    'revision_preliminar', 'puesto_provincia', `entre_primeros_${m.topK}_lima`, 'personas_500m', 'residuos_kg_dia_500m',
    'distancia_punto_registrado_m', 'densidad_vias_km_km2_500m', 'latitud', 'longitud', 'verificacion_campo',
    'filtros_aplicados', 'id_sitio']
  const r2 = (x: number | null | undefined, d = 0) => (x == null ? '' : Number(x.toFixed(d)))
  return [
    cab,
    ...lugares.map(l => {
      const a = l.rango != null
      return [amb, m.version, fecha, 'lugar evaluado', numeroDe(l, m.ambito) ?? '', CLASE_LARGA[l.clase], SIN_NOMBRE,
        nombreDistrito(l.ubigeo), a ? T.ok : T.desc, l.rango ?? '', l.top ? 'si' : 'no',
        r2(l.k?.k1), r2(l.k?.k2), r2(l.dist), r2(l.k?.k4, 2), l.lat, l.lon, m.verificacion(l), f, l.id]
    }),
    ...existentes.map(e => [amb, m.version, fecha, 'punto de reciclaje existente registrado', '', CLASE_LARGA[e.clase],
      nombreExistente(e.id), nombreDistrito(e.ubigeo), '', '', '', '', '', '', '', e.lat, e.lon, '', 'no aplica (capa de referencia)', e.id]),
  ]
}

export function aCsv(filas: Array<Array<string | number>>): string {
  return '﻿' + filas.map(f => f.map(v => {
    const s = String(v ?? '')
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }).join(',')).join('\r\n')
}

export interface CifrasAmbito { ev: number; aptos: number; excl: number; top: number; exist: number }
export function textoResumen(lista: Lugar[], existentes: Lugar[], cifras: CifrasAmbito, m: MetaExportacion): string {
  const a = m.ambito, amb = nombreAmbito(a)
  const primeros = lista.filter(l => l.rango != null).slice(0, 10).map(l =>
    `${numeroDe(l, a)}. ${CLASE_LARGA[l.clase]}${a === PROVINCIA ? `, ${nombreDistrito(l.ubigeo)}` : ''}${l.top && a !== PROVINCIA ? `, entre los ${m.topK} primeros de Lima` : ''}`)
  const puntos = !existentes.length
    ? `Puntos de reciclaje existentes registrados en ${amb}: ninguno en estas fuentes.`
    : a === PROVINCIA
      ? `Puntos de reciclaje existentes registrados en la provincia de Lima: ${existentes.length} (detalle en el CSV).`
      : `Puntos de reciclaje existentes registrados en ${amb} (${existentes.length}): ${existentes.map(e => nombreExistente(e.id)).join('; ')}.`
  return [
    `EcoLima ML · ${amb}: lugares para revisar (revisión preliminar con datos públicos, paquete de resultados ${m.version} del ${fechaLarga(m.fecha)}).`,
    `Lugares evaluados: ${cifras.ev}. Superaron la revisión preliminar: ${cifras.aptos}. Descartados: ${cifras.excl}. Entre los ${m.topK} primeros lugares para revisar en Lima: ${cifras.top}. Puntos de reciclaje existentes registrados: ${cifras.exist}.`,
    m.filtros.length ? `Filtros aplicados: ${m.filtros.join('; ')} (${lista.length} lugares).` : `Sin filtros (${lista.length} lugares).`,
    primeros.length ? `Primeros ${primeros.length} del orden de revisión${a === PROVINCIA ? ' en la provincia' : ''}:\n${primeros.join('\n')}` : 'Ningún lugar con estos filtros.',
    puntos,
    'El paquete V1.0.0 no trae nombres de lugar: se identifican por tipo y código.',
    'Son lugares para revisar, no ubicaciones aprobadas: falta comprobar cada uno en campo y con la municipalidad.',
  ].join('\n')
}
