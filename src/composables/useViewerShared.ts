import { computed, nextTick, onMounted, ref, watch, type Ref } from 'vue'
import { useExport } from './useExport'
import { useIdolData } from './useIdolData'
import { useSpineRuntime } from './useSpineRuntime'
import { useUrlState } from './useUrlState'
import type { DressInfo, IdolInfo, SpineAssetEntry } from '../types'

declare global {
  interface Window {
    PIXI: any
  }
}

export type ViewerSelectOption = {
  label: string
  value: string | number
  disabled?: boolean
}

export type ViewerSelectGroupOption = {
  type: 'group'
  label: string
  key: string
  children: ViewerSelectOption[]
}

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
  support_idols: 'サポート',
}

const DEFAULT_TYPE_PREFERENCE = ['stand', 'stand_costume', 'cb', 'cb_costume']

interface TypeOption {
  value: string
  label: string
}

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

function buildTypeOptionsFromAssets(assets: DressInfo['assets']): TypeOption[] {
  if (!assets) return []

  const options: TypeOption[] = []

  // idols entries
  if (assets.idols) {
    for (const entry of assets.idols) {
      if (entry.path) {
        options.push({
          value: entry.path,
          label: buildAssetTypeLabel('idols', entry.type),
        })
      }
    }
  }

  // awake_idols entries
  if (assets.awake_idols) {
    for (const entry of assets.awake_idols) {
      if (entry.path) {
        options.push({
          value: entry.path,
          label: buildAssetTypeLabel('awake_idols', entry.type),
        })
      }
    }
  }

  // idol_evolution_skins entries (grouped by type with indices)
  if (assets.idol_evolution_skins) {
    const byType = new Map<string, SpineAssetEntry[]>()
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

  // support_idols entries
  if (assets.support_idols) {
    for (const entry of assets.support_idols) {
      if (entry.path) {
        options.push({
          value: entry.path,
          label: buildAssetTypeLabel('support_idols', entry.type),
        })
      }
    }
  }

  return options
}

function getDefaultAssetPath(assets: DressInfo['assets']): string | undefined {
  if (!assets) return undefined

  // Prefer support_idols stand_costume (サポート_一般_通常服) if available
  if (assets.support_idols) {
    const supportEntry = assets.support_idols.find((e) => e.type === 'stand' && e.path) || assets.support_idols.find((e) => e.type === 'picture_motion' && e.path)
    if (supportEntry) {
      return supportEntry.path
    }
    else {
      // return first element
      const firstSupportEntry = assets.support_idols.find((e) => e.path)
      if (firstSupportEntry) {
        return firstSupportEntry.path
      }
    }
  }

  if (!assets.idols) return undefined

  for (const preferred of DEFAULT_TYPE_PREFERENCE) {
    const entry = assets.idols.find((e) => e.type === preferred && e.path)
    if (entry) return entry.path
  }

  // Fallback to first entry with a path
  const first = assets.idols.find((e) => e.path)
  return first?.path
}

export function useViewerShared(canvasElementRef: Ref<HTMLCanvasElement | null>) {
  const {
    idolId,
    enzaId,
    dressType,
    renderer,
    backgroundColor,
    continuousShootingEnabled,
    urlFlag,
    getShareLink,
  } = useUrlState()
  const { idolInfoMap, idolDressMap, fetchIdolList, fetchDressList, getIdolName } = useIdolData()

  const {
    app,
    container,
    animations,
    error,
    loading,
    isContinuousShootingEnabled,
    loadDroppedSpine,
    loadSpine,
    resetAllAnimation,
    setBackgroundColor,
    toggleAnimation,
    destroy,
  } = useSpineRuntime(canvasElementRef, renderer)

  isContinuousShootingEnabled.value = continuousShootingEnabled.value

  const idolList = computed<IdolInfo[]>(() => {
    if (!idolInfoMap.value) return []
    return Array.from(idolInfoMap.value.values())
  })

  const dressList = computed<DressInfo[]>(() => {
    const idolName = getIdolName(idolId.value ?? 1)
    if (!idolName) return []
    return idolDressMap.value.get(idolName) ?? []
  })

  const dressListGroupedByType = computed(() => {
    const groups: Record<string, (DressInfo & { index: number })[]> = {}
    dressList.value.forEach((dress, index) => {
      const groupKey = dress.dressType || 'unknown'
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push({ ...dress, index })
    })
    const DRESS_TYPE_ORDER: string[] = [
      'P_UR',
      'S_UR',
      'P_SSR',
      'S_SSR',
      'P_SR',
      'Mizugi',
      'Special',
      'Anniversary',
      'FesReward',
      'FesTour',
    ]
    return Object.entries(groups)
      .sort(([a], [b]) => {
        const aIdx = DRESS_TYPE_ORDER.indexOf(a)
        const bIdx = DRESS_TYPE_ORDER.indexOf(b)
        const aOrder = aIdx >= 0 ? aIdx : DRESS_TYPE_ORDER.length
        const bOrder = bIdx >= 0 ? bIdx : DRESS_TYPE_ORDER.length
        return aOrder - bOrder
      })
      .map(([label, items]) => ({ label, items }))
  })

  const idolOptions = computed<ViewerSelectOption[]>(() =>
    idolList.value.map((idol) => ({
      label: idol.idolName,
      value: idol.idolId,
    }))
  )

  const dressOptions = computed<ViewerSelectGroupOption[]>(() =>
    dressListGroupedByType.value.map((group) => ({
      type: 'group',
      label: group.label,
      key: group.label,
      children: group.items.map((item) => ({
        label: item.dressName,
        value: item.index,
        disabled: !item.exist,
      })),
    }))
  )

  const selectedDressIndex = ref(0)

  const currentDress = computed<DressInfo | undefined>(
    () => dressList.value[selectedDressIndex.value]
  )

  const typeList = computed<TypeOption[]>(() => {
    if (!currentDress.value) return []
    return buildTypeOptionsFromAssets(currentDress.value.assets)
  })

  const typeOptions = computed<ViewerSelectOption[]>(() =>
    typeList.value.map((item) => ({
      label: item.label,
      value: item.value,
    }))
  )

  const { copyLinkToClipboard, saveImage } = useExport(
    () => app.value,
    () => container.value,
    () => idolInfoMap.value?.get(idolId.value ?? 1)?.idolName ?? '',
    () => {
      const dress = currentDress.value
      const type = typeList.value.find((item) => item.value === dressType.value)
      const dressInfo = dressListGroupedByType.value.find((group) =>
        group.items.some((item) => item.index === selectedDressIndex.value)
      )
      return {
        category: dressInfo?.label ?? '',
        name: dress?.dressName ?? '',
        type: type?.label ?? '',
      }
    }
  )

  const showAnimationDrawer = ref(false)
  const showCopiedToast = ref(false)
  const showThanksModal = ref(false)
  const showWebGLModal = ref(false)
  const saveError = ref<string | null>(null)

  async function initialize() {
    const PIXI = window.PIXI
    if (!PIXI.isWebGLSupported() && !PIXI.isWebGPUSupported()) {
      showWebGLModal.value = true
    }

    await fetchIdolList()
    await loadInitialDress()
  }

  async function loadInitialDress() {
    const idolName = getIdolName(idolId.value ?? 1)
    if (!idolName) return

    const dresses = await fetchDressList(idolId.value ?? 1, idolName)

    if (!urlFlag.value && enzaId.value) {
      const idx = dresses.findIndex((dress) => dress.enzaId === enzaId.value)
      if (idx >= 0) {
        selectedDressIndex.value = idx
      }
      urlFlag.value = true
    }

    await loadCurrentSpine()
  }

  async function loadCurrentSpine() {
    const dress = currentDress.value
    if (!dress) return

    enzaId.value = dress.enzaId

    const availableTypes = typeList.value.map((t) => t.value)
    const type =
      dressType.value && availableTypes.includes(dressType.value)
        ? dressType.value
        : getDefaultAssetPath(dress.assets)
    dressType.value = type

    if (!type) return

    await loadSpine(dress.enzaId, type)
    setBackgroundColor(backgroundColor.value)
  }

  async function handleIdolChange(newIdolId: number) {
    idolId.value = newIdolId
    selectedDressIndex.value = 0
    dressType.value = undefined

    const idolName = getIdolName(newIdolId)
    if (!idolName) return

    await fetchDressList(newIdolId, idolName)
    await nextTick()
    await loadCurrentSpine()
  }

  async function handleDressChange(newIndex: number) {
    selectedDressIndex.value = newIndex
    await loadCurrentSpine()
  }

  async function handleTypeChange(newType: string) {
    dressType.value = newType
    await loadCurrentSpine()
  }

  function updateIdol(value: string | number | null) {
    if (typeof value === 'number') {
      void handleIdolChange(value)
    }
  }

  function updateDress(value: string | number | null) {
    if (typeof value === 'number') {
      void handleDressChange(value)
    }
  }

  function updateType(value: string | number | null) {
    if (typeof value === 'string') {
      void handleTypeChange(value)
    }
  }

  function handleColorChange(color: string) {
    backgroundColor.value = color
    setBackgroundColor(color)
  }

  function handleShare() {
    const link = getShareLink()
    void copyLinkToClipboard(link)
    showCopiedToast.value = true
    setTimeout(() => {
      showCopiedToast.value = false
    }, 2000)
  }

  async function handleSave() {
    try {
      saveError.value = null
      await saveImage()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to save image'
      saveError.value = message
      console.error('Save image failed:', e)
    }
  }

  function openDatabase() {
    window.open('https://shinycolors.moe', '_blank', 'noopener,noreferrer')
  }

  function handleDrop(atlas: string, json: string, textures: Map<string, File>) {
    void loadDroppedSpine(atlas, json, textures)
  }

  function handleAnimationToggle(trackIndex: number, checked: boolean) {
    toggleAnimation(trackIndex, checked)
  }

  function handleAnimationReset() {
    resetAllAnimation()
  }

  function handleContinuousShootingChange(enabled: boolean) {
    continuousShootingEnabled.value = enabled
    isContinuousShootingEnabled.value = enabled
  }

  watch(backgroundColor, (color) => {
    setBackgroundColor(color)
  })

  watch(continuousShootingEnabled, (enabled) => {
    isContinuousShootingEnabled.value = enabled
  })

  onMounted(() => {
    void initialize()
  })

  return {
    animations,
    backgroundColor,
    dressType,
    dressOptions,
    error,
    handleAnimationReset,
    handleAnimationToggle,
    handleColorChange,
    handleContinuousShootingChange,
    handleDrop,
    handleSave,
    handleShare,
    idolId,
    idolOptions,
    isContinuousShootingEnabled,
    loading,
    openDatabase,
    saveError,
    selectedDressIndex,
    showAnimationDrawer,
    showCopiedToast,
    showThanksModal,
    showWebGLModal,
    typeOptions,
    updateDress,
    updateIdol,
    updateType,
    destroy,
  }
}
