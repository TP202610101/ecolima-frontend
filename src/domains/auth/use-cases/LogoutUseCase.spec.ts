import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { LogoutUseCase } from './LogoutUseCase'
import { useMLStore } from '@/domains/ml-panel/stores/useMLStore'
import { useAdminUsersStore } from '@/domains/admin/stores/useAdminUsersStore'
import { useDatasetsStore } from '@/domains/datasets/stores/useDatasetsStore'
import { useExploracionV1Store } from '@/domains/analisis-v1/stores/useExploracionV1Store'
import type { Fuente } from '@/domains/analisis-v1/entities/AnalisisV1'
import type { ModelVersionMetrics } from '@/domains/ml-panel/entities/ModelVersion'
import type { AdminUser } from '@/domains/admin/entities/AdminUser'
import type { Dataset } from '@/domains/datasets/entities/Dataset'

vi.mock('../repositories/AuthRepository', () => ({
  AuthRepository: {
    logout: vi.fn().mockResolvedValue(undefined),
  },
}))

const stubMetrics: ModelVersionMetrics = {
  version_name: 'v1.0',
  training_date: '2026-01-01T00:00:00Z',
  is_active: true,
  metrics: {},
  features_used: ['density', 'gpc'],
  comparison_with_previous: null,
}

const stubUser: AdminUser = {
  user_id: 1,
  email: 'a@test.com',
  full_name: 'Test User',
  role: 'admin',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
}

const stubDataset: Dataset = {
  dataset_id: 1,
  filename: 'test.csv',
  uploaded_at: '2026-01-01T00:00:00Z',
  row_count: 100,
  status: 'valid',
  detected_columns: ['lat', 'lng'],
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  localStorage.clear()
})

describe('LogoutUseCase — limpieza de stores', () => {
  it('limpia los stores del Panel ML, Usuarios y datasets al hacer logout', async () => {
    const mlStore = useMLStore()
    const adminStore = useAdminUsersStore()
    const datasetsStore = useDatasetsStore()

    // Poblar con datos de prueba
    mlStore.models = [stubMetrics]
    mlStore.error = 'error ml'
    mlStore.inferring = true
    mlStore.inferenceTaskId = 'task-xyz'
    mlStore.updating = true
    mlStore.compareResult = { a: stubMetrics, b: stubMetrics }

    adminStore.users = [stubUser]
    adminStore.actionError = 'error admin'
    adminStore.createError = 'error create'

    datasetsStore.datasets = [stubDataset]
    datasetsStore.actionError = 'error datasets'
    datasetsStore.uploadResult = stubDataset
    datasetsStore.lastValidation = {
      datasetId: 1,
      filename: 'test.csv',
      result: { dataset_id: 1, valid: true, missing_columns: [], row_count: 100, valid_rows: 100, error_rows: 0, duplicate_rows: [] },
    }

    await LogoutUseCase()

    // useMLStore
    expect(mlStore.models).toHaveLength(0)
    expect(mlStore.error).toBeNull()
    expect(mlStore.inferring).toBe(false)
    expect(mlStore.inferenceTaskId).toBeNull()
    expect(mlStore.updating).toBe(false)
    expect(mlStore.compareResult).toBeNull()

    // useAdminUsersStore
    expect(adminStore.users).toHaveLength(0)
    expect(adminStore.actionError).toBeNull()
    expect(adminStore.createError).toBeNull()

    // useDatasetsStore
    expect(datasetsStore.datasets).toHaveLength(0)
    expect(datasetsStore.actionError).toBeNull()
    expect(datasetsStore.uploadResult).toBeNull()
    expect(datasetsStore.lastValidation).toBeNull()

  })

  it('limpia los resultados V1 para que no los vea la siguiente cuenta', async () => {
    const v1 = useExploracionV1Store()
    v1.cargado = true
    v1.usuario = '7'
    v1.ambito = '150131'
    v1.selId = 'S1'
    v1.error = 'error v1'
    v1.fuentes = [{ codigo: 'OSM' } as Fuente]

    await LogoutUseCase()

    expect(v1.cargado).toBe(false)
    expect(v1.usuario).toBe('')
    expect(v1.ambito).toBe('lima')
    expect(v1.selId).toBeNull()
    expect(v1.error).toBeNull()
    expect(v1.fuentes).toHaveLength(0)
    expect(v1.lugares).toHaveLength(0)
  })
})
