import { describe, it, expect, vi, beforeEach } from 'vitest'
// import { useSpineRuntime } from '../useSpineRuntime'
import { ref } from 'vue'

describe('useSpineRuntime', () => {
  let mockApp: any
  let mockPIXI: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockApp = {
      stage: { addChild: vi.fn(), removeChildren: vi.fn() },
      renderer: {
        background: { color: '0x000000' },
        name: 'mock-renderer',
        resize: vi.fn(),
      },
      init: vi.fn().mockResolvedValue(undefined),
      ticker: { start: vi.fn(), stop: vi.fn(), update: vi.fn() },
      destroy: vi.fn(),
    }

    mockPIXI = {
      isWebGLSupported: vi.fn().mockReturnValue(true),
      isWebGPUSupported: vi.fn().mockReturnValue(true),
      Application: vi.fn().mockImplementation(function () {
        return mockApp
      }),
      Container: vi.fn().mockImplementation(function () {
        return {}
      }),
      Assets: {
        load: vi.fn().mockResolvedValue({
          spineData: {
            animations: [{ name: 'wait' }, { name: 'talk' }],
          },
        }),
        add: vi.fn().mockResolvedValue(undefined),
        get: vi.fn(),
      },
      Graphics: vi.fn().mockImplementation(() => ({
        rect: vi.fn().mockReturnThis(),
        fill: vi.fn().mockReturnThis(),
      })),
    }

    // Assign mock PIXI to global
    ;(globalThis as any).window = globalThis
    ;(globalThis as any).PIXI = mockPIXI
    ;(globalThis as any).spine = {
      Spine: vi.fn().mockImplementation(() => ({
        state: { setAnimation: vi.fn(), clearTracks: vi.fn(), clearTrack: vi.fn() },
        getBounds: vi.fn().mockReturnValue({ offset: { x: 0, y: 0 }, size: { x: 100, y: 100 } }),
        position: { x: 0, y: 0 },
        scale: { x: 1, y: 1 },
      })),
    }

    // The component uses PIXI.Spine37.Spine.from
    mockPIXI.Spine37 = {
      Spine: {
        from: vi.fn().mockReturnValue({
          state: { setAnimation: vi.fn(), clearTracks: vi.fn(), clearTrack: vi.fn() },
          getBounds: vi.fn().mockReturnValue({ offset: { x: 0, y: 0 }, size: { x: 100, y: 100 } }),
          position: { x: 0, y: 0 },
          scale: { x: 1, y: 1 },
          autoUpdate: true,
          update: vi.fn(),
          skeleton: {
            setSkinByName: vi.fn(),
            setToSetupPose: vi.fn(),
            data: {
              animations: [{ name: 'wait' }, { name: 'talk' }],
            },
          },
        }),
      },
    }

    // Reset module cache
    vi.resetModules()
  })

  it('should initialize app when loadSpine is called', async () => {
    const { useSpineRuntime } = await import('../useSpineRuntime')
    const canvasRef = ref(document.createElement('canvas'))

    const runtime = useSpineRuntime(canvasRef, ref('webgl'))

    await runtime.loadSpine('123', 'sml_cloth0')

    expect(mockPIXI.Application).toHaveBeenCalled()
    expect(mockApp.init).toHaveBeenCalled()
  })

  it('should use support idol urls for enzaId starting with 2', async () => {
    const { useSpineRuntime } = await import('../useSpineRuntime')
    const canvasRef = ref(document.createElement('canvas'))
    const runtime = useSpineRuntime(canvasRef, ref('webgpu'))

    await runtime.loadSpine('201', 'sml_cloth0')

    expect(mockPIXI.Assets.load).toHaveBeenCalledWith([
      {
        alias: 'skel_201_picture_motion',
        src: expect.stringContaining('/support_idols/picture_motion/201/data.json'),
      },
      {
        alias: 'atlas_201_picture_motion',
        src: expect.stringContaining('/support_idols/picture_motion/201/data.atlas'),
      },
    ])
  })

  it('should use sub_character urls when isSubCharacter is true', async () => {
    const { useSpineRuntime } = await import('../useSpineRuntime')
    const canvasRef = ref(document.createElement('canvas'))
    const runtime = useSpineRuntime(canvasRef, ref('webgpu'))

    await runtime.loadSpine('chara1.json', 'sml_cloth0', true)

    expect(mockPIXI.Assets.load).toHaveBeenCalledWith([
      { alias: 'skel_chara1', src: expect.stringContaining('/sub_characters/cb/chara1.json') },
      { alias: 'atlas_chara1', src: expect.stringContaining('/sub_characters/cb/chara1.atlas') },
    ])
  })

  it('should toggle animations correctly', async () => {
    const { useSpineRuntime } = await import('../useSpineRuntime')
    const canvasRef = ref(document.createElement('canvas'))
    const runtime = useSpineRuntime(canvasRef, ref('webgpu'))

    await runtime.loadSpine('123', 'sml_cloth0') // Loads 'wait' by default

    runtime.toggleAnimation(1, true) // Toggle 'talk'
    const talkAnimation = runtime.animations.value?.[1]
    expect(talkAnimation).toBeDefined()
    expect(talkAnimation!.checked).toBe(true)

    runtime.toggleAnimation(1, false) // Untoggle 'talk'
    expect(talkAnimation!.checked).toBe(false)
  })
})
