import { describe, it, expect, vi, beforeEach } from 'vitest'
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
        width: 800,
        height: 600,
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
        return {
          removeChildren: vi.fn(),
          addChild: vi.fn(),
          scale: { set: vi.fn() },
          pivot: { set: vi.fn() },
          position: { set: vi.fn() },
        }
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
      Graphics: vi.fn().mockImplementation(function () {
        return {
          rect: vi.fn().mockReturnThis(),
          fill: vi.fn().mockReturnThis(),
          alpha: 0,
          context: {
            moveTo: vi.fn().mockReturnThis(),
            lineTo: vi.fn().mockReturnThis(),
          },
          stroke: vi.fn(),
          getLocalBounds: vi.fn().mockReturnValue({ width: 100, height: 100, x: 0, y: 0 }),
        }
      }),
      Sprite: {
        from: vi.fn().mockReturnValue({
          alpha: 0,
          width: 0,
          height: 0,
          position: { set: vi.fn() },
        }),
      },
      Texture: { EMPTY: {} },
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
          getLocalBounds: vi.fn().mockReturnValue({ width: 100, height: 100, x: 0, y: 0 }),
          position: { set: vi.fn(), x: 0, y: 0 },
          scale: { x: 1, y: 1 },
          autoUpdate: true,
          update: vi.fn(),
          skeleton: {
            setSkinByName: vi.fn(),
            setToSetupPose: vi.fn(),
            slots: [],
            data: {
              animations: [{ name: 'wait' }, { name: 'talk' }],
              width: 100,
              height: 100,
            },
          },
        }),
      },
      MeshAttachment: class {},
    }

    // Reset module cache
    vi.resetModules()
  })

  it('should initialize app when loadSpine is called', async () => {
    const { useSpineRuntime } = await import('../useSpineRuntime')
    const canvasRef = ref(document.createElement('canvas'))

    const runtime = useSpineRuntime(canvasRef, ref('webgl'))

    await runtime.loadSpine('1040030010', 'spine/idols/stand/1040030010/')

    expect(mockPIXI.Application).toHaveBeenCalled()
    expect(mockApp.init).toHaveBeenCalled()
  })

  it('should use assetPath directly to construct URLs', async () => {
    const { useSpineRuntime } = await import('../useSpineRuntime')
    const canvasRef = ref(document.createElement('canvas'))
    const runtime = useSpineRuntime(canvasRef, ref('webgpu'))

    await runtime.loadSpine('1040030010', 'spine/idols/cb/1040030010/')

    expect(mockPIXI.Assets.load).toHaveBeenCalledWith([
      {
        alias: expect.stringContaining('skel_'),
        src: expect.stringContaining('/spine/idols/cb/1040030010/data.json'),
      },
      {
        alias: expect.stringContaining('atlas_'),
        src: expect.stringContaining('/spine/idols/cb/1040030010/data.atlas'),
      },
    ])
  })

  it('should use awake_idols path directly', async () => {
    const { useSpineRuntime } = await import('../useSpineRuntime')
    const canvasRef = ref(document.createElement('canvas'))
    const runtime = useSpineRuntime(canvasRef, ref('webgpu'))

    await runtime.loadSpine('1040030110', 'spine/awake_idols/cb_costume/1040030110/')

    expect(mockPIXI.Assets.load).toHaveBeenCalledWith([
      {
        alias: expect.stringContaining('skel_'),
        src: expect.stringContaining('/spine/awake_idols/cb_costume/1040030110/data.json'),
      },
      {
        alias: expect.stringContaining('atlas_'),
        src: expect.stringContaining('/spine/awake_idols/cb_costume/1040030110/data.atlas'),
      },
    ])
  })

  it('should cache spine data and reuse on second load', async () => {
    const { useSpineRuntime } = await import('../useSpineRuntime')
    const canvasRef = ref(document.createElement('canvas'))
    const runtime = useSpineRuntime(canvasRef, ref('webgpu'))

    await runtime.loadSpine('123', 'spine/idols/stand/123/')
    await runtime.loadSpine('123', 'spine/idols/stand/123/')

    // Assets.load should only be called once for the same path
    expect(mockPIXI.Assets.load).toHaveBeenCalledTimes(1)
  })

  it('should toggle animations correctly', async () => {
    const { useSpineRuntime } = await import('../useSpineRuntime')
    const canvasRef = ref(document.createElement('canvas'))
    const runtime = useSpineRuntime(canvasRef, ref('webgpu'))

    await runtime.loadSpine('123', 'spine/idols/stand/123/')

    runtime.toggleAnimation(1, true) // Toggle 'talk'
    const talkAnimation = runtime.animations.value?.[1]
    expect(talkAnimation).toBeDefined()
    expect(talkAnimation!.checked).toBe(true)

    runtime.toggleAnimation(1, false) // Untoggle 'talk'
    expect(talkAnimation!.checked).toBe(false)
  })
})
