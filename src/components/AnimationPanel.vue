<script setup lang="ts">
import type { AnimationItem } from '../types'

const props = defineProps<{
  animations: AnimationItem[]
}>()

const emit = defineEmits<{
  (e: 'toggle', trackIndex: number, checked: boolean): void
  (e: 'reset'): void
  (e: 'close'): void
}>()
</script>

<template>
  <div style="display: flex; flex-direction: column; height: 100%">
    <!-- <n-thing style="flex-shrink: 0">
      <template #header>Animation</template>
      <template #header-extra>
        <n-button quaternary @click="emit('close')">閉じる</n-button>
      </template>
    </n-thing> -->
    <n-scrollbar style="flex: 1; min-height: 0">
      <n-space vertical :size="8" style="padding: 4px">
        <n-checkbox
          v-for="anim in props.animations"
          :key="anim.name"
          :checked="anim.checked"
          @update:checked="(checked: boolean) => emit('toggle', anim.trackIndex, checked)"
        >
          {{ anim.name }}
        </n-checkbox>
      </n-space>
    </n-scrollbar>
    <div style="flex-shrink: 0">
      <n-divider style="margin: 8px 0" />
      <n-space vertical :size="8">
        <n-button type="error" block @click="emit('reset')">リセット</n-button>
        <n-button type="primary" block @click="emit('close')">閉じる</n-button>
      </n-space>
    </div>
  </div>
</template>
