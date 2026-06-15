<script setup lang="ts">
import type { ViewerSelectGroupOption, ViewerSelectOption } from '../composables/useViewerShared'

const props = withDefaults(
  defineProps<{
    idolId: number | null
    selectedDressIndex: number
    dressType: string | null
    backgroundColor: string
    idolOptions: ViewerSelectOption[]
    dressOptions: ViewerSelectGroupOption[]
    typeOptions: ViewerSelectOption[]
    continuousShootingEnabled: boolean
    showActionButtons?: boolean
  }>(),
  {
    showActionButtons: true,
  }
)

const emit = defineEmits<{
  (e: 'update:idol', value: string | number | null): void
  (e: 'update:dress', value: string | number | null): void
  (e: 'update:type', value: string | number | null): void
  (e: 'update:backgroundColor', value: string): void
  (e: 'update:continuousShootingEnabled', value: boolean): void
  (e: 'openAnimation'): void
  (e: 'openDatabase'): void
  (e: 'openThanks'): void
  (e: 'share'): void
  (e: 'save'): void
}>()
</script>

<template>
  <n-space vertical :size="12">
    <n-text
      depth="3"
      style="
        font-size: 0.83rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      "
    >
      Idol
    </n-text>
    <n-select
      :value="props.idolId"
      :options="props.idolOptions"
      @update:value="(value: any) => emit('update:idol', value)"
    />

    <n-text
      depth="3"
      style="
        font-size: 0.83rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      "
    >
      Dress
    </n-text>
    <n-select
      :value="props.selectedDressIndex"
      :options="props.dressOptions"
      @update:value="(value: any) => emit('update:dress', value)"
    />

    <n-text
      depth="3"
      style="
        font-size: 0.83rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      "
    >
      Type
    </n-text>
    <n-select
      :value="props.dressType"
      :options="props.typeOptions"
      @update:value="(value: any) => emit('update:type', value)"
    />

    <n-text
      depth="3"
      style="
        font-size: 0.83rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      "
    >
      Animation
    </n-text>
    <n-button type="primary" block @click="emit('openAnimation')">Animation List</n-button>

    <n-text
      depth="3"
      style="
        font-size: 0.83rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      "
    >
      Background Color
    </n-text>
    <n-color-picker
      :value="props.backgroundColor"
      :show-alpha="false"
      @update:value="(value: any) => emit('update:backgroundColor', value)"
    />

    <n-switch
      :value="props.continuousShootingEnabled"
      @update:value="(value: any) => emit('update:continuousShootingEnabled', value)"
    >
      <template #checked>Continuous shooting</template>
      <template #unchecked>Continuous shooting</template>
    </n-switch>

    <n-divider />
    <n-button block tertiary @click="emit('openDatabase')">ShinyColors Database</n-button>
    <n-button block tertiary @click="emit('openThanks')">Special Thanks</n-button>

    <template v-if="props.showActionButtons">
      <n-button block @click="emit('share')">Share</n-button>
      <n-button block @click="emit('save')">Save</n-button>
    </template>
  </n-space>
</template>
