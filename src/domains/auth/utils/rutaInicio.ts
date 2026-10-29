import type { User } from '../entities/User'

// Pantalla de entrada tras el login. Admin y analista ven Análisis (resultados V1); el resto de roles
// (ciudadano) no tiene acceso a /api/v1/analisis/* y va al mapa público.
export function rutaInicio(role: User['role'] | undefined): 'analisis' | 'puntos' {
  return role === 'admin' || role === 'analista' ? 'analisis' : 'puntos'
}
