import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '@/domains/auth/views/LoginView.vue'
import AnalysisView from '@/domains/map/views/AnalysisView.vue'
import ReportsView from '@/domains/reports/views/ReportsView.vue'
import MLPanelView from '@/domains/ml-panel/views/MLPanelView.vue'
import PublicMapView from '@/domains/public/views/PublicMapView.vue'
import { useAuthStore } from '@/domains/auth/stores/useAuthStore'

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
  { path: '/analisis', name: 'analisis', component: AnalysisView, meta: { requiresAuth: true } },
  { path: '/reportes', name: 'reportes', component: ReportsView,  meta: { requiresAuth: true } },
  { path: '/panel-ml', name: 'panel-ml', component: MLPanelView,  meta: { requiresAuth: true, requiresAdmin: true } },
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

  if (to.name === 'login' && auth.isAuthenticated) return next({ name: 'analisis' })
  if ((to.meta as any).requiresAuth && !auth.isAuthenticated) return next({ name: 'login' })
  if ((to.meta as any).requiresAdmin && auth.user?.role !== 'admin') return next({ name: 'analisis' })
  next()
})

export default router
