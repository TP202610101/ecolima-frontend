import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import TablaPriorizacion from './TablaPriorizacion.vue'
import { useAnalisisV1Store } from '../stores/useAnalisisV1Store'
import type { PaginaSitios, ResumenMcda, SitioResumen } from '../entities/AnalisisV1'

const sitio = (over: Partial<SitioResumen>): SitioResumen => ({
  sitio_id: 'S',
  lon: -77.1,
  lat: -12,
  ubigeo: '150135',
  distrito: 'SAN MARTIN DE PORRES',
  clase_oportunidad: 'paradero_transporte_publico',
  rol: 'fondo',
  estado_tamizaje: 'apto_tamizaje',
  codigo_exclusion: null,
  propension_percentil: 0.215,
  mcda: { puntaje: 0.6803, rango: 1, en_top_k: true },
  mc_frecuencia_top_k: 0.9362,
  ...over,
})

function montar(items: SitioResumen[], total = items.length) {
  const store = useAnalisisV1Store()
  store.mcda = { top_k: 110 } as unknown as ResumenMcda
  store.pagina = { total, offset: 0, limit: 25, items } as unknown as PaginaSitios
  return mount(TablaPriorizacion)
}

beforeEach(() => setActivePinia(createPinia()))

describe('TablaPriorizacion', () => {
  it('muestra rango, puntaje, distrito, clase, tamizaje y percentil', () => {
    const w = montar([sitio({ sitio_id: 'A' })])
    const fila = w.get('[data-sitio="A"]').text()
    expect(fila).toContain('1')
    expect(fila).toContain('top-110')
    expect(fila).toContain('0,680')
    expect(fila).toContain('SAN MARTIN DE PORRES')
    expect(fila).toContain('Paradero de transporte público')
    expect(fila).toContain('Pasa el tamizaje')
    expect(fila).toContain('P22')
  })

  it('los sitios sin MCDA muestran texto explícito, no un puntaje', () => {
    const w = montar([
      sitio({ sitio_id: 'P', rol: 'positivo', estado_tamizaje: 'punto_existente', mcda: null }),
      sitio({ sitio_id: 'X', estado_tamizaje: 'excluido_tamizaje', codigo_exclusion: 'T05', mcda: null }),
    ])
    expect(w.get('[data-sitio="P"]').text()).toContain('Sin MCDA: punto existente')
    expect(w.get('[data-sitio="X"]').text()).toContain('Sin MCDA: excluido')
  })

  it('emite el sitio al hacer clic en una fila', async () => {
    const w = montar([sitio({ sitio_id: 'A' })])
    await w.get('[data-sitio="A"]').trigger('click')
    expect(w.emitted('sitio-seleccionado')?.[0][0]).toMatchObject({ sitio_id: 'A' })
  })

  it('indica el rango mostrado y habilita la página siguiente cuando hay más registros', () => {
    const w = montar([sitio({ sitio_id: 'A' })], 2192)
    expect(w.text()).toMatch(/1–25 de 2\.?192 sitios/)
    expect(w.get('[aria-label="Página siguiente"]').attributes('disabled')).toBeUndefined()
    expect(w.get('[aria-label="Página anterior"]').attributes('disabled')).toBeDefined()
  })

  it('muestra un mensaje cuando no hay resultados', () => {
    const w = montar([], 0)
    expect(w.text()).toContain('Ningún sitio cumple los filtros')
  })
})
