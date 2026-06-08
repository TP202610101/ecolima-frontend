import { MapRepository } from '../repositories/MapRepository'

export async function GetPointsUseCase() {
  const data = await MapRepository.getPoints()
  return data
}
