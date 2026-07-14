export function useExport(
  getApp: () => any,
  getContainer: () => any,
  getIdolName: () => string,
  getDressInfo: () => { category: string; name: string; type: string }
) {
  function isIOS(): boolean {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent)
  }

  function getFileName(): string {
    const idolName = getIdolName()
    const dressInfo = getDressInfo()
    const fileName = `${idolName}-${dressInfo.category}-${dressInfo.name}-${dressInfo.type}.png`
    return fileName.replace(/[<>:"\/\\|?*\x00-\x1F]/g, '_')
  }

  async function downloadViaAnchor(blob: Blob, fileName: string): Promise<void> {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.download = fileName
    anchor.href = url
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function downloadViaShare(blob: Blob, fileName: string): Promise<boolean> {
    if (!navigator.share) return false

    try {
      const file = new File([blob], fileName, { type: 'image/png' })
      await navigator.share({ files: [file] })
      return true
    } catch {
      return false
    }
  }

  async function saveImage(): Promise<void> {
    const app = getApp()
    const container = getContainer()
    if (!app || !container || container.children.length === 0) {
      throw new Error('No content to export')
    }

    const renderer = app.renderer
    // extract.base64() is async and works correctly for both WebGL and WebGPU.
    // The synchronous extract.canvas() returns an empty canvas under WebGPU because
    // GPU pixel readback (GPUBuffer.mapAsync) is inherently async.
    const base64 = await renderer.extract.base64(container)
    const blob = await fetch(base64).then((r) => r.blob())
    const fileName = getFileName()

    // iOS: try navigator.share first, fall back to anchor download
    if (isIOS()) {
      const shared = await downloadViaShare(blob, fileName)
      if (shared) return
    }

    await downloadViaAnchor(blob, fileName)
  }

  async function copyLinkToClipboard(link: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(link)
    } catch (e) {
      console.error('Failed to copy link:', e)
    }
  }

  return {
    saveImage,
    copyLinkToClipboard,
  }
}
