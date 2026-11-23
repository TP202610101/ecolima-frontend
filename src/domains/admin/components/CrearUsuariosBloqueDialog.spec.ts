import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import CrearUsuariosBloqueDialog from './CrearUsuariosBloqueDialog.vue'
import { CargaMasivaRepository, ErrorCargaMasiva } from '../repositories/CargaMasivaRepository'
import type { ResultadoValidacion } from '../entities/CargaMasiva'

vi.mock('../repositories/CargaMasivaRepository', async importOriginal => {
  const real = await importOriginal<typeof import('../repositories/CargaMasivaRepository')>()
  return { ...real, CargaMasivaRepository: { validar: vi.fn(), confirmar: vi.fn() } }
})
const validar = vi.mocked(CargaMasivaRepository.validar)
const confirmar = vi.mocked(CargaMasivaRepository.confirmar)

const csv = (nombre = 'usuarios.csv', bytes = 40) => new File(['x'.repeat(bytes)], nombre, { type: 'text/csv' })
const valida: ResultadoValidacion = {
  valid: true, total: 2,
  rows: [
    { line: 2, email: 'ana@ecolima.pe', full_name: 'Ana', role: 'analista', status: 'ok', errors: [] },
    { line: 3, email: 'beto@ecolima.pe', full_name: 'Beto', role: 'analista', status: 'ok', errors: [] },
  ],
}
const conErrores: ResultadoValidacion = {
  valid: false, total: 2,
  rows: [
    valida.rows[0],
    { line: 3, email: 'beto@ecolima', full_name: 'Beto', role: 'admin', status: 'error', errors: [{ code: 'ROL_NO_PERMITIDO', message: 'Solo se permite el rol analista.' }] },
  ],
}

let w: VueWrapper
function montar() {
  setActivePinia(createPinia())
  w = mount(CrearUsuariosBloqueDialog, { attachTo: document.body })
  return w
}
async function elegir(f: File) {
  const input = w.find('#bloque-archivo')
  Object.defineProperty(input.element, 'files', { configurable: true, value: [f] })
  await input.trigger('change')
}
const boton = (dp: string) => w.find(`[data-prueba="${dp}"]`)
const escape = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
async function hastaRevision(r: ResultadoValidacion) {
  validar.mockResolvedValue(r)
  montar()
  await elegir(csv())
  await boton('validar-archivo').trigger('click')
  await flushPromises()
}

beforeEach(() => { validar.mockReset(); confirmar.mockReset() })
afterEach(() => w?.unmount())

