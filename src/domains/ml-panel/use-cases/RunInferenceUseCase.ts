import { MLRepository } from '../repositories/MLRepository'

export async function RunInferenceUseCase() {
  const data = await MLRepository.runInference({ model_version: 'latest', threshold: 0.5 })
  return data
}
