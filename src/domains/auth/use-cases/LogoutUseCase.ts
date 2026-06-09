import { AuthRepository } from '../repositories/AuthRepository'
import { useAuthStore } from '../stores/useAuthStore'

export async function LogoutUseCase() {
  const auth = useAuthStore()
  await AuthRepository.logout()
  auth.logout()
}
