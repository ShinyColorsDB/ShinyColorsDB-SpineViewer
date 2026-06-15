export interface IdolInfo {
  idolId: number
  idolName: string
}

export interface DressInfo {
  idolId: number
  dressName: string
  dressType: string
  enzaId: string
  path?: string
  exist: boolean
  sml_Cloth0?: boolean
  sml_Cloth1?: boolean
  big_Cloth0?: boolean
  big_Cloth1?: boolean
}

export type DressTypeKey = 'sml_cloth0' | 'sml_cloth1' | 'big_cloth0' | 'big_cloth1'

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
  dressType?: DressTypeKey
  renderer?: 'webgl' | 'webgpu'
  backgroundColor?: string
  continuousShootingEnabled?: boolean
}

export const DRESS_TYPE_LABELS: Record<DressTypeKey, string> = {
  sml_cloth0: 'Q版_通常服',
  sml_cloth1: 'Q版_演出服',
  big_cloth0: '一般_通常服',
  big_cloth1: '一般_演出服',
}

export const DRESS_TYPE_MIGRATE: Record<DressTypeKey, string> = {
  sml_cloth0: 'cb',
  sml_cloth1: 'cb_costume',
  big_cloth0: 'stand',
  big_cloth1: 'stand_costume',
}
