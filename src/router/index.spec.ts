import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/domains/auth/stores/useAuthStore'
import type { User } from '@/domains/auth/entities/User'

// Las vistas reales cargan MapLibre y Chart.js; aquí solo importa a qué ruta se llega.
const vista = { template: '<div />' }
vi.mock('@/domains/auth/views/LoginView.vue', () => ({ default: vista }))
vi.mock('@/domains/admin/views/AdminUsersView.vue', () => ({ default: vista }))
vi.mock('@/domains/public/views/PublicMapView.vue', () => ({ default: vista }))
vi.mock('@/domains/ml-panel/views/MLPanelView.vue', () => ({ default: vista }))
vi.mock('@/domains/analisis-v1/views/AnalisisV1View.vue', () => ({ default: vista }))
vi.mock('@/domains/analisis-v1/views/ReportesV1View.vue', () => ({ default: vista }))

const tokenVigente = () => `x.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.y`
const usuario = (role: User['role']): User => ({ user_id: 1, email: 'a@b.pe', full_name: 'A', role })

async function navegar(ruta: string, role?: User['role']) {
  vi.resetModules()
  setActivePinia(createPinia())
  if (role) useAuthStore().setSession(usuario(role), tokenVigente())
  const { default: router } = await import('./index')
  await router.push(ruta)
  return router.currentRoute.value
}

beforeEach(() => localStorage.clear())

describe('router — vistas viejas de Análisis y Reportes', () => {
  it.each([
    ['/analisis', 'analisis-v1'],
    ['/reportes', 'reportes-v1'],
  ])('%s lleva a %s', async (ruta, destino) => {
    expect((await navegar(ruta, 'analista')).name).toBe(destino)
  })

  it('sin sesión, las rutas viejas piden login', async () => {
    expect((await navegar('/analisis')).name).toBe('login')
  })

  it('un ciudadano que entra a una ruta V1 va al mapa público, sin bucle', async () => {
    expect((await navegar('/analisis', 'ciudadano')).name).toBe('puntos')
  })

  it('con sesión de analista, /login lleva a Análisis V1', async () => {
    expect((await navegar('/', 'analista')).name).toBe('analisis-v1')
  })
})

describe('router — Panel ML y Usuarios, solo admin', () => {
  it('admin entra al Panel ML', async () => {
    expect((await navegar('/panel-ml', 'admin')).name).toBe('panel-ml')
  })

  it('un analista que escribe /panel-ml vuelve a Análisis V1', async () => {
    expect((await navegar('/panel-ml', 'analista')).name).toBe('analisis-v1')
  })

  it('un ciudadano que escribe /panel-ml va al mapa público', async () => {
    expect((await navegar('/panel-ml', 'ciudadano')).name).toBe('puntos')
  })

  it('sin sesión, /panel-ml pide login', async () => {
    expect((await navegar('/panel-ml')).name).toBe('login')
  })

  it('Usuarios sigue siendo solo para admin', async () => {
    expect((await navegar('/admin/usuarios', 'admin')).name).toBe('admin-usuarios')
    expect((await navegar('/admin/usuarios', 'analista')).name).toBe('analisis-v1')
  })
})
