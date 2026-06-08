import { MLRepository } from '../repositories/MLRepository'

export async function RunInferenceUseCase() {
  const data = await MLRepository.getModels()
  return data
}
