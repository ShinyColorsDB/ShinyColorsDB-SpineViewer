import { config } from '@vue/test-utils'
import { vi } from 'vitest'

// Setup global mock for fetch
global.fetch = vi.fn()

// Setup global mock for URL object/methods if needed
global.URL.createObjectURL = vi.fn()
global.URL.revokeObjectURL = vi.fn()

// Silence console.warn/error during tests unless debugging
// vi.spyOn(console, 'warn').mockImplementation(() => {})
// vi.spyOn(console, 'error').mockImplementation(() => {})
