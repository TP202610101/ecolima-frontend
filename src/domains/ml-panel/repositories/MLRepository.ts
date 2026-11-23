import api from '@/shared/api/axios'
import type { ModeloV1, ResumenMcda, ResumenTamizaje, VersionActiva } from '@/domains/analisis-v1/entities/AnalisisV1'
import type { ListaVersiones } from '../entities/ModelVersion'

// Panel ML: solo lectura sobre los paquetes importados (/api/v1/analisis/*).
// Sin `version` se lee la versión activa; con `version` (paquete_version), esa versión.
const BASE = '/api/v1/analisis'
const conVersion = (version?: string) => (version ? { params: { version } } : undefined)

export const MLRepository = {
  async getVersiones(): Promise<ListaVersiones> {
    const res = await api.get(`${BASE}/versiones`)
    return res.data
  },

  async getVersion(version?: string): Promise<VersionActiva> {
    const res = await api.get(`${BASE}/versiones/activa`, conVersion(version))
    return res.data
  },

  async getModelo(version?: string): Promise<ModeloV1> {
    const res = await api.get(`${BASE}/modelo`, conVersion(version))
    return res.data
  },

  async getMcda(version?: string): Promise<ResumenMcda> {
    const res = await api.get(`${BASE}/mcda`, conVersion(version))
    return res.data
  },

  async getTamizaje(version?: string): Promise<ResumenTamizaje> {
    const res = await api.get(`${BASE}/tamizaje`, conVersion(version))
    return res.data
  },
}
