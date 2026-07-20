import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMLStore } from './useMLStore'
import { MLRepository } from '../repositories/MLRepository'
import type { ModelVersion } from '../entities/ModelVersion'

vi.mock('../repositories/MLRepository', () => ({
  MLRepository: {
    getModels: vi.fn(),
    activateModel: vi.fn(),
    runInference: vi.fn(),
    getInferenceStatus: vi.fn(),
  },
}))

const mockModel = (overrides: Partial<ModelVersion> = {}): ModelVersion => ({
  version_name: 'v1.0',
  training_date: '2026-01-15T00:00:00Z',
  is_active: true,
  artifact_url: 'https://blob.azure.net/model.pkl',
  metrics: { accuracy: 0.87, f1: 0.84, auc_pr: 0.91, precision: 0.85, recall: 0.83 },
  created_at: '2026-01-15T00:00:00Z',
  ...overrides,
})

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useMLStore — estado inicial', () => {
  it('inicia sin modelos', () => {
    const store = useMLStore()
    expect(store.models).toHaveLength(0)
    expect(store.activeModel).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.inferring).toBe(false)
  })
})

describe('useMLStore — fetchModels', () => {
  it('carga modelos y detecta el activo', async () => {
    const models = [mockModel({ is_active: true }), mockModel({ version_name: 'v0.9', is_active: false })]
    vi.mocked(MLRepository.getModels).mockResolvedValue(models)

    const store = useMLStore()
    await store.fetchModels()

    expect(store.models).toHaveLength(2)
    expect(store.activeModel?.version_name).toBe('v1.0')
    expect(store.loading).toBe(false)
  })

  it('guarda error si falla', async () => {
    vi.mocked(MLRepository.getModels).mockRejectedValue(new Error('Error al cargar'))
    const store = useMLStore()
    await store.fetchModels()
    expect(store.error).toBe('Error al cargar')
  })
})

describe('useMLStore — runInference', () => {
  it('inicia inferencia y comienza polling', async () => {
    vi.mocked(MLRepository.runInference).mockResolvedValue({ task_id: 'task-123', status: 'running', estimated_zones: 50 })
    vi.mocked(MLRepository.getInferenceStatus).mockResolvedValue({ status: 'running', progress_pct: 30, zones_processed: 15 })

    const store = useMLStore()
    await store.runInference()

    expect(store.inferenceTaskId).toBe('task-123')
    expect(store.inferring).toBe(true)
    store.stopPolling()
  })

  it('guarda error de inferencia si falla', async () => {
    vi.mocked(MLRepository.runInference).mockRejectedValue(new Error('Sin permisos'))
    const store = useMLStore()
    await store.runInference()
    expect(store.inferenceError).toBe('Sin permisos')
    expect(store.inferring).toBe(false)
  })

  it('detiene polling y marca como completado cuando status es done', async () => {
    vi.mocked(MLRepository.runInference).mockResolvedValue({ task_id: 'task-456', status: 'running', estimated_zones: 10 })
    vi.mocked(MLRepository.getInferenceStatus).mockResolvedValue({ status: 'done', progress_pct: 100, zones_processed: 10 })
    vi.mocked(MLRepository.getModels).mockResolvedValue([mockModel()])

    const store = useMLStore()
    await store.runInference()

    await vi.runOnlyPendingTimersAsync()

    expect(store.inferring).toBe(false)
    store.stopPolling()
  })
})
