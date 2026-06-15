import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import ViewerControls from '../ViewerControls.vue'
import { NButton, NSelect, NColorPicker, NSwitch } from 'naive-ui'

describe('ViewerControls.vue', () => {
  const defaultProps = {
    idolId: 1,
    selectedDressIndex: 0,
    dressType: 'sml_cloth0',
    backgroundColor: '#000000',
    continuousShootingEnabled: false,
    idolOptions: [{ label: 'Idol 1', value: 1 }],
    dressOptions: [{ label: 'Dress 1', items: [] }],
    typeOptions: [{ label: 'Type 1', value: 'sml_cloth0' }],
    showActionButtons: true,
  }

  it('renders correctly with props', () => {
    const wrapper = mount(ViewerControls as any, {
      props: defaultProps,
      global: {
        components: { NButton, NSelect, NColorPicker, NSwitch },
      },
    })

    expect(wrapper.exists()).toBe(true)
    // Check if the UI elements contain expected values (this requires testing the props passed to naive-ui components)
    // We can find by component name
    const selects = wrapper.findAllComponents(NSelect)
    expect(selects.length).toBe(3) // Idol, Dress, Type

    // Check idol prop
    expect(selects?.[0]?.props('value')).toBe(1)
  })

  it('emits events when inputs change', async () => {
    const wrapper = mount(ViewerControls as any, {
      props: defaultProps,
      global: {
        components: { NButton, NSelect, NColorPicker, NSwitch },
      },
    })

    const selects = wrapper.findAllComponents(NSelect)

    // Trigger update on Idol select
    await selects?.[0]?.vm.$emit('update:value', 2)
    expect(wrapper.emitted('update:idol') as any[]).toBeTruthy()
    expect((wrapper.emitted('update:idol') as any[])[0]).toEqual([2])

    // Trigger update on Dress select
    await selects?.[1]?.vm.$emit('update:value', 1)
    expect(wrapper.emitted('update:dress') as any[]).toBeTruthy()
    expect((wrapper.emitted('update:dress') as any[])[0]).toEqual([1])

    // Trigger update on Type select
    await selects?.[2]?.vm.$emit('update:value', 'big_cloth0')
    expect(wrapper.emitted('update:type') as any[]).toBeTruthy()
    expect((wrapper.emitted('update:type') as any[])[0]).toEqual(['big_cloth0'])

    // Check Color Picker
    const colorPicker = wrapper.findComponent(NColorPicker)
    await colorPicker.vm.$emit('update:value', '#ff0000')
    expect(wrapper.emitted('update:backgroundColor') as any[]).toBeTruthy()
    expect((wrapper.emitted('update:backgroundColor') as any[])[0]).toEqual(['#ff0000'])

    // Check Switch
    const nSwitch = wrapper.findComponent(NSwitch)
    await nSwitch.vm.$emit('update:value', true)
    expect(wrapper.emitted('update:continuousShootingEnabled') as any[]).toBeTruthy()
    expect((wrapper.emitted('update:continuousShootingEnabled') as any[])[0]).toEqual([true])
  })

  it('hides action buttons when showActionButtons is false', () => {
    const wrapper = mount(ViewerControls as any, {
      props: {
        ...defaultProps,
        showActionButtons: false,
      },
      global: {
        components: { NButton, NSelect, NColorPicker, NSwitch },
      },
    })

    // The buttons have specific text, so we can find them by text or by counting NButton
    const buttons = wrapper.findAllComponents(NButton)

    // "Animation List", "ShinyColors Database", "Special Thanks" should be visible (3)
    // "Share" and "Save" should be hidden
    expect(buttons.length).toBe(3)

    const buttonTexts = buttons.map((b) => b.text())
    expect(buttonTexts).not.toContain('Share')
    expect(buttonTexts).not.toContain('Save')
  })

  it('emits button click events', async () => {
    const wrapper = mount(ViewerControls as any, {
      props: defaultProps,
      global: {
        components: { NButton, NSelect, NColorPicker, NSwitch },
      },
    })

    const buttons = wrapper.findAllComponents(NButton)
    // 0: Animation List, 1: Database, 2: Special Thanks, 3: Share, 4: Save

    await buttons?.[0]?.trigger('click')
    expect(wrapper.emitted('openAnimation') as any[]).toBeTruthy()

    await buttons?.[1]?.trigger('click')
    expect(wrapper.emitted('openDatabase') as any[]).toBeTruthy()

    await buttons?.[2]?.trigger('click')
    expect(wrapper.emitted('openThanks') as any[]).toBeTruthy()

    await buttons?.[3]?.trigger('click')
    expect(wrapper.emitted('share') as any[]).toBeTruthy()

    await buttons?.[4]?.trigger('click')
    expect(wrapper.emitted('save') as any[]).toBeTruthy()
  })
})
