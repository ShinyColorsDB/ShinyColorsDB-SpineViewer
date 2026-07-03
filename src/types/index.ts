export interface IdolInfo {
  idolId: number
  idolName: string
}

export interface SpineAssetEntry {
  path?: string
  type: string
}

export interface DressAssets {
  idols: SpineAssetEntry[]
  awake_idols?: SpineAssetEntry[]
  idol_evolution_skins?: SpineAssetEntry[]
  support_idols?: SpineAssetEntry[]
}

export interface DressInfo {
  idolId: number
  dressName: string
  dressType: string
  enzaId: string
  assets: DressAssets
  exist: boolean
}

export interface AnimationItem {
  name: string
  trackIndex: number
  checked: boolean
}

export interface SpineState {
  label: string
  animations: AnimationItem[]
}

export interface UrlParams {
  idolId?: number
  enzaId?: string
  dressType?: string
  renderer?: 'webgl' | 'webgpu'
  backgroundColor?: string
  continuousShootingEnabled?: boolean
}
