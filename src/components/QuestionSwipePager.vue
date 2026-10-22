<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  SWIPE_ANIMATION_MS,
  SWIPE_EASING,
  SWIPE_FADE_MS,
  transitionNameForIndexChange,
  type QuestionSwipeTransition,
} from '../lib/questionSwipe'

const props = defineProps<{
  pageKey: number
}>()

const transitionName = ref<QuestionSwipeTransition>('qswipe-next')

const pageTransitionMs = computed(() =>
  transitionName.value === 'qswipe-fade' ? SWIPE_FADE_MS : SWIPE_ANIMATION_MS,
)

const trackStyle = computed(() => ({
  '--qswipe-duration': `${SWIPE_ANIMATION_MS}ms`,
  '--qswipe-fade-duration': `${SWIPE_FADE_MS}ms`,
  '--qswipe-easing': SWIPE_EASING,
}))

watch(
  () => props.pageKey,
  (to, from) => {
    if (from === undefined || to === from) return
    transitionName.value = transitionNameForIndexChange(from, to)
  },
)
</script>

<template>
  <div class="qswipe-track relative" :style="trackStyle">
    <Transition :name="transitionName" :duration="pageTransitionMs">
      <div :key="pageKey" class="qswipe-page">
        <slot />
      </div>
    </Transition>
  </div>
</template>
