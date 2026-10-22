import { AuthRepository } from '../repositories/AuthRepository'
import { useAuthStore } from '../stores/useAuthStore'
import { useMLStore } from '@/domains/ml-panel/stores/useMLStore'
import { useAdminUsersStore } from '@/domains/admin/stores/useAdminUsersStore'
import { useDatasetsStore } from '@/domains/datasets/stores/useDatasetsStore'
import { useExploracionV1Store } from '@/domains/analisis-v1/stores/useExploracionV1Store'

export async function LogoutUseCase() {
  const auth = useAuthStore()
  await AuthRepository.logout()
  auth.logout()
  useMLStore().clearData()
  useAdminUsersStore().clearData()
  useDatasetsStore().clearData()
  useExploracionV1Store().clearData()
}
