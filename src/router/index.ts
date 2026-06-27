import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '@/domains/auth/views/LoginView.vue'
import AnalysisView from '@/domains/map/views/AnalysisView.vue'
import ReportsView from '@/domains/reports/views/ReportsView.vue'
import MLPanelView from '@/domains/ml-panel/views/MLPanelView.vue'
import { useAuthStore } from '@/domains/auth/stores/useAuthStore'

const routes = [
  { path: '/',         name: 'login',    component: LoginView,    meta: { requiresAuth: false, hideNavbar: true } },
  { path: '/analisis', name: 'analisis', component: AnalysisView, meta: { requiresAuth: true } },
  { path: '/reportes', name: 'reportes', component: ReportsView,  meta: { requiresAuth: true } },
  { path: '/panel-ml', name: 'panel-ml', component: MLPanelView,  meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/:pathMatch(.*)*', redirect: { name: 'login' } },
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
  if (to.name === 'login' && auth.isAuthenticated) return next({ name: 'analisis' })
  if ((to.meta as any).requiresAuth && !auth.isAuthenticated) return next({ name: 'login' })
  if ((to.meta as any).requiresAdmin && auth.user?.role !== 'admin') return next({ name: 'analisis' })
  next()
})

export default router
