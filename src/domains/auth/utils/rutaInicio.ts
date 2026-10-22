import type { User } from '../entities/User'

// Pantalla de entrada tras el login. Admin y analista ven los resultados V1; el resto de roles
// (ciudadano) no tiene acceso a /api/v1/analisis/* y va al mapa público.
export function rutaInicio(role: User['role'] | undefined): 'analisis-v1' | 'puntos' {
  return role === 'admin' || role === 'analista' ? 'analisis-v1' : 'puntos'
}
