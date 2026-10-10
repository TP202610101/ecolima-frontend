import { describe, it, expect } from 'vitest'
import type { SitioResumen } from '../entities/AnalisisV1'
import {
  PROVINCIA, construirLugares, explicacionBreve, filasCsv, filtrosActivos, filtrosIniciales, fmtDist, fmtEntero,
  nivelesFactores, nombreArchivoCsv, nombreDistrito, nombreExistente, ordenarTabla, paginar, seleccionar, textoResumen,
  type MetaExportacion,
} from './lecturaV1'

// Datos mínimos con la forma de /api/v1/analisis/sitios (ampliado con distancia y K1–K4).
function sitio(id: string, ubigeo: string, rango: number | null, extra: Partial<SitioResumen> = {}): SitioResumen {
  const apto = rango != null
  const v = apto ? 1000 - rango : 0
  return {
    sitio_id: id, lon: -77, lat: -12, ubigeo, distrito: 'X', clase_oportunidad: 'paradero_transporte_publico', rol: 'fondo',
    estado_tamizaje: apto ? 'apto_tamizaje' : 'excluido_tamizaje', codigo_exclusion: apto ? null : 'T05', propension_percentil: 0.5,
    mcda: apto ? { puntaje: 0.5, rango, en_top_k: rango <= 2 } : null, mc_frecuencia_top_k: null,
    dist_punto_existente_m: apto ? 500 + rango : 12, punto_existente_mas_cercano: 'POS-SI-ER01',
    criterios_mcda: apto ? {
      K1_demanda: { bruto: v, norm: 0.5 }, K2_generacion: { bruto: v * 1.1, norm: 0.5 },
      K3_brecha: { bruto: 500 + rango, norm: 0.1 }, K4_accesibilidad: { bruto: 20, norm: 0.5 },
    } : null,
    ...extra,
  }
}
const existente = (id: string, ubigeo: string): SitioResumen => ({
  ...sitio(id, ubigeo, null), rol: 'positivo', estado_tamizaje: 'punto_existente', codigo_exclusion: null,
  dist_punto_existente_m: null, punto_existente_mas_cercano: null,
})

const SI = '150131', MI = '150122'
const items = [
  sitio('A', SI, 5), sitio('B', MI, 1), sitio('C', SI, 2), sitio('D', SI, 9),
  sitio('E', SI, null), sitio('F', MI, 3, { clase_oportunidad: 'parque' }),
  existente('POS-SI-ER01', SI), existente('POS-OSM-N1', MI),
]
const lugares = construirLugares(items)
function por(id: string) {
  const l = lugares.find(x => x.id === id)
  if (!l) throw new Error(`falta ${id}`)
  return l
}
const meta = (ambito: string, filtros: string[] = []): MetaExportacion => ({
  ambito, version: '1.0.0', fecha: '2026-10-03T00:00:00-05:00', topK: 110, filtros, verificacion: () => 'pendiente_campo (C02–C09)',
})

describe('construirLugares', () => {
  it('el orden del distrito es el rango provincial filtrado por distrito (no lo cambia)', () => {
    expect([por('C').rangoDist, por('A').rangoDist, por('D').rangoDist]).toEqual([1, 2, 3])
    expect([por('C').rango, por('A').rango, por('D').rango]).toEqual([2, 5, 9])
    expect([por('B').rangoDist, por('F').rangoDist]).toEqual([1, 2])
  })
  it('agrupa: primeros de Lima, otros, descartados y puntos existentes', () => {
    expect(por('B').grupo).toBe('top')
    expect(por('A').grupo).toBe('cand')
    expect(por('E').grupo).toBe('excl')
    expect(por('POS-SI-ER01').grupo).toBe('exist')
    expect(por('E').rangoDist).toBeNull()
  })
  it('cuenta el puesto de cada factor dentro del distrito', () => {
    expect(por('C').rk.k1).toBe(1) // rango menor → valor K1 mayor en estos datos
    expect(por('D').rk.k1).toBe(3)
    expect(por('D').rk.k3).toBe(1) // K3 = distancia: el más lejano es 1.º
  })
  it('trae distancia y K1–K4 de la API sin recalcularlos', () => {
    expect(por('A').dist).toBe(505)
    expect(por('A').k?.k2).toBeCloseTo(995 * 1.1)
    expect(por('E').k).toBeNull()
  })
})

describe('seleccionar y filtros', () => {
  it('solo el distrito, con orden y luego descartados; sin puntos existentes', () => {
    expect(seleccionar(lugares, SI, filtrosIniciales()).map(l => l.id)).toEqual(['C', 'A', 'D', 'E'])
  })
  it('provincia: todos los lugares por puesto provincial', () => {
    expect(seleccionar(lugares, PROVINCIA, filtrosIniciales()).map(l => l.id)).toEqual(['B', 'C', 'F', 'A', 'D', 'E'])
  })
  it('respeta grupos, tipos y búsqueda', () => {
    const f = { ...filtrosIniciales(), grupos: { top: true, cand: true, excl: false } }
    expect(seleccionar(lugares, SI, f).map(l => l.id)).toEqual(['C', 'A', 'D'])
    expect(seleccionar(lugares, MI, { ...filtrosIniciales(), tipos: ['parque'] }).map(l => l.id)).toEqual(['F'])
    expect(seleccionar(lugares, PROVINCIA, { ...filtrosIniciales(), buscar: 'miraflores' }).map(l => l.id)).toEqual(['B', 'F'])
    expect(filtrosActivos(f, 110)).toEqual(['sin descartados en revisión preliminar'])
  })
})

