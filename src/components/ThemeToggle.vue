<script setup lang="ts">
import { useTheme } from '../composables/useTheme'

defineProps<{
  compact?: boolean
}>()

const { theme, toggleTheme } = useTheme()
</script>

<template>
  <button
    type="button"
    class="icon-btn"
    :class="compact ? '!size-8' : ''"
    :aria-label="theme === 'dark' ? '切换为亮色主题' : '切换为暗色主题'"
    @click="toggleTheme"
  >
    <svg v-if="theme === 'dark'" class="size-4.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linejoin="round"
      />
    </svg>
    <svg v-else class="size-4.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.7" />
      <path
        d="M12 2.5v2M12 19.5v2M4.3 4.3l1.4 1.4M18.3 18.3l1.4 1.4M2.5 12h2M19.5 12h2M4.3 19.7l1.4-1.4M18.3 5.7l1.4-1.4"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
      />
    </svg>
  </button>
</template>
