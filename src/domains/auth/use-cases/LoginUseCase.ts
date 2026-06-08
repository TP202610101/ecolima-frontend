import { AuthRepository } from '../repositories/AuthRepository'

export async function LoginUseCase(email: string, password: string) {
  const data = await AuthRepository.login(email, password)
  localStorage.setItem('access_token', data.access_token)
  return data.user
}
