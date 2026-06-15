<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import AnimationPanel from '../components/AnimationPanel.vue'
import CanvasStage from '../components/CanvasStage.vue'
import ViewerControls from '../components/ViewerControls.vue'
import { useViewerShared } from '../composables/useViewerShared'

const canvasStageRef = ref<InstanceType<typeof CanvasStage> | null>(null)
const canvasElementRef = computed(() => canvasStageRef.value?.canvasRef ?? null)
const showMenuDrawer = ref(false)
const viewportWidth = ref(window.innerWidth)
const SIDEBAR_BREAKPOINT = 1280
const isWideLayout = computed(() => viewportWidth.value >= SIDEBAR_BREAKPOINT)

const {
  animations,
  backgroundColor,
  dressOptions,
  dressType,
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
} = useViewerShared(canvasElementRef)

function handleResize() {
  viewportWidth.value = window.innerWidth
}

watch(isWideLayout, (wide) => {
  if (wide) {
    showMenuDrawer.value = false
  }
})

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  destroy()
})
</script>

<template>
  <n-layout has-sider style="height: 100dvh">
    <n-layout-sider
      v-if="isWideLayout"
      bordered
      :width="320"
      :collapsed-width="0"
      content-style="padding: 16px; overflow-y: auto"
    >
      <ViewerControls
        :idol-id="idolId ?? null"
        :selected-dress-index="selectedDressIndex"
        :dress-type="dressType ?? null"
        :background-color="backgroundColor"
        :idol-options="idolOptions"
        :dress-options="dressOptions"
        :type-options="typeOptions"
        :continuous-shooting-enabled="isContinuousShootingEnabled"
        @update:idol="updateIdol"
        @update:dress="updateDress"
        @update:type="updateType"
        @update:background-color="handleColorChange"
        @update:continuous-shooting-enabled="handleContinuousShootingChange"
        @open-animation="showAnimationDrawer = true"
        @open-database="openDatabase"
        @open-thanks="showThanksModal = true"
        @share="handleShare"
        @save="handleSave"
      />
    </n-layout-sider>

    <n-layout-content>
      <n-button
        v-if="!isWideLayout"
        style="position: absolute; top: 16px; left: 16px; z-index: 20"
        @click="showMenuDrawer = true"
      >
        Controls
      </n-button>
      <CanvasStage ref="canvasStageRef" @drop="handleDrop" />
      <Transition name="loading-overlay" appear>
        <div v-if="loading" class="loading-backdrop">
          <n-spin size="large" />
        </div>
      </Transition>
      <n-alert
        v-if="error"
        type="error"
        title="Load Failed"
        style="position: absolute; left: 16px; right: 16px; bottom: 16px"
      >
        {{ error.message }}
      </n-alert>
    </n-layout-content>
  </n-layout>

  <n-modal v-model:show="showWebGLModal" :mask-closable="false">
    <n-card title="Legacy Mode Detected" style="width: min(560px, calc(100vw - 2rem))">
      <n-text>Hardware acceleration is required for PIXI.js to run in WebGL mode.</n-text>
      <template #action>
        <n-space justify="end">
          <n-button type="primary" @click="showWebGLModal = false">閉じる</n-button>
        </n-space>
      </template>
    </n-card>
  </n-modal>

  <n-modal v-model:show="showThanksModal">
    <n-card title="特別感謝" style="width: min(560px, calc(100vw - 2rem))">
      <n-space vertical :size="8">
        <n-text strong>技術諮詢</n-text>
        <n-text>TWY</n-text>
        <n-text strong>爆肝小夥伴</n-text>
        <n-text>木下梨花 KaiOuO Lycoris 剎那 十秒十六胎 匿名小夥伴一號</n-text>
      </n-space>
      <template #action>
        <n-space justify="end">
          <n-button @click="showThanksModal = false">閉じる</n-button>
        </n-space>
      </template>
    </n-card>
  </n-modal>

  <n-drawer v-model:show="showAnimationDrawer" placement="right" :width="360">
    <n-drawer-content title="Animation" closable>
      <AnimationPanel
        :animations="animations"
        @toggle="handleAnimationToggle"
        @reset="handleAnimationReset"
        @close="showAnimationDrawer = false"
      />
    </n-drawer-content>
  </n-drawer>

  <n-drawer v-model:show="showMenuDrawer" placement="left" width="min(360px, 88vw)">
    <n-drawer-content title="Controls" :closable="!isWideLayout">
      <ViewerControls
        :idol-id="idolId ?? null"
        :selected-dress-index="selectedDressIndex"
        :dress-type="dressType ?? null"
        :background-color="backgroundColor"
        :idol-options="idolOptions"
        :dress-options="dressOptions"
        :type-options="typeOptions"
        :continuous-shooting-enabled="isContinuousShootingEnabled"
        @update:idol="updateIdol"
        @update:dress="updateDress"
        @update:type="updateType"
        @update:background-color="handleColorChange"
        @update:continuous-shooting-enabled="handleContinuousShootingChange"
        @open-animation="showAnimationDrawer = true"
        @open-database="openDatabase"
        @open-thanks="showThanksModal = true"
        @share="handleShare"
        @save="handleSave"
      />
    </n-drawer-content>
  </n-drawer>

  <n-alert
    v-if="showCopiedToast"
    type="success"
    title="Copied"
    style="position: fixed; right: 16px; bottom: 16px; z-index: 50; width: 240px"
  >
    Link is copied!
  </n-alert>

  <n-alert
    v-if="saveError"
    type="error"
    title="Save Failed"
    closable
    @close="saveError = null"
    style="position: fixed; right: 16px; bottom: 60px; z-index: 50; width: 240px"
  >
    {{ saveError }}
  </n-alert>
</template>

<style scoped>
.loading-backdrop {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.3);
  backdrop-filter: blur(0.3rem);
  z-index: 10;
}

.loading-overlay-enter-active,
.loading-overlay-leave-active {
  transition: opacity 0.25s ease;
}

.loading-overlay-enter-from,
.loading-overlay-leave-to {
  opacity: 0;
}
</style>
