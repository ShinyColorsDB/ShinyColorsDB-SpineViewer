<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import AnimationPanel from '../components/AnimationPanel.vue'
import CanvasStage from '../components/CanvasStage.vue'
import ViewerControls from '../components/ViewerControls.vue'
import { useViewerShared } from '../composables/useViewerShared'

const canvasStageRef = ref<InstanceType<typeof CanvasStage> | null>(null)
const canvasElementRef = computed(() => canvasStageRef.value?.canvasRef ?? null)
const viewportWidth = ref(window.innerWidth)

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

const showMenuDrawer = ref(false)

function handleResize() {
  viewportWidth.value = window.innerWidth
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  destroy()
})
</script>

<template>
  <div style="position: relative; width: 100vw; height: 100dvh; overflow: hidden">
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
      style="position: absolute; left: 12px; right: 12px; bottom: calc(76px + env(safe-area-inset-bottom, 0px))"
    >
      {{ error.message }}
    </n-alert>

    <n-space
      class="absolute right-3 left-3 z-20 rounded-sm border border-slate-200/80 bg-white/88 p-2 shadow-[0_12px_34px_rgba(15,23,42,0.16)] backdrop-blur-md"
      style="bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px))"
      justify="space-between"
    >
      <n-button class="min-w-20" @click="showMenuDrawer = true">Menu</n-button>
      <n-button class="min-w-20" @click="handleShare">Share</n-button>
      <n-button class="min-w-20" type="primary" @click="handleSave">Save</n-button>
    </n-space>

    <n-alert
      v-if="showCopiedToast"
      type="success"
      title="Copied"
      style="
        position: fixed;
        left: 50%;
        bottom: calc(84px + env(safe-area-inset-bottom, 0px));
        transform: translateX(-50%);
        z-index: 50;
        width: min(320px, calc(100vw - 24px));
      "
    >
      Link is copied!
    </n-alert>

    <n-alert
      v-if="saveError"
      type="error"
      title="Save Failed"
      closable
      @close="saveError = null"
      style="
        position: fixed;
        left: 50%;
        bottom: calc(84px + env(safe-area-inset-bottom, 0px));
        transform: translateX(-50%);
        z-index: 50;
        width: min(320px, calc(100vw - 24px));
      "
    >
      {{ saveError }}
    </n-alert>
  </div>

  <n-modal v-model:show="showWebGLModal" :mask-closable="false">
    <n-card title="Legacy Mode Detected" style="width: min(520px, calc(100vw - 24px))">
      <n-text>Hardware acceleration is required for PIXI.js to run in WebGL mode.</n-text>
      <template #action>
        <n-space justify="end">
          <n-button type="primary" @click="showWebGLModal = false">閉じる</n-button>
        </n-space>
      </template>
    </n-card>
  </n-modal>

  <n-modal v-model:show="showThanksModal">
    <n-card title="特別感謝" style="width: min(520px, calc(100vw - 24px))">
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

  <n-drawer v-model:show="showMenuDrawer" placement="bottom" height="78dvh">
    <n-drawer-content title="Controls" closable>
      <ViewerControls
        :idol-id="idolId ?? null"
        :selected-dress-index="selectedDressIndex"
        :dress-type="dressType ?? null"
        :background-color="backgroundColor"
        :idol-options="idolOptions"
        :dress-options="dressOptions"
        :type-options="typeOptions"
        :continuous-shooting-enabled="isContinuousShootingEnabled"
        :show-action-buttons="false"
        @update:idol="updateIdol"
        @update:dress="updateDress"
        @update:type="updateType"
        @update:background-color="handleColorChange"
        @update:continuous-shooting-enabled="handleContinuousShootingChange"
        @open-animation="showAnimationDrawer = true"
        @open-database="openDatabase"
        @open-thanks="showThanksModal = true"
      />
    </n-drawer-content>
  </n-drawer>

  <n-drawer v-model:show="showAnimationDrawer" placement="bottom" height="78dvh">
    <n-drawer-content title="Animation" closable>
      <AnimationPanel
        :animations="animations"
        @toggle="handleAnimationToggle"
        @reset="handleAnimationReset"
        @close="showAnimationDrawer = false"
      />
    </n-drawer-content>
  </n-drawer>
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
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.loading-overlay-enter-from,
.loading-overlay-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
