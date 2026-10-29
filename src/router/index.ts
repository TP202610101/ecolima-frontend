import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '@/domains/auth/views/LoginView.vue'
import MLPanelView from '@/domains/ml-panel/views/MLPanelView.vue'
import AdminUsersView from '@/domains/admin/views/AdminUsersView.vue'
import PublicMapView from '@/domains/public/views/PublicMapView.vue'
import AnalisisV1View from '@/domains/analisis-v1/views/AnalisisV1View.vue'
import ReportesV1View from '@/domains/analisis-v1/views/ReportesV1View.vue'
import { useAuthStore } from '@/domains/auth/stores/useAuthStore'
import { rutaInicio } from '@/domains/auth/utils/rutaInicio'

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

const routes = [
  { path: '/',         name: 'login',    component: LoginView,    meta: { requiresAuth: false, hideNavbar: true } },
  // Ruta pública sin auth — no redirige al login, no muestra el navbar interno.
  { path: '/puntos',   name: 'puntos',   component: PublicMapView, meta: { requiresAuth: false, hideNavbar: true } },
  // Resultados V1 importados del paquete versionado (/api/v1/analisis/*); el backend exige admin o analista.
  { path: '/analisis', name: 'analisis', component: AnalisisV1View, meta: { requiresAuth: true, roles: ['admin', 'analista'] } },
  { path: '/reportes', name: 'reportes', component: ReportesV1View, meta: { requiresAuth: true, roles: ['admin', 'analista'] } },
  // URLs anteriores de las vistas V1: se reemplazan en el historial por las rutas sin versión.
  { path: '/analisis-v1', redirect: { name: 'analisis' } },
  { path: '/reportes-v1', redirect: { name: 'reportes' } },
  { path: '/panel-ml',        name: 'panel-ml',        component: MLPanelView,    meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/admin/usuarios',  name: 'admin-usuarios',  component: AdminUsersView, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/:pathMatch(.*)*', redirect: { name: 'puntos' } },
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()

  // Rutas públicas explícitas — pasan sin ninguna comprobación de auth.
  if (to.name === 'puntos') return next()

  // Token en localStorage pero expirado → limpiar y mostrar banner
  if (auth.token && isTokenExpired(auth.token)) {
    auth.clearSession()
    return next({ name: 'login', query: { expired: 'true' } })
  }

  const inicio = rutaInicio(auth.user?.role)
  if (to.name === 'login' && auth.isAuthenticated) return next({ name: inicio })
  if ((to.meta as any).requiresAuth && !auth.isAuthenticated) return next({ name: 'login' })
  if ((to.meta as any).requiresAdmin && auth.user?.role !== 'admin') return next({ name: inicio })
  const roles = to.meta.roles as string[] | undefined
  if (roles && !roles.includes(auth.user?.role ?? '')) return next({ name: inicio })
  next()
})

export default router
