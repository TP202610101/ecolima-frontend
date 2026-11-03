import { describe, it, expect } from 'vitest'
import { REQUISITOS_CONTRASENA, cumplePolitica, revisarContrasena } from './politicaContrasena'

describe('política de contraseñas', () => {
  it('exige 8 caracteres, mayúscula, minúscula y número (igual que el backend)', () => {
    expect(revisarContrasena('abc')).toEqual({ length: false, upper: false, lower: true, number: false })
    expect(cumplePolitica(revisarContrasena('nueva1234'))).toBe(false)
    expect(cumplePolitica(revisarContrasena('Nueva1234'))).toBe(true)
  })
  it('los textos de los requisitos son los de «Crear usuario»', () => {
    expect(REQUISITOS_CONTRASENA.map(r => r.texto)).toEqual(['8 caracteres mínimo', 'Una mayúscula', 'Una minúscula', 'Un número'])
  })
})
