import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ConfirmacionesAviso from './ConfirmacionesAviso.vue'
import { AvisosRepository } from '@/domains/avisos/repositories/AvisosRepository'
import { AVISOS_AYUDA } from '@/domains/analisis-v1/components/avisoAyuda'

vi.mock('@/domains/avisos/repositories/AvisosRepository', () => ({ AvisosRepository: { getConfirmaciones: vi.fn() } }))
const getConfirmaciones = vi.mocked(AvisosRepository.getConfirmaciones)

const ana = { user_id: 1, email: 'ana@ecolima.pe', full_name: 'Ana Analista', role: 'analista' as const }
const beto = { user_id: 2, email: 'beto@ecolima.pe', full_name: null, role: 'admin' as const }
const fecha = '2026-11-02T15:30:00Z'
// Respuesta por clave: Ana leyó las tres secciones; Beto solo «Fuentes y limitaciones».
function porClave(a: { clave: string }) {
  return Promise.resolve([
    { ...ana, confirmado: true, confirmado_en: fecha },
    { ...beto, confirmado: a.clave === 'fuentes-limitaciones', confirmado_en: a.clave === 'fuentes-limitaciones' ? fecha : null },
  ])
}

beforeEach(() => { getConfirmaciones.mockReset() })

describe('ConfirmacionesAviso (vista de administrador)', () => {
  it('hace una llamada por sección y muestra una columna por sección', async () => {
    getConfirmaciones.mockImplementation(porClave)
    const w = mount(ConfirmacionesAviso)
    await flushPromises()
    expect(getConfirmaciones.mock.calls.map(c => c[0])).toEqual([AVISOS_AYUDA.orden, AVISOS_AYUDA.fuentes, AVISOS_AYUDA.modelo])
    expect(w.findAll('thead th').map(t => t.text())).toEqual(['Usuario', 'Rol', 'Cómo se ordenan', 'Fuentes y limitaciones', 'Acerca del modelo'])
    expect(w.find('[data-prueba="resumen-lecturas"]').text()).toContain('Cómo se ordenan (v1): 1 de 2')
    expect(w.find('[data-prueba="resumen-lecturas"]').text()).toContain('Fuentes y limitaciones (v1): 2 de 2')
  })

  it('por cuenta: «Leída» con fecha o «Pendiente», y primero quien tiene más pendientes', async () => {
    getConfirmaciones.mockImplementation(porClave)
    const w = mount(ConfirmacionesAviso)
    await flushPromises()
    const filas = w.findAll('tbody tr')
    expect(filas.map(f => f.attributes('data-usuario'))).toEqual(['beto@ecolima.pe', 'ana@ecolima.pe'])
    const celda = (fila: number, s: string) => filas[fila].find(`[data-seccion="${s}"]`).text()
    expect(celda(0, 'orden')).toBe('Pendiente')
    expect(celda(0, 'fuentes')).toMatch(/^Leída.*2026/)
    expect(celda(0, 'modelo')).toBe('Pendiente')
    expect(celda(1, 'modelo')).toMatch(/^Leída.*2026/)
  })

  it('si el servicio falla, muestra el error con role="alert" y permite actualizar', async () => {
    getConfirmaciones.mockImplementationOnce(() => Promise.reject(new Error('403'))).mockImplementation(porClave)
    const w = mount(ConfirmacionesAviso)
    await flushPromises()
    expect(w.find('[role="alert"]').text()).toBe('No se pudo cargar quién leyó la ayuda.')
    const actualizar = w.findAll('button').find(b => b.text().includes('Actualizar'))
    if (!actualizar) throw new Error('no hay botón «Actualizar»')
    await actualizar.trigger('click')
    await flushPromises()
    expect(w.findAll('tbody tr')).toHaveLength(2)
  })
})
