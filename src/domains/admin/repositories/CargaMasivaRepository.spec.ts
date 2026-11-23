import { describe, it, expect, vi, beforeEach } from 'vitest'

const { post } = vi.hoisted(() => ({ post: vi.fn() }))
vi.mock('@/shared/api/axios', () => ({ default: { post } }))

import { CargaMasivaRepository, ErrorCargaMasiva } from './CargaMasivaRepository'

const archivo = new File(['correo,nombre,rol\na@b.pe,Ana,analista\n'], 'usuarios.csv', { type: 'text/csv' })
// Error tal como lo entrega shared/api/axios.ts: mensaje legible y la respuesta original en cause.
const errorHttp = (status: number, data: unknown) => Object.assign(new Error('x'), { cause: { response: { status, data } } })
const validacion = {
  valid: false, total: 1,
  rows: [{ line: 2, email: 'a@b.pe', full_name: 'Ana', role: 'analista', status: 'error', errors: [{ code: 'CORREO_EXISTE', message: 'El correo ya está registrado.' }] }],
}
async function fallo(p: Promise<unknown>): Promise<ErrorCargaMasiva> {
  const e = await p.catch((x: unknown) => x)
  expect(e).toBeInstanceOf(ErrorCargaMasiva)
  return e as ErrorCargaMasiva
}

beforeEach(() => { post.mockReset() })

describe('CargaMasivaRepository', () => {
  it('validar envía el archivo como multipart en el campo «file»', async () => {
    post.mockResolvedValue({ data: { valid: true, total: 1, rows: [] } })
    await expect(CargaMasivaRepository.validar(archivo)).resolves.toEqual({ valid: true, total: 1, rows: [] })
    const [url, cuerpo] = post.mock.calls[0]
    expect(url).toBe('/api/v1/admin/users/bulk/validate')
    expect(cuerpo).toBeInstanceOf(FormData)
    expect((cuerpo as FormData).get('file')).toBe(archivo)
  })

  it('confirmar envía el MISMO archivo a /bulk/confirm', async () => {
    post.mockResolvedValue({ data: { created: 1, invitations_sent: 1, invitations_failed: [] } })
    await CargaMasivaRepository.confirmar(archivo)
    const [url, cuerpo] = post.mock.calls[0]
    expect(url).toBe('/api/v1/admin/users/bulk/confirm')
    expect((cuerpo as FormData).get('file')).toBe(archivo)
  })

  it.each([
    ['tal cual', validacion],
    ['dentro de «detail»', { detail: validacion }],
  ])('409 al confirmar (%s): error «filas» con la validación del servidor', async (_, data) => {
    post.mockImplementation(() => Promise.reject(errorHttp(409, data)))
    const e = await fallo(CargaMasivaRepository.confirmar(archivo))
    expect(e.tipo).toBe('filas')
    expect(e.validacion?.rows[0].errors[0].message).toBe('El correo ya está registrado.')
  })

  it.each([
    ['tal cual', { code: 'CABECERA_INVALIDA', message: 'La cabecera debe ser correo,nombre,rol.' }],
    ['dentro de «detail»', { detail: { code: 'CABECERA_INVALIDA', message: 'La cabecera debe ser correo,nombre,rol.' } }],
  ])('422 (%s): error «archivo» con el mensaje y el código del servidor', async (_, data) => {
    post.mockImplementation(() => Promise.reject(errorHttp(422, data)))
    const e = await fallo(CargaMasivaRepository.validar(archivo))
    expect([e.tipo, e.codigo, e.message]).toEqual(['archivo', 'CABECERA_INVALIDA', 'La cabecera debe ser correo,nombre,rol.'])
  })

  it.each([
    [429, 'limite', 'Se alcanzó el límite de solicitudes. Espera unos minutos e intenta de nuevo.'],
    [403, 'permiso', 'Tu cuenta no tiene permiso para crear usuarios.'],
    [500, 'otro', 'No se pudo procesar el archivo. Intenta de nuevo.'],
  ])('%i: error «%s» con mensaje propio', async (status, tipo, mensaje) => {
    post.mockImplementation(() => Promise.reject(errorHttp(status, {})))
    const e = await fallo(CargaMasivaRepository.confirmar(archivo))
    expect([e.tipo, e.message]).toEqual([tipo, mensaje])
  })

  it('sin respuesta del servidor: error de red', async () => {
    post.mockImplementation(() => Promise.reject(new Error('Sin conexión. Verifica tu red.')))
    const e = await fallo(CargaMasivaRepository.validar(archivo))
    expect([e.tipo, e.message]).toEqual(['red', 'No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.'])
  })
})
