import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AdminUser, CreateUserPayload } from '../entities/AdminUser'
import { AdminUsersRepository } from '../repositories/AdminUsersRepository'

export const useAdminUsersStore = defineStore('admin-users', () => {
  const users = ref<AdminUser[]>([])
  const loading = ref(false)
  const creating = ref(false)
  const createError = ref<string | null>(null)
  const actionUserId = ref<number | null>(null)
  const actionError = ref<string | null>(null)

  async function fetchUsers() {
    loading.value = true
    try {
      users.value = await AdminUsersRepository.listUsers()
    } catch {
      // non-critical; table shows empty state
    } finally {
      loading.value = false
    }
  }

  async function createUser(payload: CreateUserPayload): Promise<boolean> {
    creating.value = true
    createError.value = null
    try {
      const user = await AdminUsersRepository.createUser(payload)
      users.value = [...users.value, user]
      return true
    } catch (e) {
      createError.value = e instanceof Error ? e.message : 'Error al crear usuario'
      return false
    } finally {
      creating.value = false
    }
  }

  async function updateRole(userId: number, role: 'admin' | 'analista') {
    actionUserId.value = userId
    actionError.value = null
    try {
      const updated = await AdminUsersRepository.updateRole(userId, role)
      users.value = users.value.map(u => u.user_id === userId ? updated : u)
    } catch (e) {
      actionError.value = e instanceof Error ? e.message : 'Error al cambiar rol'
    } finally {
      actionUserId.value = null
    }
  }

  async function updateStatus(userId: number, is_active: boolean) {
    actionUserId.value = userId
    actionError.value = null
    try {
      const updated = await AdminUsersRepository.updateStatus(userId, is_active)
      users.value = users.value.map(u => u.user_id === userId ? updated : u)
    } catch (e) {
      actionError.value = e instanceof Error ? e.message : 'Error al cambiar estado'
    } finally {
      actionUserId.value = null
    }
  }

  return {
    users,
    loading,
    creating,
    createError,
    actionUserId,
    actionError,
    fetchUsers,
    createUser,
    updateRole,
    updateStatus,
  }
})
