import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import AvisoSinLugaresV1 from './AvisoSinLugaresV1.vue'
import { useExploracionV1Store } from '../stores/useExploracionV1Store'
import type { VersionActiva } from '../entities/AnalisisV1'

vi.mock('../repositories/AnalisisV1Repository', () => ({ AnalisisV1Repository: {} }))

describe('AvisoSinLugaresV1', () => {
  it('explica que el distrito no tiene lugares evaluados y lleva a Fuentes y limitaciones', async () => {
    setActivePinia(createPinia())
    const st = useExploracionV1Store()
    st.version = { paquete_version: '1.0.0' } as VersionActiva
    st.ambito = '150129'
    const w = mount(AvisoSinLugaresV1)
    expect(w.text()).toContain('San Bartolo no tiene lugares evaluados en la versión 1.0.0')
    expect(w.text()).toContain('no hay un orden de revisión que mostrar')
    expect(w.text()).not.toMatch(/recomend|\bAlta\b|\bMedia\b|\bBaja\b/i)
    await w.find('[data-prueba="ir-fuentes"]').trigger('click')
    expect(w.emitted('fuentes')).toHaveLength(1)
  })
})
