<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  applySwipeOffset,
  finishSwipeGesture,
  isInteractiveSwipeTarget,
  QUESTION_SWIPE,
  QUESTION_SWIPE_LOCK_MS,
  resolveSwipeAxis,
  slideTransitionName,
  type SwipeAxis,
} from '../lib/questionSwipe'

const props = defineProps<{
  contentKey: number
  canPrev: boolean
  canNext: boolean
}>()

const emit = defineEmits<{
  prev: []
  next: []
}>()

const root = ref<HTMLElement | null>(null)
const dragX = ref(0)
const dragging = ref(false)
const slideName = ref('')
const axis = ref<SwipeAxis>('undecided')

let pointerId: number | null = null
let startX = 0
let startY = 0
let startT = 0
let lockUntil = 0
let clickGuard: ((event: Event) => void) | null = null
let clickGuardTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.contentKey,
  (to, from) => {
    slideName.value = slideTransitionName(from, to)
    if (slideName.value) {
      lockUntil = Math.max(lockUntil, performance.now() + QUESTION_SWIPE_LOCK_MS)
    }
  },
)

const paneStyle = computed(() => {
  if (!dragging.value && dragX.value === 0) return undefined
  return {
    transform: `translate3d(${dragX.value}px, 0, 0)`,
    transition: dragging.value ? 'none' : `transform ${QUESTION_SWIPE.animationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  }
})

function setSwipeFrom(px: number) {
  root.value?.style.setProperty('--q-swipe-from', `${px}px`)
}

function onSlideDone() {
  setSwipeFrom(0)
}

function removeClickGuard() {
  if (clickGuard) {
    document.removeEventListener('click', clickGuard, true)
    clickGuard = null
  }
  if (clickGuardTimer) {
    clearTimeout(clickGuardTimer)
    clickGuardTimer = null
  }
}

function installClickGuard() {
  if (clickGuard) return
  clickGuard = (event: Event) => {
    event.preventDefault()
    event.stopPropagation()
    removeClickGuard()
  }
  document.addEventListener('click', clickGuard, true)
  clickGuardTimer = setTimeout(removeClickGuard, 450)
}

function releasePointer(id: number) {
  if (root.value?.hasPointerCapture?.(id)) {
    root.value.releasePointerCapture(id)
  }
}

function resetDrag() {
  dragging.value = false
  dragX.value = 0
  axis.value = 'undecided'
  pointerId = null
}

function onPointerDown(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  if (pointerId !== null) return
  if (isInteractiveSwipeTarget(event.target)) return
  if (lockUntil > performance.now()) return

  pointerId = event.pointerId
  startX = event.clientX
  startY = event.clientY
  startT = event.timeStamp
  axis.value = 'undecided'
  dragging.value = true
  dragX.value = 0
  setSwipeFrom(0)
}

function onPointerMove(event: PointerEvent) {
  if (pointerId === null || event.pointerId !== pointerId || !dragging.value) return

  const dx = event.clientX - startX
  const dy = event.clientY - startY

  if (axis.value === 'undecided') {
    axis.value = resolveSwipeAxis(dx, dy)
    if (axis.value === 'vertical') {
      resetDrag()
      return
    }
    if (axis.value === 'undecided') return
    installClickGuard()
    root.value?.setPointerCapture?.(event.pointerId)
  }

  if (axis.value !== 'horizontal') return
  dragX.value = applySwipeOffset(dx, props.canPrev, props.canNext)
}

function onPointerEnd(event: PointerEvent) {
  if (pointerId === null || event.pointerId !== pointerId) return

  const id = event.pointerId
  const dx = event.clientX - startX
  const dy = event.clientY - startY
  const dtMs = Math.max(1, event.timeStamp - startT)
  const from = dragX.value

  const { commit, lockUntil: nextLock } = finishSwipeGesture({
    dx,
    dy,
    dtMs,
    width: root.value?.getBoundingClientRect().width ?? 320,
    canPrev: props.canPrev,
    canNext: props.canNext,
    axis: axis.value,
    lockUntil,
    now: performance.now(),
  })

  releasePointer(id)

  if (commit) {
    lockUntil = nextLock
    setSwipeFrom(from)
    dragging.value = false
    dragX.value = 0
    axis.value = 'undecided'
    pointerId = null
    if (commit === 'next') emit('next')
    else emit('prev')
    return
  }

  dragging.value = false
  axis.value = 'undecided'
  pointerId = null
  if (from === 0) {
    dragX.value = 0
    return
  }
  requestAnimationFrame(() => {
    dragX.value = 0
  })
}

onBeforeUnmount(() => {
  removeClickGuard()
})
</script>

<template>
  <div
    ref="root"
    class="relative overflow-x-hidden touch-pan-y"
    :class="axis === 'horizontal' ? 'select-none' : ''"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerEnd"
    @pointercancel="onPointerEnd"
  >
    <Transition :name="slideName" @after-enter="onSlideDone">
      <div :key="contentKey" class="q-swipe-pane w-full" :style="paneStyle">
        <slot />
      </div>
    </Transition>
  </div>
</template>
