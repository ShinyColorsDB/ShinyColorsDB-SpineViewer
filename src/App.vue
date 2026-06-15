<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useOsTheme, darkTheme } from 'naive-ui'
import type { BuiltInGlobalTheme } from 'naive-ui/lib/themes/interface'
import { naiveThemeOverrides } from './theme/naiveTheme'

const osTheme = useOsTheme()
const theme = computed<BuiltInGlobalTheme | null>(() => osTheme.value === 'dark' ? darkTheme : null)
</script>

<template>
  <n-config-provider :theme="theme" :theme-overrides="naiveThemeOverrides">
    <RouterView />
  </n-config-provider>
</template>
