import { RecommendationsRepository } from '../repositories/RecommendationsRepository'

export async function GetRecommendationsUseCase(params = {}) {
  const data = await RecommendationsRepository.getRecommendations(params)
  return data
}
