import api from '@/shared/api/axios'
import type {
  DetalleSitio,
  DistritosGeoJSON,
  FiltrosV1,
  Fuente,
  ModeloV1,
  PaginaSitios,
  ResumenMcda,
  ResumenTamizaje,
  SitiosGeoJSON,
  VersionActiva,
} from '../entities/AnalisisV1'

const BASE = '/api/v1/analisis'

// Mismos filtros para el mapa y la tabla: así el conteo de ambos coincide.
export function paramsFiltros(f: FiltrosV1): Record<string, string | boolean> {
  const p: Record<string, string | boolean> = {}
  if (f.ubigeo) p.ubigeo = f.ubigeo
  if (f.estado_tamizaje) p.estado_tamizaje = f.estado_tamizaje
  if (f.solo_top_k) p.en_top_k = true
  return p
}

export const AnalisisV1Repository = {
  /** Versión activa; null si el backend no tiene ninguna importada (404). */
  async getVersionActiva(): Promise<VersionActiva | null> {
    const res = await api.get(`${BASE}/versiones/activa`, {
      validateStatus: s => s === 200 || s === 404,
    })
    return res.status === 404 ? null : res.data
  },

  async getSitios(filtros: FiltrosV1, limit: number, offset: number): Promise<PaginaSitios> {
    const res = await api.get(`${BASE}/sitios`, {
      params: { ...paramsFiltros(filtros), orden: 'rango', limit, offset },
    })
    return res.data
  },

  /** Todos los sitios de la versión activa (paginando de 500 en 500, el máximo de la API), ordenados por rango. */
  async getTodosLosSitios(): Promise<{ total: number; version: string; items: PaginaSitios['items'] }> {
    const limit = 500
    const primera: PaginaSitios = (await api.get(`${BASE}/sitios`, { params: { orden: 'rango', limit, offset: 0 } })).data
    const resto = await Promise.all(
      Array.from({ length: Math.ceil(primera.total / limit) - 1 }, (_, i) =>
        api.get(`${BASE}/sitios`, { params: { orden: 'rango', limit, offset: (i + 1) * limit } }).then(r => r.data as PaginaSitios)),
    )
    const items = [primera, ...resto].flatMap(p => p.items)
    if (items.length !== primera.total) throw new Error('Respuesta incompleta de /sitios')
    if (resto.some(p => p.paquete_version !== primera.paquete_version)) throw new Error('La versión cambió durante la carga')
    return { total: primera.total, version: primera.paquete_version, items }
  },

  async getTamizaje(): Promise<ResumenTamizaje> {
    const res = await api.get(`${BASE}/tamizaje`)
    return res.data
  },

  async getSitiosGeoJSON(filtros: FiltrosV1): Promise<SitiosGeoJSON> {
    const res = await api.get(`${BASE}/sitios/geojson`, { params: paramsFiltros(filtros) })
    return res.data
  },

  async getSitio(sitioId: string): Promise<DetalleSitio> {
    const res = await api.get(`${BASE}/sitios/${encodeURIComponent(sitioId)}`)
    return res.data
  },

  async getDistritos(): Promise<DistritosGeoJSON> {
    const res = await api.get(`${BASE}/distritos`, { params: { simplificar: 0.0002 } })
    return res.data
  },

  async getFuentes(): Promise<Fuente[]> {
    const res = await api.get(`${BASE}/fuentes`)
    return res.data.fuentes
  },

  async getModelo(): Promise<ModeloV1> {
    const res = await api.get(`${BASE}/modelo`)
    return res.data
  },

  async getMcda(): Promise<ResumenMcda> {
    const res = await api.get(`${BASE}/mcda`)
    return res.data
  },
}
