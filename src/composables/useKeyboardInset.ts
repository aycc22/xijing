import { onMounted, onUnmounted, readonly, ref } from 'vue'

/** 通过 Visual Viewport API 估算软键盘占用的高度（px） */
export function useKeyboardInset() {
  const insetBottom = ref(0)
  const keyboardOpen = ref(false)

  function update() {
    const vv = window.visualViewport
    if (!vv) {
      insetBottom.value = 0
      keyboardOpen.value = false
      return
    }

    const gap = window.innerHeight - vv.height - vv.offsetTop
    insetBottom.value = Math.max(0, Math.round(gap))
    keyboardOpen.value = gap > 80
  }

  onMounted(() => {
    update()
    window.visualViewport?.addEventListener('resize', update)
    window.visualViewport?.addEventListener('scroll', update)
  })

  onUnmounted(() => {
    window.visualViewport?.removeEventListener('resize', update)
    window.visualViewport?.removeEventListener('scroll', update)
  })

  return {
    insetBottom: readonly(insetBottom),
    keyboardOpen: readonly(keyboardOpen),
  }
}
