import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import PanelModelo from './PanelModelo.vue'
import { useMLStore } from '../stores/useMLStore'
import { MLRepository } from '../repositories/MLRepository'
import type { ModeloV1, ResumenMcda, ResumenTamizaje, VersionActiva } from '@/domains/analisis-v1/entities/AnalisisV1'
import type { VersionResumen } from '../entities/ModelVersion'
import { revisarLenguaje } from '@/shared/utils/lenguajeV1'
import { fmtEntero } from '@/domains/analisis-v1/utils/lecturaV1'

vi.mock('../repositories/MLRepository', () => ({
  MLRepository: { getVersiones: vi.fn(), getVersion: vi.fn(), getModelo: vi.fn(), getMcda: vi.fn(), getTamizaje: vi.fn() },
}))

// Datos simulados con la forma de /api/v1/analisis/* del paquete V1.0.0 (valores redondeados).
const activa = {
  paquete_version: '1.0.0', dataset_version: '1.0.0', modelo_version: 'propension-1.0.0', mcda_version: '1.0.2',
  fecha_paquete: '2026-10-03T15:34:38-05:00', importado_en: '2026-10-21T19:45:13-05:00', activa: true,
  descripcion: 'Propensión de emplazamiento y MCDA de sitios candidatos', licencia_datos: 'ODbL-1.0', manifest_sha256: '1fcc0a124de14e87',
  conteos: { sitios: 2242, positivos: 47, fondo: 2195, distritos_con_sitios: 40, distritos: 43, estado_tamizaje: { apto_tamizaje: 2192, excluido_tamizaje: 3, punto_existente: 47 } },
  dataset: { version: '1.0.0', archivo: 'datos/dataset_v1.0.0.csv', sha256: 'aa6f2779254', filas: 2242, positivos: 47, fondo: 2195, distritos: 43, distritos_con_positivos: 14, unidades: {} },
  modelo: { version: 'propension-1.0.0', algoritmo: 'LogisticRegression', cv: '', semillas: [], features: [] },
  mcda: { version: '1.0.2', metodo: 'WLC con normalización min–max', radio_principal_m: 500, top_k: 110, top_k_fraccion: 0.05, montecarlo_n: 5000, montecarlo_semilla: 1, esquema_principal: 'iguales' },
  entorno: { python: '3.14.6', 'scikit-learn': '1.9.1' },
  archivos: Array.from({ length: 20 }, (_, i) => ({ ruta: `f${i}.csv`, sha256: 'ab'.repeat(32), bytes: 1, filas: 1 })),
  avisos: { tamizaje: '', propension: '', mcda: '' },
  atribucion: { licencia: 'ODbL-1.0', licencia_url: 'https://opendatacommons.org/licenses/odbl/1-0/', aviso: '', fuentes: '', paquete_version: '1.0.0' },
} as VersionActiva
const semilla = (i: number) => ({ semilla: i, roc_auc: 0.749, pr_auc: 0.072, boyce: 0.757, prevalencia: 0.021, recall_top5: 0.26, recall_top10: 0.4255, recall_top20: 0.51 })
const modelo = {
  modelo_version: 'propension-1.0.0', algoritmo: "LogisticRegression(class_weight='balanced')", rol: '', aviso: '', paquete_version: '1.0.0', parametros: {},
  metricas_resumen: { roc_auc: { media: 0.7492, de: 0.0032 }, pr_auc: { media: 0.0718, de: 0.0045 }, boyce: { media: 0.7566, de: 0.0234 }, recall_top10: { media: 0.425531914893617, de: 0 } },
  metricas_por_semilla: Array.from({ length: 10 }, (_, i) => semilla(i)),
  model_card: {},
} as ModeloV1
const mcda = {
  mcda_version: '1.0.2', metodo: 'WLC con normalización min–max', criterios: {}, radio_principal_m: 500, top_k: 110, top_k_fraccion: 0.05,
  esquema_principal: 'iguales', aviso: '', montecarlo: { n: 5000, semilla: 20261002 },
  pesos: [
    { esquema: 'iguales', K1_demanda: 0.25, K2_generacion: 0.25, K3_brecha: 0.25, K4_accesibilidad: 0.25 },
    { esquema: 'entropia', K1_demanda: 0.146, K2_generacion: 0.147, K3_brecha: 0.65, K4_accesibilidad: 0.057 },
  ],
  concordancia: [{ comparacion: 'iguales vs critic', spearman: 0.9967, kendall_tau_b: 0.956, solapamiento_top110: 0.9727 }],
} as ResumenMcda
const tamizaje = { estado_tamizaje: { apto_tamizaje: 2192, excluido_tamizaje: 3, punto_existente: 47 } } as unknown as ResumenTamizaje
const resumen = (v: string, act: boolean): VersionResumen => ({
  paquete_version: v, dataset_version: v, modelo_version: `propension-${v}`, mcda_version: '1.0.2', fecha_paquete: '2026-10-03T15:34:38-05:00',
  descripcion: '', licencia_datos: 'ODbL-1.0', activa: act, importado_en: '2026-10-21T19:45:13-05:00', manifest_sha256: 'x',
})

function montar(versiones = [resumen('1.0.0', true)]) {
  setActivePinia(createPinia())
  const st = useMLStore()
  st.activa = activa
  st.modelo = modelo
  st.mcda = mcda
  st.tamizaje = tamizaje
  st.versiones = { activa: '1.0.0', versiones }
  const w = mount(PanelModelo, { global: { stubs: { GraficoSemillas: { template: '<div data-prueba="grafico-semillas" />' }, teleport: true } } })
  return { st, w }
}
const bloque = (w: ReturnType<typeof montar>['w'], b: string) => w.find(`[data-prueba="bloque-${b}"]`)

