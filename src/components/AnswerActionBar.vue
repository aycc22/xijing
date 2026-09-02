<script setup lang="ts">
defineProps<{
  /** 键盘弹出或浮动输入激活时隐藏，避免与输入区重叠 */
  hidden?: boolean
}>()

defineEmits<{
  'open-sheet': []
}>()
</script>

<template>
  <!-- Teleport 到 body，避免被 .page-enter 的 transform 动画做成 fixed 包含块 -->
  <Teleport to="body">
    <nav
      v-show="!hidden"
      class="fixed inset-x-0 bottom-0 z-30 border-t border-line/70 bg-surface/95 backdrop-blur-md transition-opacity duration-200"
      style="padding-bottom: env(safe-area-inset-bottom)"
      aria-label="答题操作"
    >
      <div class="mx-auto flex max-w-lg items-center gap-2 px-3 py-1.5 md:max-w-3xl md:px-6">
        <button
          type="button"
          class="tab-link !flex-none w-16 shrink-0 cursor-pointer border-0 bg-transparent"
          aria-label="打开答题卡"
          @click="$emit('open-sheet')"
        >
          <svg class="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="4" y="4" width="6.5" height="6.5" rx="1.2" stroke="currentColor" stroke-width="1.6" />
            <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.2" stroke="currentColor" stroke-width="1.6" />
            <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.2" stroke="currentColor" stroke-width="1.6" />
            <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.2" stroke="currentColor" stroke-width="1.6" />
          </svg>
          答题卡
        </button>

        <div class="flex min-w-0 flex-1 items-center gap-2">
          <slot />
        </div>
      </div>
    </nav>
  </Teleport>
</template>
