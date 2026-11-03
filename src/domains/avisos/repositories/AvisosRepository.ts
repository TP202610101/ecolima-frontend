import api from '@/shared/api/axios'
import type { ConfirmacionUsuario, EstadoAviso } from '../entities/Aviso'

interface ClaveVersion { clave: string; version: string }

// El contrato del backend se define en paralelo: la lista de confirmaciones se acepta como arreglo,
// como { usuarios } o como { confirmados, pendientes }, y siempre se devuelve como una sola lista.
type RespuestaConfirmaciones =
  | ConfirmacionUsuario[]
  | { usuarios: ConfirmacionUsuario[] }
  | { confirmados: ConfirmacionUsuario[]; pendientes: ConfirmacionUsuario[] }

function normalizar(data: RespuestaConfirmaciones): ConfirmacionUsuario[] {
  if (Array.isArray(data)) return data
  if ('usuarios' in data) return data.usuarios
  return [
    ...(data.confirmados ?? []).map(u => ({ ...u, confirmado: true })),
    ...(data.pendientes ?? []).map(u => ({ ...u, confirmado: false, confirmado_en: null })),
  ]
}

export const AvisosRepository = {
  async getEstado(aviso: ClaveVersion): Promise<EstadoAviso> {
    const res = await api.get('/api/v1/me/avisos', { params: { clave: aviso.clave, version: aviso.version } })
    return res.data
  },

  async confirmar(aviso: ClaveVersion): Promise<void> {
    await api.post('/api/v1/me/avisos/confirmar', { clave: aviso.clave, version: aviso.version })
  },

  async getConfirmaciones(aviso: ClaveVersion): Promise<ConfirmacionUsuario[]> {
    const res = await api.get('/api/v1/admin/avisos/confirmaciones', { params: { clave: aviso.clave, version: aviso.version } })
    return normalizar(res.data)
  },
}
