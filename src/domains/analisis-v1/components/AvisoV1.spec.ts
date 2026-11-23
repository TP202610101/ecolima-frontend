import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import AvisoV1 from './AvisoV1.vue'
import { useExploracionV1Store } from '../stores/useExploracionV1Store'

describe('AvisoV1', () => {
  it('en móvil apila texto y enlaces; los enlaces y el cierre tienen área táctil de 40 px', async () => {
    setActivePinia(createPinia())
    const st = useExploracionV1Store()
    const w = mount(AvisoV1)
    const contenido = w.find('[data-prueba="aviso-v1"] > div')
    expect(contenido.classes()).toEqual(expect.arrayContaining(['flex-col', 'lg:flex-row']))
    const enlaces = w.findAll('button').filter(b => b.text())
    expect(enlaces.map(b => b.text())).toEqual(['Cómo se ordenan', 'Fuentes y limitaciones'])
    for (const b of enlaces) expect(b.classes()).toContain('min-h-10')
    const cerrar = w.find('[data-prueba="cerrar-aviso"]')
    expect(cerrar.classes()).toEqual(expect.arrayContaining(['w-10', 'h-10']))
    await enlaces[1].trigger('click')
    expect(w.emitted('ayuda')?.[0]).toEqual(['fuentes'])
    await cerrar.trigger('click')
    expect(st.avisoCerrado).toBe(true)
  })
})