describe('paginar y ordenar', () => {
  it('pagina con página actual y total, y acota la página pedida', () => {
    const p = paginar(Array.from({ length: 73 }, (_, i) => i), 8, 10)
    expect([p.p, p.total, p.desde, p.hasta, p.items.length]).toEqual([8, 8, 70, 73, 3])
    expect(paginar([1, 2, 3], 9, 10).p).toBe(1)
  })
  it('ordena por columna y deja los vacíos al final en ambos sentidos', () => {
    const sel = seleccionar(lugares, SI, filtrosIniciales())
    expect(ordenarTabla(sel, { col: 'k1', dir: -1 }, SI).map(l => l.id)).toEqual(['C', 'A', 'D', 'E'])
    expect(ordenarTabla(sel, { col: 'k1', dir: 1 }, SI).map(l => l.id)).toEqual(['D', 'A', 'C', 'E'])
    expect(ordenarTabla(sel, { col: 'dist', dir: 1 }, SI).map(l => l.id)).toEqual(['E', 'C', 'A', 'D'])
  })
})

describe('explicación breve', () => {
  it('usa el puesto en el distrito y no clasifica el lugar', () => {
    const n = nivelesFactores(por('C'), 5, 2192)
    expect(n.usarDistrito).toBe(true)
    const b = explicacionBreve(n.filas)
    expect(b.aFavor).toMatch(/^Viven muchas personas cerca/)
    expect(JSON.stringify(b)).not.toMatch(/Alta|Media|Baja|puntaje|propensi/i)
  })
  it('si el distrito tiene menos de 5 lugares compara con toda Lima', () => {
    expect(nivelesFactores(por('C'), 3, 2192).usarDistrito).toBe(false)
  })
})

describe('exportaciones limitadas al ámbito', () => {
  const existSI = lugares.filter(l => l.grupo === 'exist' && l.ubigeo === SI)
  it('CSV de un distrito: todas sus filas, sus puntos existentes, ámbito y versión en cada fila', () => {
    const sel = seleccionar(lugares, SI, filtrosIniciales())
    const filas = filasCsv(sel, existSI, meta(SI))
    const cab = filas[0] as string[]
    const datos = filas.slice(1).map(f => Object.fromEntries(cab.map((c, i) => [c, f[i]])))
    expect(datos).toHaveLength(5)
    expect(datos.every(d => d.ambito_reporte === 'San Isidro' && d.version_paquete === '1.0.0' && d.distrito === 'San Isidro')).toBe(true)
    expect(datos.filter(d => d.tipo_registro === 'punto de reciclaje existente registrado').map(d => d.id_sitio)).toEqual(['POS-SI-ER01'])
    expect(datos.map(d => d.orden_revision_distrito)).toEqual([1, 2, 3, '', ''])
    expect(datos[0].nombre).toBe('Sin nombre en el paquete V1.0.0')
    expect(nombreArchivoCsv(meta(SI))).toBe('ecolima-v1.0.0-san-isidro-lugares-para-revisar.csv')
  })
  it('CSV provincial solo cuando se elige la provincia', () => {
    const filas = filasCsv(seleccionar(lugares, PROVINCIA, filtrosIniciales()), lugares.filter(l => l.grupo === 'exist'), meta(PROVINCIA))
    expect(filas[0]).toContain('puesto_provincia')
    expect(filas.slice(1).every(f => f[0] === 'Provincia de Lima')).toBe(true)
    expect(filas).toHaveLength(1 + 6 + 2)
    expect(nombreArchivoCsv(meta(PROVINCIA))).toBe('ecolima-v1.0.0-provincia-de-lima-lugares-para-revisar.csv')
  })
  it('el resumen nombra el ámbito, la versión y solo sus puntos existentes', () => {
    const sel = seleccionar(lugares, SI, filtrosIniciales())
    const t = textoResumen(sel, existSI, { ev: 4, aptos: 3, excl: 1, top: 1, exist: 1 }, meta(SI, ['sin parques']))
    expect(t).toContain('San Isidro')
    expect(t).toContain('1.0.0')
    expect(t).toContain('Filtros aplicados: sin parques')
    expect(t).toContain('Estación ER01 del plan de San Isidro')
    expect(t).not.toContain('OpenStreetMap')
    expect(t).not.toContain('Miraflores')
    expect(t).not.toMatch(/viable|aprobad[ao]s? (?!ubicaciones)|ROC|propensi/i)
  })
})

describe('vocabulario', () => {
  it('nombres de distrito con tildes y etiquetas de puntos existentes por fuente', () => {
    expect(nombreDistrito('150135')).toBe('San Martín de Porres')
    expect(nombreExistente('POS-SI-ER06')).toBe('Estación ER06 del plan de San Isidro')
    expect(nombreExistente('POS-OSM-N1')).toBe('Punto registrado en OpenStreetMap')
    expect(fmtEntero(2192)).toBe('2 192')
    expect(fmtDist(3700)).toBe('3,7 km')
  })
})
