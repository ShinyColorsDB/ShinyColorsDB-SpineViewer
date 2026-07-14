<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)

defineExpose({
  canvasRef,
})

const emit = defineEmits<{
  (e: 'drop', atlas: string, json: string, textures: Map<string, File>): void
  (e: 'dragover'): void
}>()

function handleDrop(event: DragEvent) {
  event.preventDefault()

  let pathJSON: string | undefined
  let pathAtlas: string | undefined
  const pathTexture = new Map<string, File>()

  if (event.dataTransfer?.items) {
    for (const item of event.dataTransfer.items) {
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (!file) continue

        const blobURL = window.URL.createObjectURL(file)
        if (file.name.endsWith('.atlas')) {
          pathAtlas = blobURL
        } else if (file.name.endsWith('.png') || file.name.endsWith('.webp')) {
          pathTexture.set(file.name, file)
        } else if (file.name.endsWith('.json')) {
          pathJSON = blobURL
        }
      }
    }
  } else if (event.dataTransfer?.files) {
    for (const file of event.dataTransfer.files) {
      const blobURL = window.URL.createObjectURL(file)
      if (file.name.endsWith('.atlas')) {
        pathAtlas = blobURL
      } else if (file.name.endsWith('.png') || file.name.endsWith('.webp')) {
        pathTexture.set(file.name, file)
      } else if (file.name.endsWith('.json')) {
        pathJSON = blobURL
      }
    }
  }

  if (pathAtlas && pathJSON && pathTexture.size > 0) {
    emit('drop', pathAtlas, pathJSON, pathTexture)
  } else {
    alert('missing files!')
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
  emit('dragover')
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

function handleResize() {
  // Will be handled by parent component
}
</script>

<template>
  <canvas
    ref="canvasRef"
    class="canvas-stage"
    width="1136"
    height="640"
    @drop="handleDrop"
    @dragover="handleDragOver"
  />
</template>

<style scoped>
.canvas-stage {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
