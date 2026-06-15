import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useUrlState } from '../useUrlState'

// Mock the localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString()
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  configurable: true,
})

// Original location to restore after each test
const originalLocation = window.location

describe('useUrlState', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, search: '' },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    })
  })

  it('should initialize with default values when url and storage are empty', () => {
    const state = useUrlState()

    expect(state.idolId.value).toBe(1)
    expect(state.enzaId.value).toBeUndefined()
    expect(state.dressType.value).toBeUndefined()
    expect(state.renderer.value).toBe('webgpu')
    expect(state.backgroundColor.value).toBe('#000000')
    expect(state.continuousShootingEnabled.value).toBe(false)
  })

  it('should parse valid values from URL', () => {
    window.location.search =
      '?idolId=5&enzaId=1234&dressType=sml_cloth0&renderer=webgl&bgColor=%23ff0000&continuousShootingEnabled=true'

    const state = useUrlState()

    expect(state.idolId.value).toBe(5)
    expect(state.enzaId.value).toBe('1234')
    expect(state.dressType.value).toBe('sml_cloth0')
    expect(state.renderer.value).toBe('webgl')
    expect(state.backgroundColor.value).toBe('#ff0000') // Note: %23 becomes #
    expect(state.continuousShootingEnabled.value).toBe(true)
  })

  it('should ignore invalid URL parameters', () => {
    window.location.search = '?idolId=abc&dressType=invalid_type&renderer=canvas&bgColor=red'

    const state = useUrlState()

    expect(state.idolId.value).toBe(1) // Default
    expect(state.dressType.value).toBeUndefined() // Default
    expect(state.renderer.value).toBe('webgpu') // Default
    expect(state.backgroundColor.value).toBe('#000000') // Default
  })

  it('should parse valid values from localStorage', () => {
    localStorageMock.setItem(
      'shinycolors-spine-viewer-state',
      JSON.stringify({
        idolId: 10,
        enzaId: '5678',
        dressType: 'big_cloth1',
        renderer: 'webgl',
        backgroundColor: '#00ff00',
        continuousShootingEnabled: true,
      })
    )

    const state = useUrlState()

    expect(state.idolId.value).toBe(10)
    expect(state.enzaId.value).toBe('5678')
    expect(state.dressType.value).toBe('big_cloth1')
    expect(state.renderer.value).toBe('webgl')
    expect(state.backgroundColor.value).toBe('#00ff00')
    expect(state.continuousShootingEnabled.value).toBe(true)
  })

  it('should fallback to empty/defaults when localStorage contains invalid JSON', () => {
    localStorageMock.setItem('shinycolors-spine-viewer-state', '{ invalid_json')

    const state = useUrlState()

    expect(state.idolId.value).toBe(1)
    expect(state.renderer.value).toBe('webgpu')
  })

  it('should prioritize URL parameters over localStorage', () => {
    // Set storage
    localStorageMock.setItem(
      'shinycolors-spine-viewer-state',
      JSON.stringify({
        idolId: 10,
        dressType: 'big_cloth1',
      })
    )

    // Set URL
    window.location.search = '?idolId=20&dressType=sml_cloth1'

    const state = useUrlState()

    expect(state.idolId.value).toBe(20) // URL wins
    expect(state.dressType.value).toBe('sml_cloth1') // URL wins
  })

  it('should merge URL and storage if some values are missing in URL', () => {
    localStorageMock.setItem(
      'shinycolors-spine-viewer-state',
      JSON.stringify({
        idolId: 10,
        renderer: 'webgl',
      })
    )

    window.location.search = '?idolId=20'

    const state = useUrlState()

    expect(state.idolId.value).toBe(20) // URL wins
    expect(state.renderer.value).toBe('webgl') // From storage
  })

  it('should persist state to localStorage when values change', async () => {
    const state = useUrlState()

    state.idolId.value = 99
    state.dressType.value = 'sml_cloth0'

    // Wait for the next tick as watch might be async/flush: pre
    await new Promise((resolve) => setTimeout(resolve, 0))

    const storedStr = localStorageMock.getItem('shinycolors-spine-viewer-state')
    expect(storedStr).toBeTruthy()

    const stored = JSON.parse(storedStr!)
    expect(stored.idolId).toBe(99)
    expect(stored.dressType).toBe('sml_cloth0')
  })

  it('should generate a correct share link', () => {
    const state = useUrlState()

    state.idolId.value = 5
    state.enzaId.value = '123'
    state.dressType.value = 'sml_cloth0'
    state.backgroundColor.value = '#112233'
    state.continuousShootingEnabled.value = true

    const link = state.getShareLink()
    const url = new URL(link)

    expect(url.origin).toBe('https://spine.shinycolors.moe')
    expect(url.searchParams.get('idolId')).toBe('5')
    expect(url.searchParams.get('enzaId')).toBe('123')
    expect(url.searchParams.get('dressType')).toBe('sml_cloth0')
    expect(url.searchParams.get('bgColor')).toBe('#112233')
    expect(url.searchParams.get('continuousShootingEnabled')).toBe('true')
  })
})
