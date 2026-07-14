import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CanvasStage from '../CanvasStage.vue'

describe('CanvasStage.vue', () => {
  beforeEach(() => {
    window.alert = vi.fn()
  })

  it('exposes canvasRef', () => {
    const wrapper = mount(CanvasStage as any)
    expect((wrapper.vm as any).canvasRef).toBeInstanceOf(HTMLCanvasElement)
  })

  it('emits dragover event on dragover', async () => {
    const wrapper = mount(CanvasStage as any)
    const canvas = wrapper.find('canvas')

    await canvas.trigger('dragover')

    expect(wrapper.emitted('dragover')).toBeTruthy()
    expect(wrapper.emitted('dragover')!.length).toBe(1)
  })

  it('handles valid drop with dataTransfer.items', async () => {
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/test')
    const wrapper = mount(CanvasStage as any)
    // canvas isn't used here, drop it
    const mockFiles = [
      { name: 'test.atlas', kind: 'file', getAsFile: () => ({ name: 'test.atlas' }) },
      { name: 'test.json', kind: 'file', getAsFile: () => ({ name: 'test.json' }) },
      { name: 'test.png', kind: 'file', getAsFile: () => ({ name: 'test.png' }) },
    ]

    const dropEvent = {
      preventDefault: vi.fn(),
      dataTransfer: {
        items: mockFiles,
      },
    }

    // @ts-ignore - we only need partial mock
    await wrapper.vm.handleDrop(dropEvent)

    expect(dropEvent.preventDefault).toHaveBeenCalled()
    expect(wrapper.emitted('drop')).toBeTruthy()

    const dropArgs = wrapper.emitted('drop')![0] as any[]
    expect(dropArgs[0]).toBeDefined() // atlas
    expect(dropArgs[1]).toBeDefined() // json
    expect(dropArgs[2]).toBeInstanceOf(Map) // textures
    expect((dropArgs[2] as Map<string, File>).has('test.png')).toBe(true)
  })

  it('shows alert when dropping incomplete files', async () => {
    const wrapper = mount(CanvasStage as any)

    const mockFiles = [
      { name: 'test.json', kind: 'file', getAsFile: () => ({ name: 'test.json' }) },
    ]

    const dropEvent = {
      preventDefault: vi.fn(),
      dataTransfer: {
        items: mockFiles,
      },
    }

    // @ts-ignore
    await wrapper.vm.handleDrop(dropEvent)

    expect(window.alert).toHaveBeenCalledWith('missing files!')
    expect(wrapper.emitted('drop')).toBeFalsy()
  })

  it('handles valid drop with dataTransfer.files fallback', async () => {
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/test')
    const wrapper = mount(CanvasStage as any)

    const mockFiles = [{ name: 'test.atlas' }, { name: 'test.json' }, { name: 'test.webp' }]

    const dropEvent = {
      preventDefault: vi.fn(),
      dataTransfer: {
        // no items
        files: mockFiles,
      },
    }

    // @ts-ignore
    await wrapper.vm.handleDrop(dropEvent)

    expect(wrapper.emitted('drop')).toBeTruthy()
    const dropArgs = wrapper.emitted('drop')![0] as any[]
    expect((dropArgs[2] as Map<string, File>).has('test.webp')).toBe(true)
  })
})
