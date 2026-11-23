import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDatasetsStore } from './useDatasetsStore'
import { DatasetsRepository } from '../repositories/DatasetsRepository'
import { mostrarToast } from '@/shared/composables/useToast'
import type { Dataset } from '../entities/Dataset'

vi.mock('@/shared/composables/useToast', () => ({ mostrarToast: vi.fn() }))
vi.mock('../use-cases/FetchDatasetsUseCase', () => ({ FetchDatasetsUseCase: { execute: vi.fn().mockResolvedValue([]) } }))
vi.mock('../use-cases/UploadDatasetUseCase', () => ({ UploadDatasetUseCase: { execute: vi.fn() } }))
vi.mock('../repositories/DatasetsRepository', () => ({ DatasetsRepository: { deleteDataset: vi.fn() } }))

const repo = vi.mocked(DatasetsRepository)
const dataset = { dataset_id: 3, filename: 'a.csv', status: 'pending' } as Dataset

beforeEach(() => {
  setActivePinia(createPinia())
  vi.mocked(mostrarToast).mockClear()
  repo.deleteDataset.mockReset()
})

describe('useDatasetsStore — eliminar dataset', () => {
  it('quita el dataset de la lista y avisa', async () => {
    repo.deleteDataset.mockResolvedValue(undefined)
    const s = useDatasetsStore()
    s.datasets = [dataset]
    await s.deleteDataset(3)
    expect(s.datasets).toEqual([])
    expect(mostrarToast).toHaveBeenCalledExactlyOnceWith('Dataset eliminado.')
  })

  it('si falla no hay aviso de éxito y queda el error', async () => {
    repo.deleteDataset.mockRejectedValue(new Error('Este dataset ya fue confirmado y no se puede modificar.'))
    const s = useDatasetsStore()
    await s.deleteDataset(3)
    expect(s.deleteDatasetError).toBe('Este dataset ya fue confirmado y no se puede modificar.')
    expect(mostrarToast).not.toHaveBeenCalled()
  })
})
