import { describe, it, expect } from 'vitest'
import { revisarLenguaje } from './lenguajeV1'

describe('revisarLenguaje', () => {
  it('acepta las negaciones', () => {
    expect(revisarLenguaje('La propensión no es una probabilidad calibrada ni una medida de idoneidad.')).toEqual([])
    expect(revisarLenguaje('No es probabilidad de éxito, idoneidad ni viabilidad.')).toEqual([])
  })

  it('rechaza categorías, «recomendación» y afirmaciones de probabilidad o idoneidad', () => {
    expect(revisarLenguaje('Prioridad Alta')).toHaveLength(2)
    expect(revisarLenguaje('Zona Media')).toEqual(['categoría: Media'])
    expect(revisarLenguaje('Lugar recomendado')).toEqual(['recomendación: recomendado'])
    expect(revisarLenguaje('La probabilidad de éxito es 0,8')).toHaveLength(1)
    expect(revisarLenguaje('Indica la idoneidad del sitio')).toHaveLength(1)
  })

  it('no confunde palabras comunes', () => {
    expect(revisarLenguaje('Precisión promedio; zona de baja densidad; multimedia')).toEqual([])
  })
})
