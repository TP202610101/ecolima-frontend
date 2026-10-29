import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMLStore } from './useMLStore'
import { MLRepository } from '../repositories/MLRepository'
import type { ModeloV1, ResumenMcda, ResumenTamizaje, VersionActiva } from '@/domains/analisis-v1/entities/AnalisisV1'
import type { ListaVersiones, VersionResumen } from '../entities/ModelVersion'

vi.mock('../repositories/MLRepository', () => ({
  MLRepository: {
    getVersiones: vi.fn(), getVersion: vi.fn(), getModelo: vi.fn(), getMcda: vi.fn(), getTamizaje: vi.fn(),
  },
}))
const repo = vi.mocked(MLRepository)

const resumen = (v: string, activa: boolean): VersionResumen => ({
  paquete_version: v, dataset_version: v, modelo_version: `propension-${v}`, mcda_version: '1.0.2',
  fecha_paquete: '2026-10-03T15:34:38-05:00', descripcion: '', licencia_datos: 'ODbL-1.0', activa,
  importado_en: '2026-10-21T19:45:13-05:00', manifest_sha256: 'abc',
})
const version = (v: string) => ({ paquete_version: v, activa: v === '1.0.0' } as VersionActiva)
const modelo = (v: string) => ({ modelo_version: `propension-${v}` } as ModeloV1)

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  repo.getVersiones.mockResolvedValue({ activa: '1.0.0', versiones: [resumen('1.0.0', true)] } as ListaVersiones)
  repo.getVersion.mockImplementation(async v => version(v ?? '1.0.0'))
  repo.getModelo.mockImplementation(async v => modelo(v ?? '1.0.0'))
  repo.getMcda.mockResolvedValue({ mcda_version: '1.0.2' } as ResumenMcda)
  repo.getTamizaje.mockResolvedValue({ estado_tamizaje: { apto_tamizaje: 2192 } } as unknown as ResumenTamizaje)
})

describe('useMLStore — lectura del paquete importado', () => {
  it('carga versión activa, modelo, MCDA, tamizaje y versiones', async () => {
    const s = useMLStore()
    await s.fetchPanel()
    expect(s.activa?.paquete_version).toBe('1.0.0')
    expect(s.modelo?.modelo_version).toBe('propension-1.0.0')
    expect(s.mcda?.mcda_version).toBe('1.0.2')
    expect(s.tamizaje?.estado_tamizaje.apto_tamizaje).toBe(2192)
    expect(s.listaVersiones).toHaveLength(1)
    expect(s.puedeComparar).toBe(false)
    expect(s.loading).toBe(false)
    expect(s.error).toBeNull()
  })

  it('si falla un bloque, los demás se muestran y el error queda en ese bloque', async () => {
    repo.getMcda.mockRejectedValue({ response: { status: 500 } })
    const s = useMLStore()
    await s.fetchPanel()
    expect(s.activa).not.toBeNull()
    expect(s.mcda).toBeNull()
    expect(s.errores.mcda).toBeTruthy()
    expect(s.error).toBeNull()
  })

  it('si fallan todos, muestra un error general', async () => {
    for (const f of [repo.getVersiones, repo.getVersion, repo.getModelo, repo.getMcda, repo.getTamizaje]) f.mockRejectedValue({ message: 'Network Error' })
    const s = useMLStore()
    await s.fetchPanel()
    expect(s.error).toBe('No se pudo conectar con el servidor.')
  })

  it('compara dos versiones pidiendo cada una con ?version=', async () => {
    repo.getVersiones.mockResolvedValue({ activa: '1.0.0', versiones: [resumen('1.0.0', true), resumen('1.1.0', false)] })
    const s = useMLStore()
    await s.fetchPanel()
    expect(s.puedeComparar).toBe(true)
    await s.fetchCompare('1.0.0', '1.1.0')
    expect(repo.getVersion).toHaveBeenCalledWith('1.1.0')
    expect(repo.getModelo).toHaveBeenCalledWith('1.1.0')
    expect(s.compareResult?.a.version.paquete_version).toBe('1.0.0')
    expect(s.compareResult?.b.modelo?.modelo_version).toBe('propension-1.1.0')
    s.clearCompare()
    expect(s.compareResult).toBeNull()
  })

  it('una versión que no está importada deja el mensaje del backend', async () => {
    repo.getVersion.mockRejectedValueOnce({ response: { status: 404, data: { detail: 'la versión 9.9.9 no está importada' } } })
    const s = useMLStore()
    await s.fetchCompare('9.9.9', '1.0.0')
    expect(s.compareError).toBe('la versión 9.9.9 no está importada')
  })

  it('clearData vacía el panel e ignora respuestas que lleguen después', async () => {
    let soltar!: (v: VersionActiva) => void
    repo.getVersion.mockReturnValueOnce(new Promise(r => { soltar = r }))
    const s = useMLStore()
    const carga = s.fetchPanel()
    s.clearData()
    soltar(version('1.0.0'))
    await carga
    expect(s.activa).toBeNull()
    expect(s.modelo).toBeNull()
    expect(s.loading).toBe(false)
  })
})
