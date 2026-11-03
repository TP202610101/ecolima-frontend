import { describe, it, expect, vi, beforeEach } from 'vitest'

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@/shared/api/axios', () => ({ default: { get, post } }))

import { AvisosRepository } from './AvisosRepository'

const AVISO = { clave: 'fuentes-limitaciones', version: '1' }
const ana = { user_id: 1, email: 'ana@ecolima.pe', full_name: 'Ana', role: 'analista' as const, confirmado: true, confirmado_en: '2026-11-02T10:00:00Z' }
const beto = { user_id: 2, email: 'beto@ecolima.pe', full_name: null, role: 'admin' as const, confirmado: false, confirmado_en: null }

beforeEach(() => { get.mockReset(); post.mockReset() })

describe('AvisosRepository', () => {
  it('getEstado consulta /me/avisos con clave y versión', async () => {
    get.mockResolvedValue({ data: { ...AVISO, confirmado: false, confirmado_en: null } })
    await expect(AvisosRepository.getEstado(AVISO)).resolves.toMatchObject({ confirmado: false })
    expect(get).toHaveBeenCalledWith('/api/v1/me/avisos', { params: AVISO })
  })

  it('confirmar envía clave y versión', async () => {
    post.mockResolvedValue({ data: {} })
    await AvisosRepository.confirmar(AVISO)
    expect(post).toHaveBeenCalledWith('/api/v1/me/avisos/confirmar', AVISO)
  })

  it.each([
    ['un arreglo', [ana, beto]],
    ['{ usuarios }', { usuarios: [ana, beto] }],
    ['{ confirmados, pendientes }', { confirmados: [{ ...ana, confirmado: undefined }], pendientes: [{ ...beto, confirmado: undefined }] }],
  ])('getConfirmaciones acepta %s y devuelve una sola lista', async (_, data) => {
    get.mockResolvedValue({ data })
    const filas = await AvisosRepository.getConfirmaciones(AVISO)
    expect(get).toHaveBeenCalledWith('/api/v1/admin/avisos/confirmaciones', { params: AVISO })
    expect(filas.map(f => [f.email, f.confirmado])).toEqual([['ana@ecolima.pe', true], ['beto@ecolima.pe', false]])
  })
})
