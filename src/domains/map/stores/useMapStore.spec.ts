import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMapStore } from './useMapStore'
import { GetPointsUseCase } from '../use-cases/GetPointsUseCase'
import { MapRepository } from '../repositories/MapRepository'
import type { RecyclingPoint } from '../entities/RecyclingPoint'
import type { District } from '../entities/District'

vi.mock('../use-cases/GetPointsUseCase', () => ({
  GetPointsUseCase: vi.fn(),
}))

vi.mock('../repositories/MapRepository', () => ({
  MapRepository: { getDistricts: vi.fn() },
}))

const mockPoint = (): RecyclingPoint => ({
  point_id: 1,
  point_type: 'ecopunto',
  address: 'Av. Larco 123',
  materials_accepted: 'plástico',
  verified: true,
  district_id: 15,
  geometry: { type: 'Point', coordinates: [-77.04, -12.05] },
})

const mockDistrictFeature = (name = 'Miraflores') => ({
  type: 'Feature' as const,
  properties: { district_id: 15, district_name: name, area_km2: 9.62 },
  geometry: { type: 'Polygon' as const, coordinates: [[]] },
})

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('useMapStore — estado inicial', () => {
  it('inicia con arrays vacíos y flags en false', () => {
    const store = useMapStore()
    expect(store.points).toHaveLength(0)
    expect(store.districts).toHaveLength(0)
    expect(store.loadingPoints).toBe(false)
    expect(store.error).toBeNull()
    expect(store.showZones).toBe(true)
    expect(store.showPoints).toBe(true)
  })
})

describe('useMapStore — fetchPoints', () => {
  it('carga puntos correctamente', async () => {
    const points = [mockPoint()]
    vi.mocked(GetPointsUseCase).mockResolvedValue(points)
    const store = useMapStore()
    await store.fetchPoints()
    expect(store.points).toEqual(points)
    expect(store.loadingPoints).toBe(false)
    expect(store.error).toBeNull()
  })

  it('guarda error si falla la carga', async () => {
    vi.mocked(GetPointsUseCase).mockRejectedValue(new Error('Sin conexión'))
    const store = useMapStore()
    await store.fetchPoints()
    expect(store.points).toHaveLength(0)
    expect(store.error).toBe('Sin conexión')
  })
})

describe('useMapStore — fetchDistricts', () => {
  it('carga distritos desde GeoJSON', async () => {
    vi.mocked(MapRepository.getDistricts).mockResolvedValue({
      type: 'FeatureCollection',
      features: [mockDistrictFeature()],
    })
    const store = useMapStore()
    await store.fetchDistricts()
    expect(store.districts).toHaveLength(1)
    expect(store.districts[0].district_name).toBe('Miraflores')
  })

  it('no guarda error si falla (non-critical)', async () => {
    vi.mocked(MapRepository.getDistricts).mockRejectedValue(new Error('404'))
    const store = useMapStore()
    await store.fetchDistricts()
    expect(store.districts).toHaveLength(0)
    expect(store.error).toBeNull()
  })
})
