import { describe, it, expect, vi, beforeEach } from 'vitest'
// import { useIdolData } from '../useIdolData'
import { API_BASE_URL, CF_BASE_URL } from '../../config'
import type { IdolInfo, DressInfo } from '../../types'

describe('useIdolData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules() // Reset the module-level ref cache
  })

  it('should fetch and cache idol list', async () => {
    // Reset cache dynamically importing module again
    const module = await import('../useIdolData')
    const { useIdolData } = module

    const mockIdolData: IdolInfo[] = [
      { idolId: 1, idolName: 'Mano' },
      { idolId: 2, idolName: 'Hiori' },
    ]

    ;(globalThis.fetch as any).mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue(mockIdolData),
    })

    const { fetchIdolList } = useIdolData()

    const map1 = await fetchIdolList()
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    expect(globalThis.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/idollist`)
    expect(map1.get(1)!.idolName).toBe('Mano')
    expect(map1.get(2)!.idolName).toBe('Hiori')

    // Second call should return cached data without fetching
    const map2 = await fetchIdolList()
    expect(globalThis.fetch).toHaveBeenCalledTimes(1) // Still 1
    expect(map2).toEqual(map1) // Same Map instance
  })

  it('should fetch and cache dress list for normal idol', async () => {
    const module = await import('../useIdolData')
    const { useIdolData } = module

    const mockDressData: DressInfo[] = [
      { idolId: 1, dressName: 'Dress 1', dressType: 'type1', enzaId: '101', exist: true },
    ]

    ;(globalThis.fetch as any).mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue(mockDressData),
    })

    const { fetchDressList } = useIdolData()

    const list1 = await fetchDressList(1, 'Mano')
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    expect(globalThis.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/dressList?idolId=1`)
    expect(list1).toHaveLength(1)
    expect(list1[0]).toBeDefined()
    expect(list1[0]!.dressName).toBe('Dress 1')

    // Second call for same idol should return cached data
    const list2 = await fetchDressList(1, 'Mano')
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    expect(list2).toEqual(list1)
  })

  it('should fetch hazuki data from special endpoint when idolId is 91', async () => {
    const module = await import('../useIdolData')
    const { useIdolData } = module

    const mockHazukiData: DressInfo[] = [
      { idolId: 91, dressName: 'Hazuki Normal', dressType: 'type', enzaId: '91', exist: true },
    ]

    ;(globalThis.fetch as any).mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue(mockHazukiData),
    })

    const { fetchDressList } = useIdolData()

    const list = await fetchDressList(91, 'Hazuki')
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    expect(globalThis.fetch).toHaveBeenCalledWith(`${CF_BASE_URL}/others/hazuki.json`)
    expect(list).toHaveLength(1)
    expect(list[0]).toBeDefined()
    expect(list[0]!.dressName).toBe('Hazuki Normal')
  })

  it('should handle fetch errors and update error state', async () => {
    const module = await import('../useIdolData')
    const { useIdolData } = module

    const mockError = new Error('Network error')
    ;(globalThis.fetch as any).mockRejectedValueOnce(mockError)

    const { fetchIdolList, error } = useIdolData()

    await expect(fetchIdolList()).rejects.toThrow('Network error')
    expect(error.value).toBe(mockError)
  })
})
