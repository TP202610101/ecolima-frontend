import { describe, it, expect } from 'vitest'
import {
  ETIQUETA_TAMIZAJE,
  categoriaMapa,
  explicacionSinMcda,
  formatoPercentil,
  formatoPorcentaje,
  formatoVariable,
  textoSinMcda,
} from './etiquetas'

describe('etiquetas V1 — reglas de lectura', () => {
  it('ninguna etiqueta de tamizaje dice «viable»', () => {
    for (const t of Object.values(ETIQUETA_TAMIZAJE)) expect(t.toLowerCase()).not.toContain('viable')
  })

  it('el percentil se muestra como posición (P21), no como probabilidad', () => {
    expect(formatoPercentil(0.2149)).toBe('P21')
    expect(formatoPercentil(1)).toBe('P100')
    expect(formatoPercentil(0.0004)).toBe('P1')
    expect(formatoPercentil(null)).toBe('—')
  })

  it('los sitios sin MCDA reciben texto explícito según su estado', () => {
    expect(textoSinMcda('punto_existente')).toBe('Sin MCDA: punto existente')
    expect(textoSinMcda('excluido_tamizaje')).toBe('Sin MCDA: excluido')
    expect(explicacionSinMcda('excluido_tamizaje', 'punto existente a 12 m')).toContain('punto existente a 12 m')
    expect(explicacionSinMcda('punto_existente', null)).toContain('K3')
  })
})

describe('categoriaMapa', () => {
  it('distingue existentes, excluidos, top-k y otros candidatos', () => {
    expect(categoriaMapa({ estado_tamizaje: 'punto_existente', mcda: null })).toBe('existente')
    expect(categoriaMapa({ estado_tamizaje: 'excluido_tamizaje', mcda: null })).toBe('excluido')
    expect(categoriaMapa({ estado_tamizaje: 'apto_tamizaje', mcda: { puntaje: 0.68, rango: 1, en_top_k: true } }))
      .toBe('top_k')
    expect(categoriaMapa({ estado_tamizaje: 'apto_tamizaje', mcda: { puntaje: 0.2, rango: 900, en_top_k: false } }))
      .toBe('candidato')
  })
})

describe('formatos', () => {
  it('porcentaje con coma decimal', () => {
    expect(formatoPorcentaje(0.9362)).toMatch(/^93,6\s%$/)
  })

  it('variables con unidad y proporciones como porcentaje', () => {
    expect(formatoVariable(0.3468, 'proporcion')).toMatch(/^34,7\s%$/)
    expect(formatoVariable(40.257, 'km/km2')).toBe('40,26 km/km²')
    expect(formatoVariable(null, 'personas')).toBe('—')
  })
})
