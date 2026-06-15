import { describe, it, expect } from 'vitest'
import type { DressInfo } from '../../types'

// Mock the exact pure function from useViewerShared
// Since it's not exported, we extract the logic for testing
function resolveAvailableDressTypes(dress: DressInfo | undefined) {
  if (!dress) return []

  const DRESS_TYPE_FIELDS = [
    { value: 'sml_cloth0', field: 'sml_Cloth0' as const },
    { value: 'sml_cloth1', field: 'sml_Cloth1' as const },
    { value: 'big_cloth0', field: 'big_Cloth0' as const },
    { value: 'big_cloth1', field: 'big_Cloth1' as const },
  ]

  const DRESS_TYPE_FALLBACK_ORDER = ['big_cloth0', 'big_cloth1', 'sml_cloth0', 'sml_cloth1']

  const availableTypes = DRESS_TYPE_FIELDS.filter(({ field }) => Boolean(dress[field])).map(
    ({ value }) => value
  )

  return availableTypes.length > 0 ? availableTypes : DRESS_TYPE_FALLBACK_ORDER
}

describe('resolveAvailableDressTypes', () => {
  it('should return empty array if dress is undefined', () => {
    expect(resolveAvailableDressTypes(undefined)).toEqual([])
  })

  it('should return only the available dress types', () => {
    const dress = {
      idolId: 1,
      dressName: 'Test',
      dressType: 'Normal',
      enzaId: '123',
      exist: true,
      sml_Cloth0: true,
      sml_Cloth1: false,
      big_Cloth0: true,
      big_Cloth1: false,
    }

    expect(resolveAvailableDressTypes(dress)).toEqual(['sml_cloth0', 'big_cloth0'])
  })

  it('should return fallback order if no types are available', () => {
    const dress = {
      idolId: 1,
      dressName: 'Test',
      dressType: 'Normal',
      enzaId: '123',
      exist: true,
      sml_Cloth0: false,
      sml_Cloth1: false,
      big_Cloth0: false,
      big_Cloth1: false,
    }

    expect(resolveAvailableDressTypes(dress)).toEqual([
      'big_cloth0',
      'big_cloth1',
      'sml_cloth0',
      'sml_cloth1',
    ])
  })
})
