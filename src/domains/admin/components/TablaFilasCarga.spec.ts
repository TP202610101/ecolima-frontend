import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TablaFilasCarga from './TablaFilasCarga.vue'
import type { FilaCarga } from '../entities/CargaMasiva'

const filas: FilaCarga[] = [
  { line: 2, email: 'ana@ecolima.pe', full_name: 'Ana Pérez', role: 'analista', status: 'ok', errors: [] },
  {
    line: 3, email: 'beto@ecolima', full_name: '', role: 'admin', status: 'error',
    errors: [
      { code: 'CORREO_INVALIDO', message: 'El correo no tiene un formato válido.' },
      { code: 'ROL_NO_PERMITIDO', message: 'Solo se permite el rol analista.' },
    ],
  },
]

describe('TablaFilasCarga', () => {
  it('muestra línea, correo, nombre, rol y estado', () => {
    const w = mount(TablaFilasCarga, { props: { filas } })
    expect(w.findAll('thead th').map(t => t.text())).toEqual(['Línea', 'Correo', 'Nombre', 'Rol', 'Estado'])
    const celdas = w.find('[data-linea="2"]').findAll('td').map(t => t.text())
    expect(celdas).toEqual(['2', 'ana@ecolima.pe', 'Ana Pérez', 'analista', 'Correcto'])
    expect(w.find('[data-linea="3"]').findAll('td')[2].text()).toBe('—')
  })

  it('el estado no depende solo del color: texto «Correcto» o «Error» con icono', () => {
    const w = mount(TablaFilasCarga, { props: { filas } })
    expect(w.find('[data-linea="2"] td:last-child').text()).toBe('Correcto')
    expect(w.find('[data-linea="3"] td:last-child').text()).toContain('Error')
    expect(w.find('[data-linea="3"] td:last-child svg').exists()).toBe(true)
  })

  it('muestra tal cual todos los mensajes de error de cada fila', () => {
    const w = mount(TablaFilasCarga, { props: { filas } })
    expect(w.findAll('[data-linea="3"] li').map(l => l.text())).toEqual([
      'El correo no tiene un formato válido.',
      'Solo se permite el rol analista.',
    ])
    expect(w.find('[data-linea="2"] li').exists()).toBe(false)
  })

  it('tiene una leyenda para lectores de pantalla y cabeceras de columna', () => {
    const w = mount(TablaFilasCarga, { props: { filas } })
    expect(w.find('caption').text()).toBe('Filas del archivo y su estado')
    expect(w.findAll('th[scope="col"]')).toHaveLength(5)
  })
})
