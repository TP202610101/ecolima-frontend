import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import DetalleSitioV1 from './DetalleSitioV1.vue'
import { useAnalisisV1Store } from '../stores/useAnalisisV1Store'
import type { DetalleSitio, ResumenMcda, VersionActiva } from '../entities/AnalisisV1'

const AVISOS = {
  tamizaje: 'apto_tamizaje: el sitio pasa las reglas evaluables con datos secundarios. No confirma viabilidad.',
  propension: 'Propensión de emplazamiento: no es probabilidad de éxito, idoneidad ni viabilidad.',
  mcda: 'La MCDA ordena oportunidades con los criterios K1–K4.',
}

// Forma de la respuesta real de GET /api/v1/analisis/sitios/{id} (paquete 1.0.0).
function detalle(over: Partial<DetalleSitio> = {}): DetalleSitio {
  return {
    sitio_id: 'ECO-V0.1-OSM-NODE-13382447436',
    lon: -77.105641,
    lat: -11.9894953,
    ubigeo: '150135',
    distrito: 'SAN MARTIN DE PORRES',
    clase_oportunidad: 'paradero_transporte_publico',
    rol: 'fondo',
    tamizaje: {
      estado_tamizaje: 'apto_tamizaje',
      reglas: { T01_territorio: 'cumple', T03_trazabilidad_documental: 'cumple_parcial' },
      dist_punto_existente_m: 3708.33,
      punto_existente_mas_cercano: 'POS-OSM-N4005052813',
      codigo_exclusion: null,
      motivo_exclusion: null,
      controles_campo: { C02: 'pendiente_campo', C03: 'pendiente_campo' },
      estado_verificacion_campo: 'pendiente_campo',
    },
    variables: { pob_wp_r500: { valor: 23634.7, unidad: 'personas' } },
    propension: {
      percentil_oof: 0.2149866,
      propension_oof: 0.0893,
      propension_oof_de: 0.0376,
      percentil_final: 0.2493,
      propension_final: 0.1193,
      contribuciones_logit: { vias: -2.148, construido: 0.833 },
      aviso: AVISOS.propension,
    },
    criterios_mcda: { K1_demanda: { bruto: 23634.7, norm: 0.9826 } },
    mcda: [
      { esquema: 'iguales', puntaje: 0.68033, rango: 1, en_top_k: true, mcda_version: '1.0.2' },
      { esquema: 'critic', puntaje: 0.64, rango: 1, en_top_k: true, mcda_version: '1.0.2' },
    ],
    montecarlo: { mc_rango_mediana: 5, mc_rango_p05: 1, mc_rango_p95: 169.1, mc_frecuencia_top_k: 0.9362 },
    avisos: AVISOS,
    paquete_version: '1.0.0',
    atribucion: { licencia: 'ODbL-1.0', licencia_url: null, aviso: '', fuentes: '', paquete_version: '1.0.0' },
    ...over,
  }
}

function montar(d: DetalleSitio) {
  const store = useAnalisisV1Store()
  store.version = {
    conteos: { sitios: 2242, positivos: 47, estado_tamizaje: { apto_tamizaje: 2192 } },
    mcda: { montecarlo_n: 5000 },
  } as unknown as VersionActiva
  store.mcda = { top_k: 110, esquema_principal: 'iguales', criterios: {} } as unknown as ResumenMcda
  store.seleccionadoId = d.sitio_id
  store.detalle = d
  return mount(DetalleSitioV1)
}

beforeEach(() => setActivePinia(createPinia()))

describe('DetalleSitioV1', () => {
  it('pide seleccionar un sitio cuando no hay selección', () => {
    const w = mount(DetalleSitioV1)
    expect(w.text()).toContain('Selecciona un sitio')
  })

  it('muestra identificador, tamizaje, puntaje, posición y percentil de un candidato', () => {
    const w = montar(detalle())
    expect(w.get('[data-test="sitio-id"]').text()).toBe('ECO-V0.1-OSM-NODE-13382447436')
    expect(w.text()).toContain('SAN MARTIN DE PORRES')
    expect(w.get('[data-test="estado-tamizaje"]').text()).toBe('Pasa el tamizaje')
    const mcda = w.get('[data-test="mcda"]').text()
    expect(mcda).toContain('0,680')
    expect(mcda).toMatch(/1\s*de 2\.?192/)
    expect(w.text()).toContain('En el top-110 MCDA')
    expect(w.get('[data-test="percentil"]').text()).toBe('P21')
    expect(w.text()).toContain('pendientes de verificación')
  })

  it('un punto existente no muestra puntaje ficticio', () => {
    const w = montar(detalle({
      sitio_id: 'POS-OSM-N10281453783',
      rol: 'positivo',
      tamizaje: {
        ...detalle().tamizaje,
        estado_tamizaje: 'punto_existente',
        reglas: { T01_territorio: null },
        controles_campo: { C02: null, C03: null },
        dist_punto_existente_m: null,
      },
      criterios_mcda: null,
      mcda: [],
      montecarlo: null,
    }))
    expect(w.find('[data-test="mcda"]').exists()).toBe(false)
    expect(w.get('[data-test="sin-mcda"]').text()).toContain('punto de reciclaje ya registrado')
    expect(w.get('[data-test="estado-tamizaje"]').text()).toBe('Punto existente registrado')
    // No se le aplica el aviso de apto_tamizaje ni se inventan controles de campo
    expect(w.text()).not.toContain('apto_tamizaje:')
    expect(w.text()).not.toContain('Controles de campo')
    expect(w.find('[data-test="aviso-existente"]').exists()).toBe(true)
  })

  it('un sitio excluido explica el motivo y no tiene MCDA', () => {
    const w = montar(detalle({
      tamizaje: {
        ...detalle().tamizaje,
        estado_tamizaje: 'excluido_tamizaje',
        codigo_exclusion: 'T05',
        motivo_exclusion: 'punto existente a ≤ 30 m',
      },
      criterios_mcda: null,
      mcda: [],
      montecarlo: null,
    }))
    expect(w.get('[data-test="sin-mcda"]').text()).toContain('excluido en el tamizaje')
    expect(w.text()).toContain('Motivo de exclusión (T05)')
    expect(w.text()).not.toContain('apto_tamizaje:')
  })

  it('no usa categorías Alta/Media/Baja ni presenta sitios como viables o aprobados', () => {
    const texto = montar(detalle()).text()
    expect(texto).not.toMatch(/\b(Alta|Media|Baja)\b/)
    expect(texto).not.toMatch(/\bes viable\b|\bsitio viable\b/i)
    expect(texto).toContain('Ningún sitio está aprobado')
  })
})
