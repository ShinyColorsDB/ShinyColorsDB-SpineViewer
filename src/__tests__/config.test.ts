import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('config.ts', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('should use direct URLs when VITE_USE_PROXY is not true', async () => {
    vi.stubEnv('VITE_USE_PROXY', 'false')

    // We must dynamically import because config.ts evaluates import.meta.env on load
    const { config, getSpineUrl, API_BASE_URL, CF_BASE_URL } = await import('../config')

    expect(config.useProxy).toBe(false)
    expect(API_BASE_URL).toBe('https://api.shinycolors.moe/spine')
    expect(CF_BASE_URL).toBe('https://cf-static.shinycolors.moe')

    // Test getSpineUrl
    expect(getSpineUrl('/some/path')).toBe('https://cf-static.shinycolors.moe/spine/some/path')
    expect(getSpineUrl('some/path')).toBe('https://cf-static.shinycolors.moe/spine/some/path')
  })

  it('should use proxy paths when VITE_USE_PROXY is true', async () => {
    vi.stubEnv('VITE_USE_PROXY', 'true')

    const { config, getSpineUrl, API_BASE_URL, CF_BASE_URL } = await import('../config')

    expect(config.useProxy).toBe(true)
    expect(API_BASE_URL).toBe('/api')
    expect(CF_BASE_URL).toBe('/cf')

    // Test getSpineUrl
    expect(getSpineUrl('/some/path')).toBe('/spine/some/path')
    expect(getSpineUrl('some/path')).toBe('/spine/some/path')
  })
})
