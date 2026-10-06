import { AuthRepository } from '../repositories/AuthRepository'
import { useAuthStore } from '../stores/useAuthStore'
import { useMLStore } from '@/domains/ml-panel/stores/useMLStore'
import { useRecommendationsStore } from '@/domains/recommendations/stores/useRecommendationsStore'
import { useAdminUsersStore } from '@/domains/admin/stores/useAdminUsersStore'
import { useDatasetsStore } from '@/domains/datasets/stores/useDatasetsStore'
import { useMapStore } from '@/domains/map/stores/useMapStore'
import { useReportsStore } from '@/domains/reports/stores/useReportsStore'
import { useCoverageRedundancyStore } from '@/domains/reports/stores/useCoverageRedundancyStore'

export async function LogoutUseCase() {
  const auth = useAuthStore()
  await AuthRepository.logout()
  auth.logout()
  useMLStore().clearData()
  useRecommendationsStore().clearData()
  useAdminUsersStore().clearData()
  useDatasetsStore().clearData()
  useMapStore().clearData()
  useReportsStore().clearData()
  useCoverageRedundancyStore().clearData()
}
