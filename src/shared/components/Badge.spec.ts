import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Badge from './Badge.vue'

describe('Badge', () => {
  it('muestra "Prioridad Alta" y clase bg-green-600 para variante alta', () => {
    const wrapper = mount(Badge, { props: { variant: 'alta' } })
    expect(wrapper.text()).toBe('Prioridad Alta')
    expect(wrapper.classes()).toContain('bg-green-600')
  })

  it('muestra "Prioridad Media" y clase bg-yellow-500 para variante media', () => {
    const wrapper = mount(Badge, { props: { variant: 'media' } })
    expect(wrapper.text()).toBe('Prioridad Media')
    expect(wrapper.classes()).toContain('bg-yellow-500')
  })

  it('muestra "Prioridad Baja" y clase bg-gray-400 para variante baja', () => {
    const wrapper = mount(Badge, { props: { variant: 'baja' } })
    expect(wrapper.text()).toBe('Prioridad Baja')
    expect(wrapper.classes()).toContain('bg-gray-400')
  })

  it('muestra "Recomendado" y clase bg-green-100 para variante recomendado', () => {
    const wrapper = mount(Badge, { props: { variant: 'recomendado' } })
    expect(wrapper.text()).toBe('Recomendado')
    expect(wrapper.classes()).toContain('bg-green-100')
  })

  it('muestra "Existente" y clase bg-blue-100 para variante existente', () => {
    const wrapper = mount(Badge, { props: { variant: 'existente' } })
    expect(wrapper.text()).toBe('Existente')
    expect(wrapper.classes()).toContain('bg-blue-100')
  })

  it('usa el texto de la prop label cuando se pasa', () => {
    const wrapper = mount(Badge, { props: { variant: 'alta', label: 'Zona crítica' } })
    expect(wrapper.text()).toBe('Zona crítica')
  })
})
