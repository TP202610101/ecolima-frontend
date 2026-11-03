import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import AyudaFuentesV1 from './AyudaFuentesV1.vue'
import { useExploracionV1Store } from '../stores/useExploracionV1Store'
import type { ModeloV1 } from '../entities/AnalisisV1'
import { AvisosRepository } from '@/domains/avisos/repositories/AvisosRepository'
import { AVISOS_AYUDA, type SeccionAyuda } from './avisoAyuda'

vi.mock('@/domains/avisos/repositories/AvisosRepository', () => ({
  AvisosRepository: { getEstado: vi.fn().mockResolvedValue({ clave: 'acerca-del-modelo', version: '1', confirmado: true, confirmado_en: null }), confirmar: vi.fn() },
}))
vi.mock('../repositories/AnalisisV1Repository', () => ({
  AnalisisV1Repository: { getFuentes: vi.fn().mockResolvedValue([]), getModelo: vi.fn() },
}))

// Forma y valores de GET /api/v1/analisis/modelo del paquete V1.0.0 (resumidos).
const modelo = {
  modelo_version: 'propension-1.0.0',
  algoritmo: "LogisticRegression(class_weight='balanced', C=1.0, max_iter=5000, solver='lbfgs')",
  rol: 'modelo oficial de propensión',
  metricas_resumen: {
    roc_auc: { media: 0.7492, de: 0.0032 },
    pr_auc: { media: 0.0718, de: 0.0045 },
    boyce: { media: 0.7566, de: 0.0234 },
    prevalencia: { media: 0.021, de: 0 },
    recall_top10: { media: 0.425531914893617, de: 0 },
  },
  metricas_por_semilla: [],
  model_card: {
    salida: 'propensión relativa; no es idoneidad, viabilidad ni probabilidad calibrada',
    limitaciones: ['La propensión refleja dónde se decidió instalar en el pasado, no dónde conviene instalar.'],
    validacion: { cv: 'StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=semilla), grupos=ubigeo', semillas: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], prediccion: 'fuera de fold' },
  },
  parametros: {},
  aviso: '',
  paquete_version: '1.0.0',
} as ModeloV1

function montar() {
  setActivePinia(createPinia())
  const st = useExploracionV1Store()
  st.modelo = modelo
  return mount(AyudaFuentesV1, { props: { seccion: 'modelo' } })
}

describe('AyudaFuentesV1 — Acerca del modelo', () => {
  it('muestra algoritmo, validación, métricas con promedio y desviación, y limitaciones', () => {
    const t = montar().find('[data-prueba="acerca-modelo"]').text()
    expect(t).toContain('Regresión logística (versión propension-1.0.0)')
    expect(t).toContain('validación cruzada en 5 partes, separando los distritos entre entrenamiento y prueba; repetida con 10 semillas')
    for (const x of ['ROC-AUC', '0,749', '0,003', 'PR-AUC', '0,072', 'Índice de Boyce', '0,757', 'Recall del 10 % superior', '0,426']) {
      expect(t).toContain(x)
    }
    expect(t).toContain('no dónde conviene instalar')
  })

  it('advierte que la propensión no es una probabilidad calibrada y no usa términos vetados', () => {
    const t = montar().text()
    expect(t).toContain('La propensión no es una probabilidad calibrada ni una medida de idoneidad')
    expect(t).not.toMatch(/recomend|\bAlta\b|\bMedia\b|\bBaja\b/i)
  })

  it('la pestaña «Acerca del modelo» está junto a las otras dos', async () => {
    const w = montar()
    const tabs = w.findAll('button').map(b => b.text())
    expect(tabs).toEqual(expect.arrayContaining(['Cómo se ordenan', 'Fuentes y limitaciones', 'Acerca del modelo']))
    await w.find('[data-prueba="tab-modelo"]').trigger('click')
    expect(w.emitted('cambiar')?.[0]).toEqual(['modelo'])
  })
})

// ── Lectura obligatoria por sección ─────────────────────────────────────────────────────────────────
const getEstado = vi.mocked(AvisosRepository.getEstado)
const confirmar = vi.mocked(AvisosRepository.confirmar)
const SECCION_DE_CLAVE = Object.fromEntries(Object.entries(AVISOS_AYUDA).map(([s, a]) => [a.clave, s])) as Record<string, SeccionAyuda>