describe('CrearUsuariosBloqueDialog', () => {
  it('diálogo accesible: role, aria-modal, título y foco inicial', () => {
    montar()
    const d = w.find('[role="dialog"]')
    expect(d.attributes('aria-modal')).toBe('true')
    expect(document.getElementById(d.attributes('aria-labelledby') ?? '')?.textContent?.trim()).toBe('Crear usuarios en bloque')
    expect(document.activeElement).toBe(d.element)
  })

  it('paso 1: indicaciones, plantilla y selector de archivo con etiqueta', () => {
    montar()
    const t = w.find('[data-prueba="indicaciones-bloque"]').text()
    for (const x of ['analista', '200 filas y 1 MB', 'No incluyas contraseñas', '48 horas']) expect(t).toContain(x)
    expect(w.find('label[for="bloque-archivo"]').text()).toBe('Archivo CSV')
    expect(boton('validar-archivo').attributes('disabled')).toBeDefined()
  })

  it('la plantilla trae la cabecera correo,nombre,rol y una fila de ejemplo', () => {
    montar()
    const a = boton('descargar-plantilla')
    expect(a.attributes('download')).toBe('plantilla-usuarios.csv')
    const contenido = decodeURIComponent((a.attributes('href') ?? '').split(',').slice(1).join(','))
    expect(contenido.replace('﻿', '').split('\n').slice(0, 2)).toEqual(['correo,nombre,rol', 'ana.perez@ejemplo.pe,Ana Pérez,analista'])
  })

  it.each([
    ['usuarios.xlsx', 40, 'El archivo debe tener extensión .csv.'],
    ['usuarios.csv', 1024 * 1024 + 1, 'El archivo pesa más de 1 MB. Divide la lista en varios archivos.'],
  ])('valida en el cliente extensión y tamaño (%s) sin llamar al servidor', async (nombre, bytes, mensaje) => {
    montar()
    await elegir(csv(nombre, bytes))
    expect(w.find('[role="alert"]').text()).toBe(mensaje)
    expect(boton('validar-archivo').attributes('disabled')).toBeDefined()
    expect(validar).not.toHaveBeenCalled()
  })

  it('mientras valida: botón «Validando…» desactivado y no se envía dos veces', async () => {
    let resolver: (r: ResultadoValidacion) => void = () => {}
    validar.mockImplementation(() => new Promise(r => { resolver = r }))
    montar()
    await elegir(csv())
    await boton('validar-archivo').trigger('click')
    await boton('validar-archivo').trigger('click')
    expect(boton('validar-archivo').text()).toBe('Validando…')
    expect(boton('validar-archivo').attributes('disabled')).toBeDefined()
    expect(validar).toHaveBeenCalledTimes(1)
    escape() // no se cierra mientras se envía
    expect(w.emitted('cerrar')).toBeUndefined()
    resolver(valida)
    await flushPromises()
  })

  it('paso 2 válido: resumen y «Crear usuarios» activo', async () => {
    await hastaRevision(valida)
    expect(w.find('[data-prueba="resumen-validacion"]').text()).toBe('2 filas, 0 con error')
    expect(boton('crear-usuarios').attributes('disabled')).toBeUndefined()
  })

  it('paso 2 con errores: «Crear usuarios» desactivado, indica corregir y permite elegir otro archivo', async () => {
    await hastaRevision(conErrores)
    expect(w.find('[data-prueba="resumen-validacion"]').text()).toBe('2 filas, 1 con error')
    expect(boton('crear-usuarios').attributes('disabled')).toBeDefined()
    expect(boton('crear-usuarios').attributes('aria-describedby')).toBe('bloque-corregir')
    expect(w.find('#bloque-corregir').text()).toContain('Corrige el archivo y vuelve a subirlo')
    expect(w.text()).toContain('Solo se permite el rol analista.')
    await boton('otro-archivo').trigger('click')
    expect(w.find('#bloque-archivo').exists()).toBe(true)
  })

  it('paso 3: resultado anunciado en aria-live, con invitaciones fallidas', async () => {
    await hastaRevision(valida)
    confirmar.mockResolvedValue({ created: 2, invitations_sent: 1, invitations_failed: [{ email: 'beto@ecolima.pe', line: 3 }] })
    await boton('crear-usuarios').trigger('click')
    await flushPromises()
    const r = w.find('[data-prueba="resultado-bloque"]')
    expect(r.attributes('aria-live')).toBe('polite')
    expect(r.text()).toContain('Se crearon 2 usuarios.')
    expect(r.text()).toContain('Se envió 1 correo de invitación.')
    expect(w.find('[data-prueba="invitaciones-fallidas"]').text()).toContain('beto@ecolima.pe (línea 3)')
    expect(w.find('[data-prueba="invitaciones-fallidas"]').text()).toContain('«¿Olvidaste tu contraseña?»')
    await w.findAll('button').find(b => b.text() === 'Cerrar')?.trigger('click')
    expect(w.emitted('cerrar')?.[0]).toEqual([true])
  })

  it('409 al crear: vuelve a la revisión con las filas del servidor y no crea nada', async () => {
    await hastaRevision(valida)
    confirmar.mockImplementation(() => Promise.reject(new ErrorCargaMasiva('filas', 'x', undefined, conErrores)))
    await boton('crear-usuarios').trigger('click')
    await flushPromises()
    expect(w.text()).toContain('Al crear, el servidor volvió a revisar el archivo y encontró errores. No se creó ningún usuario.')
    expect(w.find('[data-prueba="resumen-validacion"]').text()).toBe('2 filas, 1 con error')
    expect(boton('crear-usuarios').attributes('disabled')).toBeDefined()
  })

  it.each([
    [new ErrorCargaMasiva('archivo', 'La cabecera debe ser correo,nombre,rol.', 'CABECERA_INVALIDA')],
    [new ErrorCargaMasiva('limite', 'Se alcanzó el límite de solicitudes. Espera unos minutos e intenta de nuevo.')],
    [new ErrorCargaMasiva('red', 'No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.')],
  ])('errores del servidor al validar se muestran con role="alert" (%#)', async error => {
    validar.mockImplementation(() => Promise.reject(error))
    montar()
    await elegir(csv())
    await boton('validar-archivo').trigger('click')
    await flushPromises()
    expect(w.find('[role="alert"]').text()).toBe(error.message)
    expect(boton('validar-archivo').attributes('disabled')).toBeUndefined()
  })

  it('Escape cierra cuando no se está enviando (sin creaciones)', async () => {
    montar()
    escape()
    expect(w.emitted('cerrar')?.[0]).toEqual([false])
  })

  it('trampa de foco: Tab desde el último elemento vuelve al primero', async () => {
    montar()
    const d = w.find('[role="dialog"]').element
    const enfocables = [...d.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])')]
    enfocables[enfocables.length - 1].focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
    expect(document.activeElement).toBe(enfocables[0])
  })
})
