import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { LogoutUseCase } from './LogoutUseCase'
import { useMLStore } from '@/domains/ml-panel/stores/useMLStore'
import { useRecommendationsStore } from '@/domains/recommendations/stores/useRecommendationsStore'
import { useAdminUsersStore } from '@/domains/admin/stores/useAdminUsersStore'
import { useDatasetsStore } from '@/domains/datasets/stores/useDatasetsStore'
import { useMapStore } from '@/domains/map/stores/useMapStore'
import { useReportsStore } from '@/domains/reports/stores/useReportsStore'
import { useCoverageRedundancyStore } from '@/domains/reports/stores/useCoverageRedundancyStore'
import type { ModelVersionMetrics } from '@/domains/ml-panel/entities/ModelVersion'
import type { Recommendation } from '@/domains/recommendations/entities/Recommendation'
import type { AdminUser } from '@/domains/admin/entities/AdminUser'
import type { RecyclingPoint } from '@/domains/map/entities/RecyclingPoint'
import type { CoverageRedundancyItem } from '@/domains/map/repositories/MapRepository'
import type { TrainingStats } from '@/domains/reports/repositories/ReportsRepository'
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

const stubRec: Recommendation = {
  zone_id: 1,
  priority_label: 'Alta',
  recommendation_reason: 'test',
  coverage_gap_m: null,
  centroid_lat: -12.0,
  centroid_lon: -77.0,
  district_name: 'Miraflores',
  geometry: { type: 'Polygon', coordinates: [] } as GeoJSON.Polygon,
}

const stubUser: AdminUser = {
  user_id: 1,
  email: 'a@test.com',
  full_name: 'Test User',
  role: 'admin',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
}

const stubPoint: RecyclingPoint = {
  point_id: 1,
  point_type: 'contenedor',
  address: 'Av. Test 123',
  materials_accepted: 'papel',
  verified: true,
  district_id: 1,
  geometry: { type: 'Point', coordinates: [-77.0, -12.0] } as GeoJSON.Point,
}

const stubDataset: Dataset = {
  dataset_id: 1,
  filename: 'test.csv',
  uploaded_at: '2026-01-01T00:00:00Z',
  row_count: 100,
  status: 'valid',
  detected_columns: ['lat', 'lng'],
}

const stubCoverage: CoverageRedundancyItem = {
  district_id: 1,
  district_name: 'Miraflores',
  total_recommended: 5,
  already_covered: 3,
  redundancy_pct: 60,
  status: 'verde',
  is_demo: false,
}

const stubStats: TrainingStats = {
  total_labeled: 100,
  positive_labels: 40,
  districts_covered: 12,
  features_available: ['density', 'gpc'],
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  localStorage.clear()
})

describe('LogoutUseCase — limpieza de stores', () => {
  it('limpia todos los stores al hacer logout', async () => {
    const mlStore = useMLStore()
    const recsStore = useRecommendationsStore()
    const adminStore = useAdminUsersStore()
    const datasetsStore = useDatasetsStore()
    const mapStore = useMapStore()
    const reportsStore = useReportsStore()
    const coverageStore = useCoverageRedundancyStore()

    // Poblar con datos de prueba
    mlStore.models = [stubMetrics]
    mlStore.error = 'error ml'
    mlStore.inferring = true
    mlStore.inferenceTaskId = 'task-xyz'
    mlStore.updating = true
    mlStore.compareResult = { a: stubMetrics, b: stubMetrics }

    recsStore.recommendations = [stubRec]
    recsStore.selectedZone = stubRec
    recsStore.error = 'error recs'

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

    mapStore.points = [stubPoint]
    mapStore.heatmapPoints = [[-12.0, -77.0, 1.0]]
    mapStore.error = 'error map'
    mapStore.heatmapError = 'error heatmap'
    mapStore.showHeatmap = true
    mapStore.heatmapMetric = 'priority'
    mapStore.selectedMaterial = 'papel'
    mapStore.selectedDistrictId = 42
    mapStore.showZones = false
    mapStore.showPoints = false

    reportsStore.recommendations = [stubRec]
    reportsStore.stats = stubStats
    reportsStore.error = 'error reports'

    coverageStore.items = [stubCoverage]
    coverageStore.error = 'error coverage'

    await LogoutUseCase()

    // useMLStore
    expect(mlStore.models).toHaveLength(0)
    expect(mlStore.error).toBeNull()
    expect(mlStore.inferring).toBe(false)
    expect(mlStore.inferenceTaskId).toBeNull()
    expect(mlStore.updating).toBe(false)
    expect(mlStore.compareResult).toBeNull()

    // useRecommendationsStore
    expect(recsStore.recommendations).toHaveLength(0)
    expect(recsStore.selectedZone).toBeNull()
    expect(recsStore.error).toBeNull()

    // useAdminUsersStore
    expect(adminStore.users).toHaveLength(0)
    expect(adminStore.actionError).toBeNull()
    expect(adminStore.createError).toBeNull()

    // useDatasetsStore
    expect(datasetsStore.datasets).toHaveLength(0)
    expect(datasetsStore.actionError).toBeNull()
    expect(datasetsStore.uploadResult).toBeNull()
    expect(datasetsStore.lastValidation).toBeNull()

    // useMapStore
    expect(mapStore.points).toHaveLength(0)
    expect(mapStore.heatmapPoints).toHaveLength(0)
    expect(mapStore.error).toBeNull()
    expect(mapStore.heatmapError).toBeNull()
    expect(mapStore.showHeatmap).toBe(false)
    expect(mapStore.heatmapMetric).toBe('density')
    expect(mapStore.selectedMaterial).toBe('')
    expect(mapStore.selectedDistrictId).toBeUndefined()
    expect(mapStore.showZones).toBe(true)
    expect(mapStore.showPoints).toBe(true)

    // useReportsStore
    expect(reportsStore.recommendations).toHaveLength(0)
    expect(reportsStore.stats).toBeNull()
    expect(reportsStore.error).toBeNull()

    // useCoverageRedundancyStore
    expect(coverageStore.items).toHaveLength(0)
    expect(coverageStore.error).toBeNull()
  })
})
