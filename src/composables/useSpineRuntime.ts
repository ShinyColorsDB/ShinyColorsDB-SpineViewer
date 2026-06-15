import { ref, shallowRef, type Ref } from 'vue'
import type { DressTypeKey, AnimationItem } from '../types'
import { DRESS_TYPE_MIGRATE } from '../types'
import { getSpineUrl } from '../config'

declare global {
  interface Window {
    PIXI: any
  }
}

const spineCache = new Map<string, string>()
const isContinuousShootingEnabled = ref(false)

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.readAsDataURL(blob)
  })
}

export function useSpineRuntime(
  canvasRef: Ref<HTMLCanvasElement | null>,
  rendererPreference: Ref<'webgl' | 'webgpu'>
) {
  const app = shallowRef<any>(null)
  const container = shallowRef<any>(null)
  const currentSpine = shallowRef<any>(null)
  const animations = ref<AnimationItem[]>([])
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const initialized = ref(false)

  async function initApp() {
    if (initialized.value || !canvasRef.value) return

    const PIXI = window.PIXI

    if (!PIXI.isWebGLSupported() && !PIXI.isWebGPUSupported()) {
      error.value = new Error('WebGL/WebGPU is not supported')
      return
    }

    const appInstance = new PIXI.Application()
    await appInstance.init({
      preference: rendererPreference.value,
      view: canvasRef.value,
      width: canvasRef.value.clientWidth - 1,
      height: canvasRef.value.clientHeight - 1,
      preserveDrawingBuffer: true,
    })

    app.value = appInstance
    container.value = new PIXI.Container()
    appInstance.stage.addChild(container.value)
    initialized.value = true

    console.log(`ShinyColors Spine Viewer (${appInstance.renderer.name})`)
  }

  function setBackgroundColor(color: string) {
    if (app.value) {
      const colorNumber = parseInt(color.replace('#', ''), 16)
      app.value.renderer.background.color = isNaN(colorNumber) ? 0x000000 : colorNumber
    }
  }

  async function loadSpine(enzaId: string, type: DressTypeKey, isSubCharacter = false) {
    if (!initialized.value) await initApp()

    let cacheKey: string
    if (isSubCharacter) cacheKey = `${enzaId}/sub_character`
    else if (enzaId[0] === '2') cacheKey = `${enzaId}/support_idol`
    else cacheKey = `${enzaId}/${type}`

    if (spineCache.has(cacheKey)) {
      await setupAnimationList(spineCache.get(cacheKey)!, type)
      return
    }

    loading.value = true
    error.value = null

    try {
      const PIXI = window.PIXI
      let label: string
      let skelUrl: string
      let atlasUrl: string

      if (isSubCharacter) {
        label = enzaId.replace('.json', '')
        const baseType = DRESS_TYPE_MIGRATE[type]
        skelUrl = getSpineUrl(`/sub_characters/${baseType}/${enzaId}`)
        atlasUrl = skelUrl.replace('.json', '.atlas')
        spineCache.set(cacheKey, label)
      } else if (enzaId[0] === '2') {
        label = `${enzaId}_picture_motion`
        skelUrl = getSpineUrl(`/support_idols/picture_motion/${enzaId}/data.json`)
        atlasUrl = getSpineUrl(`/support_idols/picture_motion/${enzaId}/data.atlas`)
        spineCache.set(cacheKey, label)
      } else {
        label = `${enzaId}_${type}`
        const baseType = DRESS_TYPE_MIGRATE[type]
        skelUrl = getSpineUrl(`/idols/${baseType}/${enzaId}/data.json`)
        atlasUrl = getSpineUrl(`/idols/${baseType}/${enzaId}/data.atlas`)
        spineCache.set(cacheKey, label)
      }

      await PIXI.Assets.load([
        { alias: `skel_${label}`, src: skelUrl },
        { alias: `atlas_${label}`, src: atlasUrl },
      ])

      await setupAnimationList(label, type)
    } catch (e) {
      error.value = e as Error
      console.error('Failed to load spine:', e)
    } finally {
      loading.value = false
    }
  }

  async function setupAnimationList(spineLabel: string, dressType?: DressTypeKey) {
    const PIXI = window.PIXI

    const spine = PIXI.Spine37.Spine.from({
      skeleton: `skel_${spineLabel}`,
      atlas: `atlas_${spineLabel}`,
    })

    currentSpine.value = spine

    try {
      spine.skeleton.setSkinByName('normal')
    } catch {
      spine.skeleton.setSkinByName('default')
    }

    const anims: AnimationItem[] = []
    let hasWait = false

    for (const [index, animation] of spine.skeleton.data.animations.entries()) {
      const name = animation.name
      const isWait = name === 'wait'
      if (isWait) hasWait = true

      anims.push({
        name,
        trackIndex: index,
        checked: isWait,
      })

      if (isWait) spine.state.setAnimation(index, name, true)
    }

    if (!hasWait && anims.length > 0) {
      const firstAnim = anims[0]
      if (firstAnim) {
        firstAnim.checked = true
        spine.state.setAnimation(0, firstAnim.name, true)
      }
    }

    animations.value = anims
    await renderToStage(spine, dressType)
  }

  function toggleAnimation(trackIndex: number, checked: boolean) {
    if (!currentSpine.value) return

    const anim = animations.value.find((a) => a.trackIndex === trackIndex)
    if (anim) {
      anim.checked = checked
    } else {
      console.warn(`Animation with trackIndex ${trackIndex} not found`)
      return
    }

    if (checked) currentSpine.value.state.setAnimation(trackIndex, anim.name, true)
    else currentSpine.value.state.clearTrack(trackIndex)

    if (!currentSpine.value.autoUpdate) {
      currentSpine.value.skeleton.setToSetupPose()
      currentSpine.value.update(0)
      currentSpine.value.autoUpdate = true
    }
  }

  function resetAllAnimation() {
    let hasWait = false
    for (const anim of animations.value) {
      if (anim.name === 'wait') {
        anim.checked = true
        hasWait = true
      } else {
        anim.checked = false
      }
    }

    if (currentSpine.value) {
      currentSpine.value.state.clearTracks()
      currentSpine.value.skeleton.setToSetupPose()
      currentSpine.value.lastTime = null

      if (hasWait) {
        const waitAnim = animations.value.find((a) => a.name === 'wait')
        if (waitAnim) currentSpine.value.state.setAnimation(waitAnim.trackIndex, 'wait', true)
      } else if (animations.value.length > 0) {
        const firstAnim = animations.value[0]
        if (firstAnim) {
          firstAnim.checked = true
          currentSpine.value.state.setAnimation(0, firstAnim.name, true)
        }
      }
    }
  }

  function createGraphics(spine: any): any {
    const PIXI = window.PIXI
    const graphics = new PIXI.Graphics()
    graphics.alpha = 0

    const skeleton = spine.skeleton
    const slots = skeleton.slots

    for (let i = 0, len = slots.length; i < len; i++) {
      const slot = slots[i]

      if (!slot.bone.isActive) continue

      const attachment = slot.getAttachment()
      if (!attachment || !(attachment instanceof PIXI.Spine37.MeshAttachment)) continue

      const meshAttachment = attachment
      const vertices = new Float32Array(meshAttachment.worldVerticesLength)
      const hullLength = meshAttachment.hullLength ?? 0
      const triangles = meshAttachment.triangles ?? []

      meshAttachment.computeWorldVertices(
        slot,
        0,
        meshAttachment.worldVerticesLength,
        vertices,
        0,
        2
      )

      for (let j = 0, tlen = triangles.length; j < tlen; j += 3) {
        const v1 = (triangles[j] ?? 0) * 2
        const v2 = (triangles[j + 1] ?? 0) * 2
        const v3 = (triangles[j + 2] ?? 0) * 2

        graphics.context
          .moveTo(vertices[v1] ?? 0, vertices[v1 + 1] ?? 0)
          .lineTo(vertices[v2] ?? 0, vertices[v2 + 1] ?? 0)
          .lineTo(vertices[v3] ?? 0, vertices[v3 + 1] ?? 0)
      }

      if (hullLength > 0) {
        const hl = (hullLength >> 1) * 2
        let lastX = vertices[hl - 2] ?? 0
        let lastY = vertices[hl - 1] ?? 0

        for (let j = 0; j < hl; j += 2) {
          const x = vertices[j] ?? 0
          const y = vertices[j + 1] ?? 0

          graphics.context.moveTo(x, y).lineTo(lastX, lastY)
          lastX = x
          lastY = y
        }
      }
    }

    graphics.stroke({ width: 1, color: 0xffffff })
    return graphics
  }

  async function renderToStage(spine: any, _dressType?: DressTypeKey) {
    if (!app.value || !container.value) return

    const PIXI = window.PIXI

    if (isContinuousShootingEnabled.value) {
      spine.state.clearTracks()
      spine.skeleton.setToSetupPose()
      spine.lastTime = null
    }

    container.value.removeChildren()
    container.value.addChild(spine)

    container.value.scale.set(1)
    container.value.pivot.set(0, 0)
    container.value.position.set(0, 0)
    spine.position.set(0, 0)

    spine.update(0)

    const meshBound = createGraphics(spine).getLocalBounds()
    const spineBound = spine.getLocalBounds()
    const chosenBound =
      meshBound.width * meshBound.height >= spineBound.width * spineBound.height
        ? meshBound
        : spineBound

    const fallbackWidth = Math.max(spine.skeleton?.data?.width ?? 1, 1)
    const fallbackHeight = Math.max(spine.skeleton?.data?.height ?? 1, 1)

    const boundWidth = chosenBound.width > 0 ? chosenBound.width : fallbackWidth
    const boundHeight = chosenBound.height > 0 ? chosenBound.height : fallbackHeight
    const boundX = Number.isFinite(chosenBound.x) ? chosenBound.x : 0
    const boundY = Number.isFinite(chosenBound.y) ? chosenBound.y : 0

    spine.position.set(-boundX, -boundY)

    // Add invisible sprite to define capture bounds (like old project)
    const emptySprite = PIXI.Sprite.from(PIXI.Texture.EMPTY)
    emptySprite.alpha = 0
    emptySprite.width = boundWidth + 50
    emptySprite.height = boundHeight + 20
    emptySprite.position.set(-25, -10)
    container.value.addChild(emptySprite)

    const canvasWidth = app.value.renderer.width
    const canvasHeight = app.value.renderer.height
    const margin = 0.9
    const scaleX = canvasWidth / boundWidth
    const scaleY = canvasHeight / boundHeight

    let scale = Math.min(scaleX, scaleY) * margin
    if (!Number.isFinite(scale) || scale <= 0) scale = 1

    container.value.scale.set(scale)
    container.value.position.set(
      (canvasWidth - boundWidth * scale) / 2,
      (canvasHeight - boundHeight * scale) / 2
    )
  }

  async function loadDroppedSpine(atlas: string, json: string, textures: Map<string, File>) {
    if (!initialized.value) await initApp()

    loading.value = true
    const PIXI = window.PIXI

    try {
      const rawJSON = await PIXI.DOMAdapter.get()
        .fetch(json)
        .then((r: Response) => r.json())
      PIXI.Assets.cache.set('skel_drop', rawJSON)

      const rawAtlas = await PIXI.DOMAdapter.get()
        .fetch(atlas)
        .then((r: Response) => r.text())
      const textureAtlas = new PIXI.Spine37.TextureAtlas(rawAtlas)
      PIXI.Assets.cache.set('atlas_drop', textureAtlas)

      const textureLoadingPromises: Promise<void>[] = []
      for (const page of textureAtlas.pages) {
        const file = textures.get(page.name)
        if (!file) continue

        const base64Texture = await blobToBase64(file)
        const pixiPromise = PIXI.Assets.load({
          alias: page.name,
          src: base64Texture,
          data: {
            alphaMode: page.pma ? 'premultiplied-alpha' : 'premultiply-alpha-on-upload',
          },
        }).then((rawtexture: any) => {
          page.setTexture(PIXI.Spine37.SpineTexture.from(rawtexture.source))
        })
        textureLoadingPromises.push(pixiPromise)
      }

      await Promise.all(textureLoadingPromises)
      await setupAnimationList('drop')
    } catch (e) {
      error.value = e as Error
      console.error('Failed to load dropped spine:', e)
    } finally {
      loading.value = false
    }
  }

  function resizeCanvas() {
    if (app.value && canvasRef.value) {
      app.value.renderer.resize(canvasRef.value.clientWidth, canvasRef.value.clientHeight)
      if (currentSpine.value) {
        const anim = animations.value.find((a) => a.checked)
        if (anim) renderToStage(currentSpine.value, undefined)
      }
    }
  }

  function destroy() {
    if (app.value) {
      app.value.destroy(true, { children: true, texture: true, baseTexture: true })
      app.value = null
    }
    container.value = null
    currentSpine.value = null
    animations.value = []
    loading.value = false
    error.value = null
    initialized.value = false
  }

  return {
    app,
    container,
    currentSpine,
    animations,
    loading,
    error,
    initialized,
    isContinuousShootingEnabled,
    initApp,
    setBackgroundColor,
    loadSpine,
    loadDroppedSpine,
    toggleAnimation,
    resetAllAnimation,
    renderToStage,
    resizeCanvas,
    destroy,
  }
}
