import { DatasetsRepository } from '../repositories/DatasetsRepository'
import type { Dataset } from '../entities/Dataset'

export const UploadDatasetUseCase = {
  async execute(file: File): Promise<Dataset> {
    return DatasetsRepository.uploadDataset(file)
  },
}
