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
    for (const x of ['Paradero de transporte público en San Isidro', 'Código A', 'Superó la revisión preliminar',
      'Orden de revisión en San Isidro', '1.º', 'de 6', 'No está entre los 110 primeros de Lima', 'Puesto 838 de',
      '¿Por qué ocupa esta posición?', 'Punto de reciclaje registrado más cercano', '740 m', 'Estación ER06 del plan de San Isidro',
      'Verificaciones pendientes', '8 de 8', 'no está aprobado ni autorizado', 'Ver más detalles']) {
      expect(t).toContain(x)
    }
    expect(t).not.toMatch(/ROC|AUC|propensi|puntaje|Monte Carlo|MCDA|\bAlta\b|\bMedia\b|\bBaja\b/)
  })

  it('muestra el percentil de parecido sin presentarlo como probabilidad ni como conveniencia', async () => {
    const { w, st } = montar()
    st.detalle = { ...detalle, propension: { percentil_oof: 0.806, propension_oof: 0.41 } } as unknown as DetalleSitio
    await w.vm.$nextTick()
    const sec = w.find('[data-prueba="parecido"]')
    expect(sec.exists()).toBe(true)
    expect(sec.text()).toContain('Percentil 81 de 100')
    expect(sec.text()).toContain('100 = el más parecido de los 7 lugares')
    expect(sec.text()).toContain('no mide si conviene instalar aquí, no es una probabilidad')
    expect(sec.text()).not.toMatch(/recomend|idóne|\bAlta\b|\bMedia\b|\bBaja\b/i)
    await w.find('[data-prueba="ir-modelo"]').trigger('click')
    expect(w.emitted('ayuda')?.[0]).toEqual(['modelo'])
  })

  // contribuciones_logit reales del paquete V1.0.0 (backend local, redondeadas a 4 decimales).
  const REALES = {
    paradero: { clase: 0.1997, poblacion: -0.7328, vias: -2.1481, pois: 0.6686, construido: 0.8328, pendiente: -0.0109, sigersol: 0.1659 },
    parque: { clase: -2.6662, poblacion: -0.4232, vias: -0.6934, pois: 0.9874, construido: -0.5227, pendiente: -0.0364, sigersol: 0.4336 },
    mercado: { clase: -3.4677, poblacion: -0.6296, vias: -1.2591, pois: -0.2401, construido: 0.545, pendiente: -0.0415, sigersol: 0.1659 },
  }
  async function conContribuciones(c: Record<string, number> | undefined, propension = true) {
    const m = montar()
    m.st.detalle = { ...detalle, ...(propension ? { propension: { percentil_oof: 0.5, contribuciones_logit: c } } : {}) } as unknown as DetalleSitio
    await m.w.vm.$nextTick()
    return m.w
  }

  it.each(Object.entries(REALES))('contribuciones de un %s: ordenadas por magnitud, con signo y escala relativa', async (_, c) => {
    const w = await conContribuciones(c)
    const sec = w.find('[data-prueba="contribuciones"]')
    expect(sec.find('h3').text()).toBe('Qué más pesa en el parecido con los puntos ya registrados')
    expect(sec.text()).toContain('Hacia la derecha acerca el lugar al patrón de los puntos registrados; hacia la izquierda lo aleja. No mide si conviene instalar.')
    const filas = sec.findAll('li')
    const esperado = Object.entries(c).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    expect(filas.map(f => f.attributes('data-grupo'))).toEqual(esperado.map(([k]) => k))
    const barra = (i: number) => filas[i].find('span.absolute.rounded').attributes('style') ?? ''
    expect(barra(0)).toContain('width: 50%')
    for (const [i, [, v]] of esperado.entries()) expect(barra(i)).toContain(v >= 0 ? 'left: 50%' : 'right: 50%')
    expect(filas[0].text()).toContain(esperado[0][1] >= 0 ? '+' : '−')
    expect(sec.text()).not.toMatch(/recomend|probabilidad|idone|\bAlta\b|\bMedia\b|\bBaja\b/i)
  })

  it('sin contribuciones en el detalle no muestra el bloque ni falla', async () => {
    for (const w of [await conContribuciones(undefined), await conContribuciones({}), await conContribuciones(undefined, false)]) {
      expect(w.find('[data-prueba="contribuciones"]').exists()).toBe(false)
      expect(w.text()).toContain('Ver más detalles')
    }
  })

  it('ignora valores no numéricos en las contribuciones', async () => {
    const w = await conContribuciones({ clase: 0.5, vias: Number.NaN, pois: null as unknown as number })
    expect(w.findAll('[data-prueba="contribuciones"] li').map(f => f.attributes('data-grupo'))).toEqual(['clase'])
  })

  it('un percentil por debajo de 1 se lee como «menos de 1»', async () => {
    const { w, st } = montar()
    st.detalle = { ...detalle, propension: { percentil_oof: 0.0004 } } as unknown as DetalleSitio
    await w.vm.$nextTick()
    expect(w.find('[data-prueba="parecido"]').text()).toContain('Percentil menos de 1 de 100')
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
