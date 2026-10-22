import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import AyudaFuentesV1 from './AyudaFuentesV1.vue'
import { useExploracionV1Store } from '../stores/useExploracionV1Store'
import type { ModeloV1 } from '../entities/AnalisisV1'

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
