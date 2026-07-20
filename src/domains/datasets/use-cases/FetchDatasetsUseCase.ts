import { DatasetsRepository } from '../repositories/DatasetsRepository'
import type { Dataset } from '../entities/Dataset'

export const FetchDatasetsUseCase = {
  async execute(): Promise<Dataset[]> {
    return DatasetsRepository.getDatasets()
  },
}
