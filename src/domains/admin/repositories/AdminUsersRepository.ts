import api from '@/shared/api/axios'
import type { AdminUser, CreateUserPayload } from '../entities/AdminUser'

export const AdminUsersRepository = {
  async listUsers(): Promise<AdminUser[]> {
    const res = await api.get('/api/v1/admin/users')
    return res.data
  },

  async createUser(payload: CreateUserPayload): Promise<AdminUser> {
    const res = await api.post('/api/v1/admin/users', payload)
    return res.data
  },

  async updateRole(userId: number, role: 'admin' | 'analista'): Promise<AdminUser> {
    const res = await api.patch(`/api/v1/admin/users/${userId}/role`, { role })
    return res.data
  },

  async updateStatus(userId: number, is_active: boolean): Promise<AdminUser> {
    const res = await api.patch(`/api/v1/admin/users/${userId}/status`, { is_active })
    return res.data
  },
}
