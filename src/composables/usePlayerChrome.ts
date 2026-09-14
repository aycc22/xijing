import { ref } from 'vue'

const current = ref(0)
const total = ref(0)
const progress = ref(0)
const favorited = ref(false)
const showFavorite = ref(false)
let favoriteHandler: (() => void) | null = null

export function usePlayerChrome() {
  function setChrome(input: {
    current: number
    total: number
    progress: number
    favorited?: boolean
    onFavorite?: (() => void) | null
  }) {
    current.value = input.current
    total.value = input.total
    progress.value = input.progress
    showFavorite.value = Boolean(input.onFavorite)
    favorited.value = Boolean(input.favorited)
    favoriteHandler = input.onFavorite ?? null
  }

  function clearChrome() {
    current.value = 0
    total.value = 0
    progress.value = 0
    showFavorite.value = false
    favorited.value = false
    favoriteHandler = null
  }

  function toggleFavorite() {
    favoriteHandler?.()
  }

  return {
    current,
    total,
    progress,
    favorited,
    showFavorite,
    setChrome,
    clearChrome,
    toggleFavorite,
  }
}