describe('AyudaFuentesV1 — lectura obligatoria de la sección de entrada', () => {
  let w: VueWrapper
  const region = () => w.find('[role="region"]')
  const cerrarX = () => w.find('button[aria-label="Cerrar"]')
  const pie = () => w.find('[data-prueba="lectura-ayuda"]')
  const tab = (t: string) => w.findAll('button').find(b => b.text().startsWith(t))

  // jsdom no calcula layout: se fijan las medidas del texto de la sección visible.
  function medidas(scrollHeight: number, clientHeight: number, scrollTop = 0) {
    const el = region().element
    Object.defineProperty(el, 'scrollHeight', { configurable: true, value: scrollHeight })
    Object.defineProperty(el, 'clientHeight', { configurable: true, value: clientHeight })
    Object.defineProperty(el, 'scrollTop', { configurable: true, writable: true, value: scrollTop })
  }
  async function bajarHastaElFinal() {
    medidas(1000, 300)
    ;(region().element as HTMLElement).scrollTop = 700
    await region().trigger('scroll')
    await flushPromises()
  }
  /** confirmadas: secciones que el backend ya tiene registradas; 'error' simula el fallo del servicio. */
  async function abrir(entrada: SeccionAyuda, confirmadas: SeccionAyuda[] | 'error' = []) {
    if (confirmadas === 'error') getEstado.mockImplementation(() => Promise.reject(new Error('422')))
    else getEstado.mockImplementation(async a => ({ ...a, confirmado: confirmadas.includes(SECCION_DE_CLAVE[a.clave]), confirmado_en: null }))
    setActivePinia(createPinia())
    const st = useExploracionV1Store()
    st.cargado = true
    st.fuentes = [{ codigo: 'OSM', nombre: 'OpenStreetMap', institucion: 'OSM', licencia: 'ODbL', licencia_url: null, fecha_corte: null } as never]
    st.modelo = modelo
    w = mount(AyudaFuentesV1, { props: { seccion: entrada }, attachTo: document.body })
    await flushPromises()
    medidas(1000, 300)
    return w
  }
  async function irA(seccion: SeccionAyuda) {
    await w.setProps({ seccion })
    await flushPromises()
    medidas(1000, 300)
  }
  async function cerrar() {
    await cerrarX().trigger('click')
    await flushPromises()
  }
  const escape = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

  beforeEach(() => { getEstado.mockReset(); confirmar.mockReset() })
  afterEach(() => w?.unmount())

  it('sección de entrada pendiente: no se cierra con la X, Escape ni clic fuera', async () => {
    await abrir('fuentes')
    expect(getEstado).toHaveBeenCalledWith(AVISOS_AYUDA.fuentes)
    expect(cerrarX().attributes('disabled')).toBeDefined()
    expect(cerrarX().attributes('aria-describedby')).toBe('ayuda-lectura-indicacion')
    expect(pie().text()).toBe('Primera vez: desplázate hasta el final de este texto para poder cerrar.')
    await cerrarX().trigger('click')
    escape()
    await w.trigger('click')
    await flushPromises()
    expect(w.emitted('cerrar')).toBeUndefined()
  })

  it('al leer la sección de entrada: marca, anuncio, y al cerrar registra solo esa clave', async () => {
    confirmar.mockResolvedValue()
    await abrir('orden')
    await bajarHastaElFinal()
    expect(tab('Cómo se ordenan')?.text()).toContain('(leída)')
    expect(w.find('[role="status"]').text()).toBe('Leíste «Cómo se ordenan» hasta el final. Ya puedes cerrar la ayuda.')
    expect(cerrarX().attributes('disabled')).toBeUndefined()
    expect(confirmar).not.toHaveBeenCalled() // se registra al cerrar
    await cerrar()
    expect(confirmar.mock.calls).toEqual([[AVISOS_AYUDA.orden]])
    expect(w.emitted('cerrar')).toHaveLength(1)
  })

  it('otra pestaña pendiente no se exige: basta con la de entrada', async () => {
    confirmar.mockResolvedValue()
    await abrir('orden')
    await irA('modelo')
    expect(getEstado).toHaveBeenCalledWith(AVISOS_AYUDA.modelo)
    expect(pie().text()).toBe('Primera vez: para poder cerrar, desplázate hasta el final de «Cómo se ordenan».')
    await irA('orden')
    await bajarHastaElFinal()
    await irA('modelo')
    expect(cerrarX().attributes('disabled')).toBeUndefined()
    await cerrar()
    expect(confirmar.mock.calls).toEqual([[AVISOS_AYUDA.orden]])
  })

  it('las otras secciones leídas completas y pendientes también se registran al cerrar', async () => {
    confirmar.mockResolvedValue()
    await abrir('orden')
    await bajarHastaElFinal()
    await irA('modelo')
    await bajarHastaElFinal()
    expect(w.find('[role="status"]').text()).toBe('Leíste «Acerca del modelo» hasta el final.')
    await cerrar()
    expect(confirmar.mock.calls).toEqual([[AVISOS_AYUDA.orden], [AVISOS_AYUDA.modelo]])
  })

  it('una sección ya confirmada no se vuelve a registrar aunque se lea', async () => {
    confirmar.mockResolvedValue()
    await abrir('orden', ['modelo'])
    await bajarHastaElFinal()
    await irA('modelo')
    await bajarHastaElFinal()
    expect(tab('Acerca del modelo')?.text()).not.toContain('(leída)')
    await cerrar()
    expect(confirmar.mock.calls).toEqual([[AVISOS_AYUDA.orden]])
  })

  it('sección de entrada ya confirmada: se cierra como siempre, aunque las otras falten', async () => {
    await abrir('fuentes', ['fuentes'])
    expect(cerrarX().attributes('disabled')).toBeUndefined()
    expect(pie().exists()).toBe(false)
    escape()
    await flushPromises()
    expect(w.emitted('cerrar')).toHaveLength(1)
    expect(confirmar).not.toHaveBeenCalled()
  })

  it('si el servicio falla, no se exige nada', async () => {
    await abrir('modelo', 'error')
    expect(cerrarX().attributes('disabled')).toBeUndefined()
    expect(pie().exists()).toBe(false)
    await cerrar()
    expect(w.emitted('cerrar')).toHaveLength(1)
  })

  it('si no se pudo registrar la lectura, avisa una vez y el siguiente intento cierra', async () => {
    confirmar.mockImplementation(() => Promise.reject(new Error('500')))
    await abrir('orden')
    await bajarHastaElFinal()
    await cerrar()
    expect(w.emitted('cerrar')).toBeUndefined()
    expect(w.find('[role="alert"]').text()).toBe('No se pudo guardar que leíste esta ayuda. Se te volverá a pedir la próxima vez que la abras. Puedes cerrarla.')
    await cerrar()
    expect(w.emitted('cerrar')).toHaveLength(1)
  })

  it('una sección que cabe entera cuenta como leída', async () => {
    await abrir('fuentes')
    medidas(250, 300)
    await region().trigger('scroll')
    expect(tab('Fuentes y limitaciones')?.text()).toContain('(leída)')
    expect(cerrarX().attributes('disabled')).toBeUndefined()
  })

  it('mientras la sección carga, llegar al final no cuenta', async () => {
    await abrir('modelo')
    useExploracionV1Store().modelo = null
    await flushPromises()
    await bajarHastaElFinal()
    expect(tab('Acerca del modelo')?.text()).not.toContain('(leída)')
    expect(cerrarX().attributes('disabled')).toBeDefined()
  })

  it('volver a subir no desmarca la sección leída', async () => {
    await abrir('orden')
    await bajarHastaElFinal()
    ;(region().element as HTMLElement).scrollTop = 0
    await region().trigger('scroll')
    expect(tab('Cómo se ordenan')?.text()).toContain('(leída)')
    expect(cerrarX().attributes('disabled')).toBeUndefined()
  })

  it('el texto de cada sección es una región con nombre que se enfoca para desplazarlo con teclado', async () => {
    await abrir('fuentes')
    expect(region().attributes('aria-label')).toBe('Texto de Fuentes y limitaciones')
    expect(region().attributes('tabindex')).toBe('0')
  })
})
