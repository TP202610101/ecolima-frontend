import { describe, it, expect, beforeEach } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { vi } from 'vitest'
import Navbar from './Navbar.vue'
import { useAuthStore } from '@/domains/auth/stores/useAuthStore'
import type { User } from '@/domains/auth/entities/User'

vi.mock('vue-router', () => ({ useRoute: () => ({ path: '/analisis-v1' }), useRouter: () => ({ push: vi.fn() }) }))

function enlaces(role: User['role']) {
  setActivePinia(createPinia())
  useAuthStore().setSession({ user_id: 1, email: 'a@b.pe', full_name: 'A B', role }, 'jwt')
  const w = mount(Navbar, { global: { stubs: { RouterLink: RouterLinkStub } } })
  return w.findAllComponents(RouterLinkStub).map(l => `${l.text()}→${l.props('to')}`)
}

beforeEach(() => localStorage.clear())

describe('Navbar', () => {
  it('admin ve Análisis, Reportes, Panel ML y Usuarios', () => {
    expect(enlaces('admin')).toEqual(['Análisis→/analisis-v1', 'Reportes→/reportes-v1', 'Panel ML→/panel-ml', 'Usuarios→/admin/usuarios'])
  })

  it('un analista no ve Panel ML ni Usuarios', () => {
    expect(enlaces('analista')).toEqual(['Análisis→/analisis-v1', 'Reportes→/reportes-v1'])
  })
})
