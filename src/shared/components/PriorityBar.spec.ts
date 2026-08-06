import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PriorityBar from './PriorityBar.vue'

describe('PriorityBar', () => {
  it('aplica bg-green-500 cuando el valor es >= 0.85', () => {
    const wrapper = mount(PriorityBar, { props: { value: 0.9 } })
    const bar = wrapper.find('.h-2.rounded-full:not(.overflow-hidden)')
    expect(bar.classes()).toContain('bg-green-500')
  })

  it('aplica bg-yellow-500 cuando el valor está entre 0.70 y 0.84', () => {
    const wrapper = mount(PriorityBar, { props: { value: 0.75 } })
    const bar = wrapper.find('.h-2.rounded-full:not(.overflow-hidden)')
    expect(bar.classes()).toContain('bg-yellow-500')
  })

  it('aplica bg-gray-400 cuando el valor es < 0.70', () => {
    const wrapper = mount(PriorityBar, { props: { value: 0.5 } })
    const bar = wrapper.find('.h-2.rounded-full:not(.overflow-hidden)')
    expect(bar.classes()).toContain('bg-gray-400')
  })

  it('el ancho de la barra refleja el valor como porcentaje', () => {
    const wrapper = mount(PriorityBar, { props: { value: 0.6 } })
    const bar = wrapper.find('.h-2.rounded-full:not(.overflow-hidden)')
    expect(bar.attributes('style')).toContain('width: 60%')
  })

  it('clampea valores mayores a 1 al 100%', () => {
    const wrapper = mount(PriorityBar, { props: { value: 1.5 } })
    const bar = wrapper.find('.h-2.rounded-full:not(.overflow-hidden)')
    expect(bar.attributes('style')).toContain('width: 100%')
  })

  it('clampea valores negativos al 0%', () => {
    const wrapper = mount(PriorityBar, { props: { value: -0.2 } })
    const bar = wrapper.find('.h-2.rounded-full:not(.overflow-hidden)')
    expect(bar.attributes('style')).toContain('width: 0%')
  })

  it('muestra la etiqueta de porcentaje cuando showLabel es true', () => {
    const wrapper = mount(PriorityBar, { props: { value: 0.9, showLabel: true } })
    expect(wrapper.text()).toBe('90%')
  })

  it('no muestra etiqueta cuando showLabel no está definido', () => {
    const wrapper = mount(PriorityBar, { props: { value: 0.9 } })
    expect(wrapper.find('span').exists()).toBe(false)
  })
})
