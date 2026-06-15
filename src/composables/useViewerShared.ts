import { computed, nextTick, onMounted, ref, watch, type Ref } from 'vue'
import { useExport } from './useExport'
import { useIdolData } from './useIdolData'
import { useSpineRuntime } from './useSpineRuntime'
import { useUrlState } from './useUrlState'
import type { DressInfo, DressTypeKey, IdolInfo } from '../types'
import { DRESS_TYPE_LABELS } from '../types'

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

const DRESS_TYPE_FIELDS: Array<{ value: DressTypeKey; field: keyof DressInfo }> = [
  { value: 'sml_cloth0', field: 'sml_Cloth0' },
  { value: 'sml_cloth1', field: 'sml_Cloth1' },
  { value: 'big_cloth0', field: 'big_Cloth0' },
  { value: 'big_cloth1', field: 'big_Cloth1' },
]

const DRESS_TYPE_FALLBACK_ORDER: DressTypeKey[] = [
  'big_cloth0',
  'big_cloth1',
  'sml_cloth0',
  'sml_cloth1',
]

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
    return Object.entries(groups).map(([label, items]) => ({ label, items }))
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

  const typeList = computed(() => {
    if (!currentDress.value) return []
    return resolveAvailableDressTypes(currentDress.value).map((value) => ({
      value,
      label: DRESS_TYPE_LABELS[value],
    }))
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

  function getDefaultDressType(dress: DressInfo): DressTypeKey {
    const availableTypes = resolveAvailableDressTypes(dress)
    const preferredType = DRESS_TYPE_FALLBACK_ORDER.find((type) => availableTypes.includes(type))
    return preferredType ?? 'big_cloth0'
  }

  async function loadCurrentSpine() {
    const dress = currentDress.value
    if (!dress) return

    enzaId.value = dress.enzaId

    const availableTypes = resolveAvailableDressTypes(dress)
    const type =
      dressType.value && availableTypes.includes(dressType.value)
        ? dressType.value
        : getDefaultDressType(dress)
    dressType.value = type

    if (dress.idolId === 0 && dress.path) {
      await loadSpine(dress.path, type, true)
      setBackgroundColor(backgroundColor.value)
      return
    }

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

  async function handleTypeChange(newType: DressTypeKey) {
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
      void handleTypeChange(value as DressTypeKey)
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
function resolveAvailableDressTypes(dress: DressInfo | undefined): DressTypeKey[] {
  if (!dress) return []

  const availableTypes = DRESS_TYPE_FIELDS.filter(({ field }) => Boolean(dress[field])).map(
    ({ value }) => value
  )

  return availableTypes.length > 0 ? availableTypes : DRESS_TYPE_FALLBACK_ORDER
}
