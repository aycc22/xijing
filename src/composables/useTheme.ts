import { ref, watch } from 'vue'

export type AppTheme = 'dark' | 'light'

const THEME_KEY = 'xj-theme'

function readTheme(): AppTheme {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

const theme = ref<AppTheme>(readTheme())
let watching = false

function applyTheme(next: AppTheme) {
  document.documentElement.dataset.theme = next
  localStorage.setItem(THEME_KEY, next)
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', next === 'dark' ? '#0c1014' : '#f7f5f0')
}

export function useTheme() {
  if (!watching) {
    watching = true
    watch(theme, applyTheme, { immediate: true })
  }

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  function setTheme(next: AppTheme) {
    theme.value = next
  }

  return { theme, toggleTheme, setTheme }
}
