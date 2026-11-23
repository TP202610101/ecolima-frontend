import api from '@/shared/api/axios'
import { respuestaHttp } from '@/domains/auth/utils/respuestaHttp'
import type { ResultadoCreacion, ResultadoValidacion } from '../entities/CargaMasiva'

// Errores de la carga en bloque, ya clasificados para la vista.
//  - filas:   el servidor revalidó y encontró filas con error (409 al confirmar); trae la validación.
//  - archivo: archivo ilegible o fuera de límites (422), con el mensaje del servidor.
//  - limite:  demasiadas solicitudes (429).
//  - permiso: la cuenta no es administradora (403).
//  - red:     el servidor no respondió.
export type TipoErrorCarga = 'filas' | 'archivo' | 'limite' | 'permiso' | 'red' | 'otro'

export class ErrorCargaMasiva extends Error {
  constructor(
    readonly tipo: TipoErrorCarga,
    message: string,
    readonly codigo?: string,
    readonly validacion?: ResultadoValidacion,
  ) {
    super(message)
  }
}

const MENSAJES: Record<Exclude<TipoErrorCarga, 'filas' | 'archivo'>, string> = {
  limite: 'Se alcanzó el límite de solicitudes. Espera unos minutos e intenta de nuevo.',
  permiso: 'Tu cuenta no tiene permiso para crear usuarios.',
  red: 'No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.',
  otro: 'No se pudo procesar el archivo. Intenta de nuevo.',
}

// FastAPI puede enviar el cuerpo tal cual o dentro de «detail»: se aceptan las dos formas.
function cuerpo(data: unknown): Record<string, unknown> {
  const d = (data ?? {}) as Record<string, unknown>
  return d.detail && typeof d.detail === 'object' ? (d.detail as Record<string, unknown>) : d
}

function clasificar(error: unknown): ErrorCargaMasiva {
  const r = respuestaHttp(error)
  if (!r) return new ErrorCargaMasiva('red', MENSAJES.red)
  const c = cuerpo(r.data)
  if (r.status === 409 && Array.isArray(c.rows)) {
    return new ErrorCargaMasiva('filas', 'El servidor encontró filas con error. No se creó ningún usuario.', undefined, c as unknown as ResultadoValidacion)
  }
  if (r.status === 422) {
    return new ErrorCargaMasiva('archivo', typeof c.message === 'string' ? c.message : 'El archivo no se pudo leer.', typeof c.code === 'string' ? c.code : undefined)
  }
  if (r.status === 429) return new ErrorCargaMasiva('limite', MENSAJES.limite)
  if (r.status === 403) return new ErrorCargaMasiva('permiso', MENSAJES.permiso)
  return new ErrorCargaMasiva('otro', MENSAJES.otro)
}

function formulario(archivo: File): FormData {
  const f = new FormData()
  f.append('file', archivo)
  return f
}

export const CargaMasivaRepository = {
  /** Valida el CSV sin crear nada. */
  async validar(archivo: File): Promise<ResultadoValidacion> {
    try {
      return (await api.post('/api/v1/admin/users/bulk/validate', formulario(archivo))).data
    } catch (e) {
      throw clasificar(e)
    }
  },

  /** Crea los usuarios con el mismo archivo (el servidor lo revalida). */
  async confirmar(archivo: File): Promise<ResultadoCreacion> {
    try {
      return (await api.post('/api/v1/admin/users/bulk/confirm', formulario(archivo))).data
    } catch (e) {
      throw clasificar(e)
    }
  },
}
