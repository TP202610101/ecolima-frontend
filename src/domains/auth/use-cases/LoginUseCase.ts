import { AuthRepository } from '../repositories/AuthRepository'
import type { User } from '../entities/User'

export interface LoginResult {
  user: User
  access_token: string
}

export async function LoginUseCase(email: string, password: string): Promise<LoginResult> {
  const data = await AuthRepository.login(email, password)
  localStorage.setItem('access_token', data.access_token)
  localStorage.setItem('user', JSON.stringify(data.user))
  return { user: data.user, access_token: data.access_token }
}
