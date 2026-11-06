import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/domains/auth/stores/useAuthStore'
import type { User } from '@/domains/auth/entities/User'

// Las vistas reales cargan MapLibre y Chart.js; aquí solo importa a qué ruta se llega.
const vista = { template: '<div />' }
const { mostrarToast } = vi.hoisted(() => ({ mostrarToast: vi.fn() }))
vi.mock('@/shared/composables/useToast', () => ({ mostrarToast }))
vi.mock('@/domains/auth/views/LoginView.vue', () => ({ default: vista }))
vi.mock('@/domains/auth/views/RecuperarContrasenaView.vue', () => ({ default: vista }))
vi.mock('@/domains/auth/views/RestablecerContrasenaView.vue', () => ({ default: vista }))
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

describe('router — Análisis y Reportes sin versión en la URL', () => {
  it.each([
    ['/analisis', 'analisis', '/analisis'],
    ['/reportes', 'reportes', '/reportes'],
    ['/analisis-v1', 'analisis', '/analisis'],
    ['/reportes-v1', 'reportes', '/reportes'],
  ])('%s abre %s en %s', async (ruta, destino, path) => {
    const r = await navegar(ruta, 'analista')
    expect(r.name).toBe(destino)
    expect(r.fullPath).toBe(path)
  })

  it('la URL anterior se reemplaza en el historial, no se apila', async () => {
    vi.resetModules()
    setActivePinia(createPinia())
    useAuthStore().setSession(usuario('analista'), tokenVigente())
    const { default: router } = await import('./index')
    await router.push('/reportes-v1')
    expect(router.currentRoute.value.redirectedFrom?.fullPath).toBe('/reportes-v1')
    expect(history.state.current).toBe('/reportes')
  })

  it('sin sesión, las rutas viejas piden login', async () => {
    expect((await navegar('/analisis')).name).toBe('login')
  })

  it('un ciudadano que entra a una ruta V1 va al mapa público, sin bucle', async () => {
    expect((await navegar('/analisis', 'ciudadano')).name).toBe('puntos')
  })

  it('con sesión de analista, /login lleva a Análisis V1', async () => {
    expect((await navegar('/', 'analista')).name).toBe('analisis')
  })
})

describe('router — Panel ML y Usuarios, solo admin', () => {
  it('admin entra al Panel ML', async () => {
    expect((await navegar('/panel-ml', 'admin')).name).toBe('panel-ml')
  })

  it('un analista que escribe /panel-ml vuelve a Análisis V1', async () => {
    expect((await navegar('/panel-ml', 'analista')).name).toBe('analisis')
  })

  it('un ciudadano que escribe /panel-ml va al mapa público', async () => {
    expect((await navegar('/panel-ml', 'ciudadano')).name).toBe('puntos')
  })

  it('sin sesión, /panel-ml pide login', async () => {
    expect((await navegar('/panel-ml')).name).toBe('login')
  })

  it('Usuarios sigue siendo solo para admin', async () => {
    expect((await navegar('/admin/usuarios', 'admin')).name).toBe('admin-usuarios')
    expect((await navegar('/admin/usuarios', 'analista')).name).toBe('analisis')
  })
})

describe('router — recuperar contraseña', () => {
  it.each([
    ['/recuperar', 'recuperar'],
    ['/restablecer?token=abc', 'restablecer'],
  ])('sin sesión, %s se abre', async (ruta, destino) => {
    const r = await navegar(ruta)
    expect(r.name).toBe(destino)
  })

  it('el token del enlace se conserva en la URL', async () => {
    expect((await navegar('/restablecer?token=abc')).query.token).toBe('abc')
  })

  it.each([
    ['/recuperar', 'analista', 'analisis'],
    ['/restablecer?token=abc', 'admin', 'analisis'],
    ['/recuperar', 'ciudadano', 'puntos'],
  ])('con sesión, %s redirige como el login (%s → %s)', async (ruta, role, destino) => {
    expect((await navegar(ruta, role as User['role'])).name).toBe(destino)
  })

  it('con una sesión vencida, el enlace de restablecer no se pierde', async () => {
    vi.resetModules()
    setActivePinia(createPinia())
    const vencido = `x.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 60 }))}.y`
    useAuthStore().setSession(usuario('analista'), vencido)
    const { default: router } = await import('./index')
    await router.push('/restablecer?token=abc')
    expect(router.currentRoute.value.name).toBe('restablecer')
    expect(router.currentRoute.value.query.token).toBe('abc')
    expect(useAuthStore().isAuthenticated).toBe(false)
  })
})

describe('router — aviso por falta de permiso', () => {
  const AVISO = 'No tienes permiso para abrir esa pantalla.'
  beforeEach(() => { mostrarToast.mockClear() })

  it.each([
    ['/panel-ml', 'analista', 'analisis'],
    ['/admin/usuarios', 'analista', 'analisis'],
    ['/panel-ml', 'ciudadano', 'puntos'],
    ['/analisis', 'ciudadano', 'puntos'],
    ['/reportes', 'ciudadano', 'puntos'],
    ['/analisis-v1', 'ciudadano', 'puntos'],
  ] as const)('%s con rol %s: va a %s y avisa una sola vez', async (ruta, role, destino) => {
    const r = await navegar(ruta, role)
    expect(r.name).toBe(destino)
    expect(mostrarToast).toHaveBeenCalledExactlyOnceWith(AVISO)
  })

  it.each([
    ['/panel-ml', 'admin'],
    ['/admin/usuarios', 'admin'],
    ['/analisis', 'analista'],
    ['/reportes', 'analista'],
    ['/puntos', 'ciudadano'],
  ] as const)('%s con rol %s: entra sin aviso', async (ruta, role) => {
    const r = await navegar(ruta, role)
    expect(r.path).toBe(ruta)
    expect(mostrarToast).not.toHaveBeenCalled()
  })

  it('sin sesión va al login sin este aviso', async () => {
    const r = await navegar('/panel-ml')
    expect(r.name).toBe('login')
    expect(r.query.expired).toBeUndefined()
    expect(mostrarToast).not.toHaveBeenCalled()
  })

  it('con el token vencido va al login con su propio mensaje, sin este aviso', async () => {
    vi.resetModules()
    setActivePinia(createPinia())
    const vencido = `x.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 60 }))}.y`
    useAuthStore().setSession(usuario('analista'), vencido)
    const { default: router } = await import('./index')
    await router.push('/panel-ml')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.expired).toBe('true')
    expect(mostrarToast).not.toHaveBeenCalled()
  })

  it('con sesión, abrir el login redirige al inicio sin aviso: no es falta de permiso', async () => {
    const r = await navegar('/', 'analista')
    expect(r.name).toBe('analisis')
    expect(mostrarToast).not.toHaveBeenCalled()
  })
})
