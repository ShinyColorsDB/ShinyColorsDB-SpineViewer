import { ref, watch } from 'vue'
import type { UrlParams } from '../types'

const STATE_STORAGE_KEY = 'shinycolors-spine-viewer-state'

function isRenderer(value: unknown): value is 'webgl' | 'webgpu' {
  return value === 'webgl' || value === 'webgpu'
}

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)
}

function readUrlParams(): UrlParams {
  const urlParams = new URLSearchParams(window.location.search)
  const params: UrlParams = {}

  if (urlParams.has('idolId')) {
    const idolId = Number(urlParams.get('idolId'))
    if (!Number.isNaN(idolId)) {
      params.idolId = idolId
    }
  }

  const enzaId = urlParams.get('enzaId')
  if (enzaId) {
    params.enzaId = enzaId
  }

  const dressType = urlParams.get('dressType')
  if (dressType) {
    params.dressType = dressType
  }

  const renderer = urlParams.get('renderer')
  if (isRenderer(renderer)) {
    params.renderer = renderer
  }

  const backgroundColor = urlParams.get('bgColor')
  if (isHexColor(backgroundColor)) {
    params.backgroundColor = backgroundColor
  }

  if (urlParams.has('continuousShootingEnabled')) {
    params.continuousShootingEnabled = urlParams.get('continuousShootingEnabled') === 'true'
  }

  return params
}

function readStoredParams(): UrlParams {
  try {
    const raw = localStorage.getItem(STATE_STORAGE_KEY)
    if (!raw) return {}

    const parsed = JSON.parse(raw) as Partial<UrlParams>
    const params: UrlParams = {}

    if (typeof parsed.idolId === 'number' && !Number.isNaN(parsed.idolId)) {
      params.idolId = parsed.idolId
    }
    if (typeof parsed.enzaId === 'string' && parsed.enzaId) {
      params.enzaId = parsed.enzaId
    }
    if (typeof parsed.dressType === 'string' && parsed.dressType) {
      params.dressType = parsed.dressType
    }
    if (isRenderer(parsed.renderer)) {
      params.renderer = parsed.renderer
    }
    if (isHexColor(parsed.backgroundColor)) {
      params.backgroundColor = parsed.backgroundColor
    }
    if (typeof parsed.continuousShootingEnabled === 'boolean') {
      params.continuousShootingEnabled = parsed.continuousShootingEnabled
    }

    return params
  } catch {
    return {}
  }
}

function getInitialParams(): UrlParams {
  const url = readUrlParams()
  const storage = readStoredParams()
  return { ...storage, ...url }
}

function isMobileDevice(): boolean {
  return /(Android|iPhone|iPad)/i.test(navigator.userAgent)
}

export function useUrlState() {
  const initial = getInitialParams()
  const idolId = ref<number | undefined>(initial.idolId ?? 1)
  const enzaId = ref<string | undefined>(initial.enzaId)
  const dressType = ref<string | undefined>(initial.dressType)
  // Mobile devices always use WebGL regardless of stored preference:
  // WebGPU on Android (Vulkan/Dawn) has canvas format mismatch issues that
  // cause extract.canvas() to fail silently, breaking screenshot export.
  const renderer = ref<'webgl' | 'webgpu'>(
    isMobileDevice() ? 'webgl' : (initial.renderer ?? 'webgpu')
  )
  const backgroundColor = ref<string>(initial.backgroundColor ?? '#000000')
  const continuousShootingEnabled = ref<boolean>(initial.continuousShootingEnabled ?? false)
  const urlFlag = ref(false)

  function persistState() {
    const state: UrlParams = {
      idolId: idolId.value,
      enzaId: enzaId.value,
      dressType: dressType.value,
      renderer: renderer.value,
      backgroundColor: backgroundColor.value,
      continuousShootingEnabled: continuousShootingEnabled.value,
    }
    localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(state))
  }

  function getShareLink(): string {
    const params = new URLSearchParams()
    params.set('idolId', String(idolId.value ?? 1))
    if (enzaId.value) {
      params.set('enzaId', enzaId.value)
    }
    if (dressType.value) {
      params.set('dressType', dressType.value)
    }
    params.set('bgColor', backgroundColor.value)
    params.set('continuousShootingEnabled', String(continuousShootingEnabled.value))
    return `${window.location.origin}/?${params.toString()}`
  }

  watch(
    [idolId, enzaId, dressType, renderer, backgroundColor, continuousShootingEnabled],
    () => {
      persistState()
    },
    {
      immediate: true,
    }
  )

  return {
    idolId,
    enzaId,
    dressType,
    renderer,
    backgroundColor,
    continuousShootingEnabled,
    urlFlag,
    getShareLink,
  }
}
