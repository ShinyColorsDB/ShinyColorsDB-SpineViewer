import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { IdolInfo, DressInfo } from '../types'

export const useMainStore = defineStore('main', () => {
  const idolInfoMap = ref<Map<number, IdolInfo>>(new Map())
  const idolDressMap = ref<Map<string, DressInfo[]>>(new Map())
  const loading = ref(false)

  return {
    idolInfoMap,
    idolDressMap,
    loading,
  }
})
