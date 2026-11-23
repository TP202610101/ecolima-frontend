import axios from 'axios'

// Respuesta HTTP de un error de la API. El 401 llega tal cual desde axios; el resto trae la respuesta
// original en cause (ver shared/api/axios.ts). Sin respuesta = el servidor no contestó (red, CORS, caída).
export interface RespuestaHttp { status: number; data?: unknown }

export function respuestaHttp(error: unknown): RespuestaHttp | null {
  const e = error as { response?: RespuestaHttp; cause?: { response?: RespuestaHttp } } | null
  return e?.response ?? e?.cause?.response ?? null
}

// La petición salió pero el servidor no contestó (red, CORS, caída, tiempo agotado): el interceptor deja el error de
// axios en cause, sin respuesta. Otros errores (p. ej. de programación) no cuentan como problema de conexión.
export function sinRespuestaServidor(error: unknown): boolean {
  const causa = (error as { cause?: unknown } | null)?.cause
  return axios.isAxiosError(causa) && !causa.response
}
