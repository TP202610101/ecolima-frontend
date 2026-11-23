import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAvisoStore } from './useAvisoStore'
import { AvisosRepository } from '../repositories/AvisosRepository'
import { AVISOS_AYUDA } from '@/domains/analisis-v1/components/avisoAyuda'

vi.mock('../repositories/AvisosRepository', () => ({ AvisosRepository: { getEstado: vi.fn(), confirmar: vi.fn() } }))
const getEstado = vi.mocked(AvisosRepository.getEstado)
const confirmar = vi.mocked(AvisosRepository.confirmar)
const respuesta = (a: { clave: string; version: string }, confirmado: boolean) => ({ ...a, confirmado, confirmado_en: null })

beforeEach(() => { setActivePinia(createPinia()); getEstado.mockReset(); confirmar.mockReset() })

describe('useAvisoStore (lectura por sección)', () => {
  it('usa las tres claves del backend, versión «1»', () => {
    expect(Object.values(AVISOS_AYUDA)).toEqual([
      { clave: 'como-se-ordenan', version: '1' },
      { clave: 'fuentes-limitaciones', version: '1' },
      { clave: 'acerca-del-modelo', version: '1' },
    ])
  })

  it('cada sección se consulta con su propia clave y tiene su propio estado', async () => {
    getEstado.mockImplementation(async a => respuesta(a, a.clave === 'fuentes-limitaciones'))
    const s = useAvisoStore()
    await s.comprobar('1', 'orden')
    await s.comprobar('1', 'fuentes')
    expect(getEstado).toHaveBeenNthCalledWith(1, AVISOS_AYUDA.orden)
    expect(getEstado).toHaveBeenNthCalledWith(2, AVISOS_AYUDA.fuentes)
    expect([s.estados.orden, s.estados.fuentes, s.estados.modelo]).toEqual(['pendiente', 'confirmado', 'inactivo'])
    expect([s.pideLectura('orden'), s.pideLectura('fuentes')]).toEqual([true, false])
  })

  it('una sección confirmada no se vuelve a consultar para la misma cuenta', async () => {
    getEstado.mockImplementation(async a => respuesta(a, true))
    const s = useAvisoStore()
    await s.comprobar('1', 'modelo')
    await s.comprobar('1', 'modelo')
    expect(getEstado).toHaveBeenCalledTimes(1)
  })

  it('confirmar registra solo esa sección', async () => {
    getEstado.mockImplementation(async a => respuesta(a, false))
    confirmar.mockResolvedValue()
    const s = useAvisoStore()
    await s.comprobar('1', 'orden')
    await s.comprobar('1', 'modelo')
    await expect(s.confirmar('orden')).resolves.toBe(true)
    expect(confirmar).toHaveBeenCalledWith(AVISOS_AYUDA.orden)
    expect([s.estados.orden, s.estados.modelo]).toEqual(['confirmado', 'pendiente'])
  })

  it('si falla la consulta, esa sección no se exige', async () => {
    getEstado.mockImplementation(() => Promise.reject(new Error('422')))
    const s = useAvisoStore()
    await s.comprobar('1', 'fuentes')
    expect([s.estados.fuentes, s.pideLectura('fuentes')]).toEqual(['error', false])
  })

  it('si falla el registro, devuelve false y la sección sigue pendiente', async () => {
    getEstado.mockImplementation(async a => respuesta(a, false))
    confirmar.mockImplementation(() => Promise.reject(new Error('500')))
    const s = useAvisoStore()
    await s.comprobar('1', 'orden')
    await expect(s.confirmar('orden')).resolves.toBe(false)
    expect(s.estados.orden).toBe('pendiente')
  })

  it('cambiar de cuenta o cerrar sesión descarta los estados y las respuestas tardías', async () => {
    let resolver: (v: ReturnType<typeof respuesta>) => void = () => {}
    getEstado.mockImplementation(() => new Promise(r => { resolver = r }))
    const s = useAvisoStore()
    const p = s.comprobar('1', 'orden')
    s.clearData()
    resolver(respuesta(AVISOS_AYUDA.orden, false))
    await p
    expect(s.estados.orden).toBe('inactivo')
  })
})
