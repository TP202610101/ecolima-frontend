import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import PanelLugarV1 from './PanelLugarV1.vue'
import { useExploracionV1Store } from '../stores/useExploracionV1Store'
import { construirLugares } from '../utils/lecturaV1'
import type { DetalleSitio, DistritosGeoJSON, SitioResumen, VersionActiva } from '../entities/AnalisisV1'

vi.mock('../repositories/AnalisisV1Repository', () => ({ AnalisisV1Repository: { getSitio: vi.fn() } }))

const SI = '150131'
const s = (id: string, rango: number): SitioResumen => ({
  sitio_id: id, lon: -77.03, lat: -12.09, ubigeo: SI, distrito: 'SAN ISIDRO', clase_oportunidad: 'paradero_transporte_publico', rol: 'fondo',
  estado_tamizaje: 'apto_tamizaje', codigo_exclusion: null, propension_percentil: 0.37, mcda: { puntaje: 0.44, rango, en_top_k: false },
  mc_frecuencia_top_k: 0.03, dist_punto_existente_m: 740, punto_existente_mas_cercano: 'POS-SI-ER06',
  criterios_mcda: {
    K1_demanda: { bruto: 11000 - rango, norm: 0.4 }, K2_generacion: { bruto: 11300 - rango, norm: 0.4 },
    K3_brecha: { bruto: 740, norm: 0.02 }, K4_accesibilidad: { bruto: 35 - rango / 100, norm: 0.9 },
  },
})
const ex: SitioResumen = { ...s('POS-SI-ER06', 1), rol: 'positivo', estado_tamizaje: 'punto_existente', mcda: null, criterios_mcda: null, dist_punto_existente_m: null, punto_existente_mas_cercano: null, lon: -77.035, lat: -12.095 }
const detalle = {
  sitio_id: 'A', tamizaje: {
    estado_tamizaje: 'apto_tamizaje', reglas: { T01_territorio: 'cumple', T05_sin_punto_existente_30m: 'cumple' },
    dist_punto_existente_m: 740, punto_existente_mas_cercano: 'POS-SI-ER06', codigo_exclusion: null, motivo_exclusion: null,
    controles_campo: { C02: 'pendiente_campo', C03: 'pendiente_campo', C04: 'pendiente_campo', C05: 'pendiente_campo', C06: 'pendiente_campo', C07: 'pendiente_campo', C08: 'pendiente_campo', C09: 'pendiente_campo' },
    estado_verificacion_campo: 'pendiente_campo',
  },
} as unknown as DetalleSitio

function montar() {
  setActivePinia(createPinia())
  const st = useExploracionV1Store()
  st.version = { paquete_version: '1.0.0', mcda: { top_k: 110 } } as unknown as VersionActiva
  st.distritos = { type: 'FeatureCollection', features: [{ type: 'Feature', id: SI, geometry: null, properties: { ubigeo: SI, nombre: 'SAN ISIDRO', n_sitios: 7, n_apto_tamizaje: 6, n_excluido_tamizaje: 0, n_punto_existente: 1, n_top_k: 0 } }] } as unknown as DistritosGeoJSON
  st.lugares = construirLugares([s('A', 838), s('B', 900), s('C', 950), s('D', 1000), s('E', 1100), s('F', 1200), ex])
  st.ambito = SI
  st.selId = 'A'
  st.detalle = detalle
  return { st, w: mount(PanelLugarV1) }
}

describe('PanelLugarV1', () => {
  beforeEach(() => { localStorage.clear() })

  it('resumen inicial con los datos pedidos y sin jerga técnica', () => {
    const { w } = montar()
    const t = w.text()
    for (const x of ['Paradero de transporte público', 'San Isidro', 'Sin nombre en el paquete V1.0.0', 'Superó la revisión preliminar',
      'Orden de revisión en San Isidro', '1.º', 'de 6', 'No está entre los 110 primeros de Lima', 'Puesto 838 de',
      '¿Por qué ocupa esta posición?', 'Punto de reciclaje registrado más cercano', '740 m', 'Estación ER06 del plan de San Isidro',
      'Verificaciones pendientes', '8 de 8', 'no está aprobado ni autorizado', 'Ver más detalles']) {
      expect(t).toContain(x)
    }
    expect(t).not.toMatch(/ROC|AUC|propensi|puntaje|Monte Carlo|MCDA|\bAlta\b|\bMedia\b|\bBaja\b/)
  })

  it('«Ver más detalles» está plegado al inicio y despliega el resto', async () => {
    const { w, st } = montar()
    const det = w.find('[data-prueba="detalles"]')
    expect((det.element as HTMLElement).style.display).toBe('none')
    await w.find('[data-prueba="mas-detalles"]').trigger('click')
    expect(st.masDetalles).toBe(true)
    expect((det.element as HTMLElement).style.display).toBe('')
    expect(det.text()).toContain('Factores considerados')
    expect(det.text()).toContain('Disponibilidad pública, administración y autorización')
    expect(det.text()).toContain('Código del lugar')
    expect(det.text()).toContain('no significa que sea viable')
  })
})
