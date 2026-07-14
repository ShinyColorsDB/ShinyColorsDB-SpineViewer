import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useExport } from '../useExport'

// Minimal valid 1×1 transparent PNG as a data URL for mocking extract.base64()
const MOCK_PNG_BASE64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

describe('useExport', () => {
  let mockApp: any
  let mockContainer: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockContainer = {
      children: [{}],
    }
    mockApp = {
      renderer: {
        extract: {
          base64: vi.fn().mockResolvedValue(MOCK_PNG_BASE64),
        },
      },
    }

    // Mock navigator.clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      writable: true,
      configurable: true,
    })

    // Mock document.createElement and anchor.click
    const originalCreateElement = document.createElement
    document.createElement = vi.fn((tagName) => {
      if (tagName === 'a') {
        return {
          download: '',
          href: '',
          click: vi.fn(),
        }
      }
      return originalCreateElement.call(document, tagName)
    }) as any

    // Mock URL.createObjectURL and revokeObjectURL
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    // fetch is called to convert the base64 data URL returned by extract.base64() into a Blob
    vi.mocked(fetch).mockResolvedValue({
      blob: vi.fn().mockResolvedValue(new Blob(['mock'], { type: 'image/png' })),
    } as any)
  })

  it('should successfully copy link to clipboard', async () => {
    const { copyLinkToClipboard } = useExport(
      () => null,
      () => null,
      () => '',
      () => ({ category: '', name: '', type: '' })
    )

    await copyLinkToClipboard('https://example.com')

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.com')
  })

  it('should generate a valid filename without invalid characters', async () => {
    const { saveImage } = useExport(
      () => mockApp,
      () => mockContainer,
      () => 'Idol:Name', // contains invalid ':'
      () => ({ category: 'Cat/egory', name: 'Dr"ess', type: 'Ty<p>e' }) // contains invalid '/', '"', '<', '>'
    )

    await saveImage()

    const anchor = (document.createElement as any).mock.results[0].value

    expect(mockApp.renderer.extract.base64).toHaveBeenCalledWith(mockContainer)
    expect(anchor.click).toHaveBeenCalled()
    expect(anchor.download).toBe('Idol_Name-Cat_egory-Dr_ess-Ty_p_e.png')
  })

  it('should throw error if app or container is missing', async () => {
    const { saveImage } = useExport(
      () => null, // missing app
      () => mockContainer,
      () => 'Idol',
      () => ({ category: 'A', name: 'B', type: 'C' })
    )

    await expect(saveImage()).rejects.toThrow('No content to export')
  })
})
