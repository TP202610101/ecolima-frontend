import { describe, it, expect } from 'vitest'
import { rutaInicio } from './rutaInicio'

describe('rutaInicio', () => {
  it('lleva a admin y analista a Análisis', () => {
    expect(rutaInicio('admin')).toBe('analisis')
    expect(rutaInicio('analista')).toBe('analisis')
  })

  it('lleva a ciudadano y a sesiones sin rol al mapa público', () => {
    expect(rutaInicio('ciudadano')).toBe('puntos')
    expect(rutaInicio(undefined)).toBe('puntos')
  })
})
