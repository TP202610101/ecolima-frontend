import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import SelectorAmbitoV1 from './SelectorAmbitoV1.vue'
import { useExploracionV1Store } from '../stores/useExploracionV1Store'
import type { DistritosGeoJSON } from '../entities/AnalisisV1'

vi.mock('../repositories/AnalisisV1Repository', () => ({ AnalisisV1Repository: {} }))

const SI = '150131', CO = '150110', PH = '150126'
const props = (u: string, n: number) => ({ ubigeo: u, nombre: u, n_sitios: n, n_apto_tamizaje: n, n_excluido_tamizaje: 0, n_punto_existente: 0, n_top_k: 0 })
let w: VueWrapper

function montar() {
  setActivePinia(createPinia())
  const st = useExploracionV1Store()
  st.distritos = { type: 'FeatureCollection', features: [props(SI, 3), props(CO, 5), props(PH, 0)].map(p => ({ type: 'Feature', id: p.ubigeo, geometry: null, properties: p })) } as unknown as DistritosGeoJSON
  w = mount(SelectorAmbitoV1, { props: { id: 'sel', dataPrueba: 'selector' }, attachTo: document.body })
  return { st, w }
}
const boton = () => w.find('[data-prueba="selector"]')
const lista = () => w.find('[role="listbox"]')
const opciones = () => w.findAll('[role="option"]').map(o => o.text())
const campo = () => w.find('[data-prueba="selector-buscar"]')
const cuadro = async () => { await new Promise(r => setTimeout(r, 40)); await w.vm.$nextTick() }

beforeEach(() => localStorage.clear())
afterEach(() => w?.unmount())

describe('SelectorAmbitoV1', () => {
  it('muestra el ámbito actual y abre la lista con la provincia arriba y los dos grupos', async () => {
    montar()
    expect(boton().attributes('role')).toBe('combobox')
    expect(boton().attributes('aria-expanded')).toBe('false')
    expect(boton().text()).toBe('Provincia de Lima (43 distritos)')
    await boton().trigger('click')
    expect(boton().attributes('aria-expanded')).toBe('true')
    expect(lista().exists()).toBe(true)
    expect(opciones()).toEqual(['Provincia de Lima (43 distritos)', 'Comas', 'San Isidro', 'Punta Hermosa'])
    expect(lista().text()).toContain('Distritos con lugares evaluados (2)')
    expect(lista().text()).toContain('Sin lugares evaluados (1)')
    expect(w.find('[role="option"][aria-selected="true"]').text()).toContain('Provincia de Lima')
    expect(document.activeElement).toBe(campo().element)
  })

  it('busca por nombre ignorando tildes y mayúsculas', async () => {
    montar()
    await boton().trigger('click')
    await campo().setValue('PÚNTA')
    expect(opciones()).toEqual(['Punta Hermosa'])
    await campo().setValue('isidro')
    expect(opciones()).toEqual(['San Isidro'])
    await campo().setValue('zzz')
    expect(opciones()).toEqual([])
    expect(lista().text()).toContain('Ningún distrito coincide con «zzz»')
  })

  it('elegir con clic cambia el botón al instante, cierra la lista y devuelve el foco', async () => {
    const { st } = montar()
    await boton().trigger('click')
    await w.find(`[role="option"][data-valor="${CO}"]`).trigger('click')
    expect(boton().text()).toBe('Comas')
    expect(lista().exists()).toBe(false)
    await w.vm.$nextTick()
    expect(document.activeElement).toBe(boton().element)
    await cuadro()
    expect(st.ambito).toBe(CO)
  })

  it('con teclado: flecha abre, flechas mueven, Enter elige', async () => {
    const { st } = montar()
    await boton().trigger('keydown', { key: 'ArrowDown' })
    expect(lista().exists()).toBe(true)
    await campo().trigger('keydown', { key: 'ArrowDown' })
    expect(campo().attributes('aria-activedescendant')).toBe(`sel-op-${CO}`)
    await campo().trigger('keydown', { key: 'ArrowDown' })
    expect(campo().attributes('aria-activedescendant')).toBe(`sel-op-${SI}`)
    await campo().trigger('keydown', { key: 'Enter' })
    expect(boton().text()).toBe('San Isidro')
    await cuadro()
    expect(st.ambito).toBe(SI)
  })

  it('escribir sobre el botón abre la lista y empieza la búsqueda', async () => {
    montar()
    await boton().trigger('keydown', { key: 'p' })
    expect((campo().element as HTMLInputElement).value).toBe('p')
    expect(opciones()).toEqual(['Provincia de Lima (43 distritos)', 'Punta Hermosa'])
  })

  it('Escape cierra sin cambiar y devuelve el foco al botón', async () => {
    const { st } = montar()
    await boton().trigger('click')
    await campo().trigger('keydown', { key: 'ArrowDown' })
    await campo().trigger('keydown', { key: 'Escape' })
    expect(lista().exists()).toBe(false)
    expect(boton().attributes('aria-expanded')).toBe('false')
    await w.vm.$nextTick()
    expect(document.activeElement).toBe(boton().element)
    await cuadro()
    expect(st.ambito).toBe('lima')
  })

  it('tocar fuera o el fondo de la hoja cierra la lista', async () => {
    montar()
    await boton().trigger('click')
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    await w.vm.$nextTick()
    expect(lista().exists()).toBe(false)
    await boton().trigger('click')
    await w.find('[data-prueba="fondo-selector"]').trigger('click')
    expect(lista().exists()).toBe(false)
  })

  it('dos elecciones rápidas seguidas: gana la última', async () => {
    const { st } = montar()
    const cambiar = vi.spyOn(st, 'cambiarAmbito')
    await boton().trigger('click')
    await w.find(`[role="option"][data-valor="${SI}"]`).trigger('click')
    await boton().trigger('click')
    await w.find(`[role="option"][data-valor="${CO}"]`).trigger('click')
    expect(boton().text()).toBe('Comas')
    await cuadro()
    expect(cambiar).toHaveBeenCalledTimes(1)
    expect(cambiar).toHaveBeenCalledWith(CO)
    expect(st.ambito).toBe(CO)
  })
})
