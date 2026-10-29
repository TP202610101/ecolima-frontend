import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import MLPanelView from './MLPanelView.vue'
import PanelDatos from '../components/PanelDatos.vue'
import { useDatasetsStore } from '@/domains/datasets/stores/useDatasetsStore'
import { MLRepository } from '../repositories/MLRepository'
import { DatasetsRepository } from '@/domains/datasets/repositories/DatasetsRepository'
import { useAuthStore } from '@/domains/auth/stores/useAuthStore'
import type { Dataset } from '@/domains/datasets/entities/Dataset'
import { revisarLenguaje } from '@/shared/utils/lenguajeV1'

vi.mock('../repositories/MLRepository', () => ({
  MLRepository: {
    getVersiones: vi.fn().mockResolvedValue({ activa: null, versiones: [] }),
    getVersion: vi.fn().mockRejectedValue({ response: { status: 404, data: { detail: 'no hay una versión de análisis activa' } } }),
    getModelo: vi.fn().mockRejectedValue({}), getMcda: vi.fn().mockRejectedValue({}), getTamizaje: vi.fn().mockRejectedValue({}),
  },
}))
vi.mock('@/domains/datasets/repositories/DatasetsRepository', () => ({
  DatasetsRepository: { getDatasets: vi.fn(), commitDataset: vi.fn() },
}))

const dataset = (status: Dataset['status']): Dataset => ({
  dataset_id: 25, filename: 'qa_prueba_panel.csv', uploaded_at: '2026-10-22T10:00:00Z', row_count: 3, status, detected_columns: [],
})

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  localStorage.clear()
  useAuthStore().setSession({ user_id: 9, email: 'qa-admin@ecolima.pe', full_name: 'QA admin', role: 'admin' }, 'jwt')
  vi.mocked(DatasetsRepository.getDatasets).mockResolvedValue([dataset('valid')])
})

describe('MLPanelView', () => {
  it('abre en «Modelo», carga el paquete y cambia a «Datos»', async () => {
    const w = mount(MLPanelView, { global: { stubs: { GraficoSemillas: true, teleport: true } } })
    await flushPromises()
    expect(MLRepository.getVersiones).toHaveBeenCalled()
    expect(w.find('[data-prueba="bloque-version"]').exists()).toBe(true)
    expect(w.find('[data-pestana="modelo"]').attributes('aria-selected')).toBe('true')
    await w.find('[data-pestana="datos"]').trigger('click')
    expect(w.find('[data-prueba="aviso-datasets"]').exists()).toBe(true)
    expect(w.find('[data-prueba="bloque-version"]').exists()).toBe(false)
  })

  it('sin versión activa muestra el mensaje del backend en su bloque', async () => {
    const w = mount(MLPanelView, { global: { stubs: { GraficoSemillas: true, teleport: true } } })
    await flushPromises()
    expect(w.find('[data-prueba="bloque-version"]').text()).toContain('no hay una versión de análisis activa')
  })
})

describe('PanelDatos', () => {
  it('avisa que los datasets confirmados actualizan el mapa público, no el paquete del modelo', async () => {
    const w = mount(PanelDatos, { global: { stubs: { teleport: true } } })
    await flushPromises()
    expect(w.find('[data-prueba="aviso-datasets"]').text()).toBe('Los datasets confirmados actualizan los puntos del mapa público, no el paquete del modelo.')
    expect(w.text()).toContain('qa_prueba_panel.csv')
    expect(revisarLenguaje(w.text())).toEqual([])
  })

  it('lista los datasets cargados con acciones en grilla: principal primero y Eliminar al final, aparte', async () => {
    const w = mount(PanelDatos, { global: { stubs: { teleport: true } } })
    await flushPromises()
    expect(w.text()).toContain('Datasets cargados (últimos 5)')
    expect(w.text()).not.toMatch(/Preview del dataset|Distritos cubiertos|dataset activo/)
    const acciones = w.find('[data-prueba="acciones-dataset"]')
    expect(acciones.classes()).toEqual(expect.arrayContaining(['grid', 'grid-cols-2', 'md:flex']))
    const botones = acciones.findAll('button')
    expect(botones.map(b => b.attributes('data-accion'))).toEqual(['confirmar', 'limpiar', 'historial', 'eliminar'])
    expect(botones[0].classes()).toContain('max-md:col-span-2')
    expect(botones[3].classes()).toEqual(expect.arrayContaining(['max-md:col-span-2', 'bg-red-50', 'md:bg-red-600']))
    for (const b of botones) expect(b.classes()).toContain('min-h-10')
  })

  it('confirmar un dataset pide confirmación antes de insertar puntos', async () => {
    const w = mount(PanelDatos, { global: { stubs: { teleport: true } } })
    await flushPromises()
    const st = useDatasetsStore()
    const commit = vi.spyOn(st, 'commitDataset').mockResolvedValue()
    const confirmar = w.findAll('button').find(b => b.text() === 'Confirmar')
    expect(confirmar).toBeDefined()
    await confirmar?.trigger('click')
    expect(commit).not.toHaveBeenCalled()
    expect(w.text()).toContain('se agregarán al mapa público')
    expect(w.text()).toContain('no se puede deshacer')
  })
})
