import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAdminUsersStore } from './useAdminUsersStore'
import { AdminUsersRepository } from '../repositories/AdminUsersRepository'
import { mostrarToast } from '@/shared/composables/useToast'
import type { AdminUser } from '../entities/AdminUser'

vi.mock('@/shared/composables/useToast', () => ({ mostrarToast: vi.fn() }))
vi.mock('../repositories/AdminUsersRepository', () => ({
  AdminUsersRepository: { createUser: vi.fn(), updateRole: vi.fn(), updateStatus: vi.fn() },
}))

const repo = vi.mocked(AdminUsersRepository)
const usuario = { user_id: 7, email: 'a@b.pe', full_name: 'A', role: 'analista', is_active: true } as AdminUser

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('useAdminUsersStore — avisos de éxito', () => {
  it('crear usuario', async () => {
    repo.createUser.mockResolvedValue(usuario)
    const ok = await useAdminUsersStore().createUser({ email: 'a@b.pe', password: 'x', role: 'analista' })
    expect(ok).toBe(true)
    expect(mostrarToast).toHaveBeenCalledExactlyOnceWith('Usuario creado.')
  })

  it('cambiar rol', async () => {
    repo.updateRole.mockResolvedValue(usuario)
    await useAdminUsersStore().updateRole(7, 'admin')
    expect(mostrarToast).toHaveBeenCalledExactlyOnceWith('Rol actualizado.')
  })

  it.each([
    [true, 'Cuenta activada.'],
    [false, 'Cuenta desactivada.'],
  ])('cambiar estado a %s', async (activo, texto) => {
    repo.updateStatus.mockResolvedValue(usuario)
    await useAdminUsersStore().updateStatus(7, activo)
    expect(mostrarToast).toHaveBeenCalledExactlyOnceWith(texto)
  })

  it('si la acción falla no hay aviso de éxito y queda el error', async () => {
    repo.createUser.mockRejectedValue(new Error('El email ya existe'))
    repo.updateRole.mockRejectedValue(new Error('No se puede'))
    repo.updateStatus.mockRejectedValue(new Error('No se puede'))
    const s = useAdminUsersStore()

    expect(await s.createUser({ email: 'a@b.pe', password: 'x', role: 'analista' })).toBe(false)
    expect(s.createError).toBe('El email ya existe')
    await s.updateRole(7, 'admin')
    await s.updateStatus(7, false)
    expect(s.actionError).toBe('No se puede')
    expect(mostrarToast).not.toHaveBeenCalled()
  })
})
