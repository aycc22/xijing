import { ref } from 'vue'
import { forceAppRefresh } from '../lib/appRefresh'

export function useAppRefresh() {
  const refreshing = ref(false)
  const error = ref<string | null>(null)

  async function refresh() {
    if (refreshing.value) return
    refreshing.value = true
    error.value = null
    try {
      await forceAppRefresh()
    } catch {
      error.value = '刷新失败，请检查网络后重试'
      refreshing.value = false
    }
  }

  return {
    refreshing,
    error,
    refresh,
  }
}
