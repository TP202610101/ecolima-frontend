import { describe, it, expect } from 'vitest'
import { formatMetric, formatDistance } from './formatters'

describe('formatMetric', () => {
  it('redondea y formatea un número con sufijo', () => {
    expect(formatMetric(12345.7, 'hab/km²')).toBe('12,346 hab/km²')
  })

  it('formatea sin sufijo cuando no se pasa', () => {
    expect(formatMetric(500)).toBe('500')
  })

  it('devuelve em dash cuando el valor es null', () => {
    expect(formatMetric(null)).toBe('—')
  })

  it('devuelve em dash cuando el valor es undefined', () => {
    expect(formatMetric(undefined)).toBe('—')
  })

  it('redondea correctamente un valor decimal', () => {
    expect(formatMetric(99.4)).toBe('99')
    expect(formatMetric(99.5)).toBe('100')
  })
})

describe('formatDistance', () => {
  it('formatea metros cuando el valor es menor a 1000', () => {
    expect(formatDistance(350)).toBe('350 m')
  })

  it('convierte a km con un decimal cuando el valor es mayor o igual a 1000', () => {
    expect(formatDistance(2500)).toBe('2.5 km')
  })

  it('usa exactamente 1000 como umbral', () => {
    expect(formatDistance(1000)).toBe('1.0 km')
    expect(formatDistance(999)).toBe('999 m')
  })

  it('devuelve em dash cuando el valor es null', () => {
    expect(formatDistance(null)).toBe('—')
  })

  it('devuelve em dash cuando el valor es undefined', () => {
    expect(formatDistance(undefined)).toBe('—')
  })
})
