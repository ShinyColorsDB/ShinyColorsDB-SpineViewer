import { describe, it, expect } from 'vitest'
import type { DressInfo } from '../../types'

// Extract the pure helper logic for testing (mirrors useViewerShared internals)
const SPINE_TYPE_LABELS: Record<string, string> = {
  cb: 'Q版_通常服',
  cb_costume: 'Q版_演出服',
  stand: '一般_通常服',
  stand_costume: '一般_演出服',
}

const ASSET_CATEGORY_LABELS: Record<string, string> = {
  idols: '',
  awake_idols: '覚醒',
  idol_evolution_skins: '進化',
}

const DEFAULT_TYPE_PREFERENCE = ['stand', 'stand_costume', 'cb', 'cb_costume']

function getSpineTypeLabel(spineType: string): string {
  return SPINE_TYPE_LABELS[spineType] ?? spineType
}

function buildAssetTypeLabel(category: string, spineType: string, index?: number): string {
  const categoryLabel = ASSET_CATEGORY_LABELS[category] ?? category
  const typeLabel = getSpineTypeLabel(spineType)
  if (categoryLabel && index !== undefined) {
    return `${categoryLabel}${index + 1}_${typeLabel}`
  }
  if (categoryLabel) {
    return `${categoryLabel}_${typeLabel}`
  }
  return typeLabel
}

function buildTypeOptionsFromAssets(assets: DressInfo['assets']) {
  if (!assets) return []
  const options: { value: string; label: string }[] = []

  if (assets.idols) {
    for (const entry of assets.idols) {
      if (entry.path) {
        options.push({ value: entry.path, label: buildAssetTypeLabel('idols', entry.type) })
      }
    }
  }
  if (assets.awake_idols) {
    for (const entry of assets.awake_idols) {
      if (entry.path) {
        options.push({ value: entry.path, label: buildAssetTypeLabel('awake_idols', entry.type) })
      }
    }
  }
  if (assets.idol_evolution_skins) {
    const byType = new Map<string, typeof assets.idol_evolution_skins>()
    for (const entry of assets.idol_evolution_skins) {
      if (!entry.path) continue
      const list = byType.get(entry.type) ?? []
      list.push(entry)
      byType.set(entry.type, list)
    }
    for (const [spineType, entries] of byType) {
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]!
        options.push({
          value: entry.path!,
          label: buildAssetTypeLabel('idol_evolution_skins', spineType, i),
        })
      }
    }
  }
  return options
}

function getDefaultAssetPath(assets: DressInfo['assets']): string | undefined {
  if (!assets?.idols) return undefined
  for (const preferred of DEFAULT_TYPE_PREFERENCE) {
    const entry = assets.idols.find((e) => e.type === preferred && e.path)
    if (entry) return entry.path
  }
  const first = assets.idols.find((e) => e.path)
  return first?.path
}

describe('buildTypeOptionsFromAssets', () => {
  it('should return empty array for undefined assets', () => {
    expect(buildTypeOptionsFromAssets(undefined as any)).toEqual([])
  })

  it('should build options from idols entries', () => {
    const assets: DressInfo['assets'] = {
      idols: [
        { path: 'spine/idols/cb/123/', type: 'cb' },
        { path: 'spine/idols/stand/123/', type: 'stand' },
      ],
    }
    const options = buildTypeOptionsFromAssets(assets)
    expect(options).toHaveLength(2)
    expect(options[0]).toEqual({ value: 'spine/idols/cb/123/', label: 'Q版_通常服' })
    expect(options[1]).toEqual({ value: 'spine/idols/stand/123/', label: '一般_通常服' })
  })

  it('should include awake_idols entries with category prefix', () => {
    const assets: DressInfo['assets'] = {
      idols: [{ path: 'spine/idols/stand/123/', type: 'stand' }],
      awake_idols: [{ path: 'spine/awake_idols/stand_costume/123/', type: 'stand_costume' }],
    }
    const options = buildTypeOptionsFromAssets(assets)
    expect(options).toHaveLength(2)
    expect(options[1]).toEqual({
      value: 'spine/awake_idols/stand_costume/123/',
      label: '覚醒_一般_演出服',
    })
  })

  it('should include idol_evolution_skins with indexed labels', () => {
    const assets: DressInfo['assets'] = {
      idols: [{ path: 'spine/idols/stand/123/', type: 'stand' }],
      idol_evolution_skins: [
        { path: 'spine/idol_evolution_skins/cb_costume/12301/', type: 'cb_costume' },
        { path: 'spine/idol_evolution_skins/cb_costume/12302/', type: 'cb_costume' },
      ],
    }
    const options = buildTypeOptionsFromAssets(assets)
    expect(options).toHaveLength(3)
    expect(options[1]).toEqual({
      value: 'spine/idol_evolution_skins/cb_costume/12301/',
      label: '進化1_Q版_演出服',
    })
    expect(options[2]).toEqual({
      value: 'spine/idol_evolution_skins/cb_costume/12302/',
      label: '進化2_Q版_演出服',
    })
  })

  it('should skip entries without path', () => {
    const assets: DressInfo['assets'] = {
      idols: [
        { type: 'cb' }, // no path
        { path: 'spine/idols/stand/123/', type: 'stand' },
      ],
    }
    const options = buildTypeOptionsFromAssets(assets)
    expect(options).toHaveLength(1)
    expect(options[0]!.value).toBe('spine/idols/stand/123/')
  })
})

describe('getDefaultAssetPath', () => {
  it('should prefer stand type', () => {
    const assets: DressInfo['assets'] = {
      idols: [
        { path: 'spine/idols/cb/123/', type: 'cb' },
        { path: 'spine/idols/stand/123/', type: 'stand' },
      ],
    }
    expect(getDefaultAssetPath(assets)).toBe('spine/idols/stand/123/')
  })

  it('should fallback to stand_costume if no stand', () => {
    const assets: DressInfo['assets'] = {
      idols: [
        { path: 'spine/idols/cb_costume/123/', type: 'cb_costume' },
        { path: 'spine/idols/stand_costume/123/', type: 'stand_costume' },
      ],
    }
    expect(getDefaultAssetPath(assets)).toBe('spine/idols/stand_costume/123/')
  })

  it('should fallback to first available if no preferred type', () => {
    const assets: DressInfo['assets'] = {
      idols: [{ path: 'spine/idols/something/123/', type: 'something' }],
    }
    expect(getDefaultAssetPath(assets)).toBe('spine/idols/something/123/')
  })

  it('should return undefined for empty idols', () => {
    const assets: DressInfo['assets'] = { idols: [] }
    expect(getDefaultAssetPath(assets)).toBeUndefined()
  })
})
