import { describe, it, expect, vi, beforeEach } from 'vitest'

const { post } = vi.hoisted(() => ({ post: vi.fn() }))
vi.mock('@/shared/api/axios', () => ({ default: { post } }))

import { AuthRepository } from './AuthRepository'

describe('AuthRepository.login', () => {
  beforeEach(() => { post.mockReset() })

  it('devuelve la respuesta del backend', async () => {
    const data = { access_token: 'jwt', user: { user_id: 1, email: 'a@b.pe', full_name: 'A', role: 'admin' } }
    post.mockResolvedValue({ data })
    await expect(AuthRepository.login('a@b.pe', 'x')).resolves.toEqual(data)
    expect(post).toHaveBeenCalledWith('/api/v1/auth/login', { email: 'a@b.pe', password: 'x' })
  })

  it('propaga el error cuando el backend no responde, sin sesión de respaldo', async () => {
    const error = new Error('Network Error')
    post.mockImplementation(() => Promise.reject(error))
    const caught = await AuthRepository.login('a@b.pe', 'x').catch((e: unknown) => e)
    expect(caught).toBe(error)
  })

  it('propaga credenciales incorrectas', async () => {
    const error = { response: { status: 401 } }
    post.mockImplementation(() => Promise.reject(error))
    const caught = await AuthRepository.login('a@b.pe', 'mala').catch((e: unknown) => e)
    expect(caught).toBe(error)
  })
})
