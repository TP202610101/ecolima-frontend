// Política de contraseñas: la misma que valida el backend (app/core/security.py, validate_password_strength).
// La usan «Crear usuario» y «Restablecer contraseña».
export interface ChequeosContrasena {
  length: boolean
  upper: boolean
  lower: boolean
  number: boolean
}

export const REQUISITOS_CONTRASENA: Array<{ k: keyof ChequeosContrasena; texto: string }> = [
  { k: 'length', texto: '8 caracteres mínimo' },
  { k: 'upper', texto: 'Una mayúscula' },
  { k: 'lower', texto: 'Una minúscula' },
  { k: 'number', texto: 'Un número' },
]

export function revisarContrasena(password: string): ChequeosContrasena {
  return {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  }
}

export const cumplePolitica = (c: ChequeosContrasena) => c.length && c.upper && c.lower && c.number
