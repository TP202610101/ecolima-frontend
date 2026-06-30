import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from './useAuthStore'

const mockUser = {
  user_id: 1,
  email: 'admin@ecolima.pe',
  full_name: 'Admin EcoLima',
  role: 'admin' as const,
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

describe('useAuthStore — estado inicial', () => {
  it('inicia sin usuario autenticado', () => {
    const store = useAuthStore()
    expect(store.user).toBeNull()
    expect(store.token).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })

  it('isAdmin es false sin usuario', () => {
    const store = useAuthStore()
    expect(store.isAdmin).toBe(false)
  })
})

describe('useAuthStore — setSession', () => {
  it('guarda usuario y token en el estado', () => {
    const store = useAuthStore()
    store.setSession(mockUser, 'token-abc')
    expect(store.user).toEqual(mockUser)
    expect(store.token).toBe('token-abc')
  })

  it('isAuthenticated es true tras setSession', () => {
    const store = useAuthStore()
    store.setSession(mockUser, 'token-abc')
    expect(store.isAuthenticated).toBe(true)
  })

  it('isAdmin es true para usuario con role admin', () => {
    const store = useAuthStore()
    store.setSession(mockUser, 'token-abc')
    expect(store.isAdmin).toBe(true)
  })

  it('persiste el token y el usuario en localStorage', () => {
    const store = useAuthStore()
    store.setSession(mockUser, 'token-abc')
    expect(localStorage.getItem('access_token')).toBe('token-abc')
    expect(JSON.parse(localStorage.getItem('user')!)).toEqual(mockUser)
  })
})

describe('useAuthStore — clearSession', () => {
  it('limpia el estado y localStorage', () => {
    const store = useAuthStore()
    store.setSession(mockUser, 'token-abc')
    store.clearSession()
    expect(store.user).toBeNull()
    expect(store.token).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(localStorage.getItem('access_token')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
  })
})

describe('useAuthStore — initFromStorage', () => {
  it('restaura la sesión desde localStorage', () => {
    localStorage.setItem('access_token', 'token-stored')
    localStorage.setItem('user', JSON.stringify(mockUser))
    const store = useAuthStore()
    store.initFromStorage()
    expect(store.token).toBe('token-stored')
    expect(store.user).toEqual(mockUser)
    expect(store.isAuthenticated).toBe(true)
  })

  it('no falla si localStorage está vacío', () => {
    const store = useAuthStore()
    store.initFromStorage()
    expect(store.user).toBeNull()
    expect(store.token).toBeNull()
  })

  it('limpia localStorage si el JSON de user está corrupto', () => {
    localStorage.setItem('access_token', 'token-stored')
    localStorage.setItem('user', 'json-invalido{{{')
    const store = useAuthStore()
    store.initFromStorage()
    expect(store.user).toBeNull()
    expect(store.token).toBeNull()
    expect(localStorage.getItem('access_token')).toBeNull()
  })
})
