import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import AnimationPanel from '../AnimationPanel.vue'
import { NButton, NCheckbox, NScrollbar } from 'naive-ui'
import type { AnimationItem } from '../../types'

describe('AnimationPanel.vue', () => {
  const mockAnimations: AnimationItem[] = [
    { name: 'wait', trackIndex: 0, checked: true },
    { name: 'talk', trackIndex: 1, checked: false },
    { name: 'smile', trackIndex: 2, checked: false },
  ]

  it('renders correctly with animations', () => {
    const wrapper = mount(AnimationPanel as any, {
      props: {
        animations: mockAnimations,
      },
      global: {
        components: { NButton, NCheckbox, NScrollbar },
      },
    })

    expect(wrapper.exists()).toBe(true)

    // Check if checkboxes are rendered
    const checkboxes = wrapper.findAllComponents(NCheckbox)
    expect(checkboxes.length).toBe(3)

    // Check content and state
    expect(checkboxes?.[0]?.text()).toBe('wait')
    expect(checkboxes?.[0]?.props('checked')).toBe(true)

    expect(checkboxes?.[1]?.text()).toBe('talk')
    expect(checkboxes?.[1]?.props('checked')).toBe(false)
  })

  it('emits toggle event when a checkbox is clicked', async () => {
    const wrapper = mount(AnimationPanel as any, {
      props: {
        animations: mockAnimations,
      },
      global: {
        components: { NButton, NCheckbox, NScrollbar },
      },
    })

    const checkboxes = wrapper.findAllComponents(NCheckbox)

    // Toggle the second checkbox ('talk')
    await checkboxes?.[1]?.vm.$emit('update:checked', true)

    expect(wrapper.emitted('toggle') as any[]).toBeTruthy()
    expect((wrapper.emitted('toggle') as any[])[0]).toEqual([1, true]) // trackIndex: 1, checked: true
  })

  it('emits reset event when Reset button is clicked', async () => {
    const wrapper = mount(AnimationPanel as any, {
      props: {
        animations: mockAnimations,
      },
      global: {
        components: { NButton, NCheckbox, NScrollbar },
      },
    })

    const buttons = wrapper.findAllComponents(NButton)
    // The first button is Reset
    await buttons?.[0]?.trigger('click')

    expect(wrapper.emitted('reset')).toBeTruthy()
  })

  it('emits close event when Close button is clicked', async () => {
    const wrapper = mount(AnimationPanel as any, {
      props: {
        animations: mockAnimations,
      },
      global: {
        components: { NButton, NCheckbox, NScrollbar },
      },
    })

    const buttons = wrapper.findAllComponents(NButton)
    // The second button is Close
    await buttons?.[1]?.trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
  })
})