beforeEach(() => vi.clearAllMocks())

describe('PanelModelo — bloques con datos simulados', () => {
  it('a. versión activa: paquete, modelo, MCDA, fecha, responsable y licencia', () => {
    const t = bloque(montar().w, 'version').text()
    for (const x of ['1.0.0', 'propension-1.0.0', 'Regresión logística', '1.0.2', 'WLC con normalización', '3 de octubre de 2026', 'No lo publica la API', 'ODbL-1.0']) expect(t).toContain(x)
  })

  it('b. métricas: promedio y desviación, tabla de 10 semillas y gráfico', () => {
    const { w } = montar()
    const b = bloque(w, 'metricas')
    expect(b.find('[data-metrica="roc_auc"]').text()).toContain('0,749')
    expect(b.find('[data-metrica="roc_auc"]').text()).toContain('desviación 0,003')
    expect(b.find('[data-metrica="pr_auc"]').text()).toContain('0,072')
    expect(b.find('[data-metrica="boyce"]').text()).toContain('0,757')
    expect(b.find('[data-metrica="recall_top10"]').text()).toContain('Recall del 10 % superior')
    expect(b.findAll('[data-prueba="tabla-semillas"] tbody tr')).toHaveLength(10)
    expect(b.find('[data-prueba="grafico-semillas"]').exists()).toBe(true)
  })

  it('c. con una sola versión: «Solo hay una versión registrada» y sin casillas para comparar', () => {
    const b = bloque(montar().w, 'versiones')
    expect(b.find('[data-prueba="una-version"]').text()).toBe('Solo hay una versión registrada')
    expect(b.findAll('input[type="checkbox"]')).toHaveLength(0)
    expect(b.find('[data-version="1.0.0"]').text()).toContain('Activa')
  })

  it('c. con dos versiones: compara lado a lado', async () => {
    const { w } = montar([resumen('1.0.0', true), resumen('1.1.0', false)])
    vi.mocked(MLRepository.getVersion).mockImplementation(async v => ({ ...activa, paquete_version: v ?? '1.0.0', activa: v === '1.0.0' }))
    vi.mocked(MLRepository.getModelo).mockImplementation(async () => modelo)
    const casillas = bloque(w, 'versiones').findAll('input[type="checkbox"]')
    expect(casillas).toHaveLength(2)
    await casillas[0].setValue(true)
    await casillas[1].setValue(true)
    await w.find('[data-prueba="comparar"]').trigger('click')
    await new Promise(r => setTimeout(r))
    const modal = w.find('[data-prueba="modal-comparacion"]')
    expect(modal.exists()).toBe(true)
    expect(modal.text()).toContain('1.0.0')
    expect(modal.text()).toContain('1.1.0')
    expect(modal.text()).toContain('ROC-AUC')
    expect(MLRepository.getVersion).toHaveBeenCalledWith('1.1.0')
  })

  it('d. integridad: archivo y sha256 del dataset, número de archivos y entorno', () => {
    const t = bloque(montar().w, 'integridad').text()
    for (const x of ['datos/dataset_v1.0.0.csv', 'aa6f2779254', '1fcc0a124de14e87', '20', 'python 3.14.6', 'scikit-learn 1.9.1']) expect(t).toContain(x)
  })

  it('e. estado de los datos: sitios, aptos, excluidos, puntos existentes y primeros de Lima', () => {
    const t = bloque(montar().w, 'estado').text()
    for (const x of [fmtEntero(2242), fmtEntero(2192), '3', '47', '110', 'No significa viable ni autorizado']) expect(t).toContain(x)
  })

  it('f. priorización: pesos por esquema y concordancia', () => {
    const b = bloque(montar().w, 'priorizacion')
    const pesos = b.find('[data-prueba="tabla-pesos"]').text()
    expect(pesos).toContain('iguales')
    expect(pesos).toContain('principal')
    expect(pesos).toContain('25,0 %')
    expect(pesos).toContain('65,0 %')
    const conc = b.find('[data-prueba="tabla-concordancia"]').text()
    expect(conc).toContain('iguales vs critic')
    expect(conc).toContain('0,997')
    expect(conc).toContain('97,3 %')
  })

  it('g. importar una versión: tarjeta estática, sin botones que escriban', () => {
    const { w } = montar()
    const b = bloque(w, 'importar')
    expect(b.text()).toContain('importar_paquete_analisis.py')
    expect(b.text()).toContain('verifica los hashes')
    expect(b.findAll('button')).toHaveLength(0)
    const botones = w.findAll('button').map(x => x.text())
    expect(botones.some(x => /inferencia|recalcular|activar/i.test(x))).toBe(false)
  })

  it('si un bloque falla, muestra su error sin ocultar los demás', () => {
    const { w, st } = montar()
    st.mcda = null
    st.errores = { mcda: 'No se pudo cargar esta sección.' }
    return w.vm.$nextTick().then(() => {
      expect(bloque(w, 'priorizacion').text()).toContain('No se pudo cargar esta sección.')
      expect(bloque(w, 'version').text()).toContain('propension-1.0.0')
    })
  })

  it('el texto del panel respeta el lenguaje V1', () => {
    expect(revisarLenguaje(montar().w.text())).toEqual([])
  })
})
