<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  SWIPE_ANIMATION_MS,
  SWIPE_SNAP_BACK_MS,
  cancelSwipeGesture,
  consumeSwipeClickSuppression,
  endSwipeGesture,
  idleSwipeState,
  isSwipeIgnoredTarget,
  markSwipeAnimationFinished,
  moveSwipeGesture,
  startSwipeGesture,
  transitionNameForIndexChange,
  type QuestionSwipeTransition,
  type SwipeGestureState,
} from '../lib/questionSwipe'

const props = defineProps<{
  pageKey: number
  canPrev: boolean
  canNext: boolean
}>()

const emit = defineEmits<{
  prev: []
  next: []
}>()

const trackRef = ref<HTMLElement | null>(null)
const gesture = ref<SwipeGestureState>(idleSwipeState())
const transitionName = ref<QuestionSwipeTransition>('qswipe-next')
const commitFromX = ref(0)
const snapBack = ref(false)
const swipeDriven = ref(false)

let unlockTimer: ReturnType<typeof setTimeout> | null = null

const followActive = computed(() => gesture.value.dragging || snapBack.value)

const trackStyle = computed(() => ({
  '--qswipe-follow': `${gesture.value.followX}px`,
  '--qswipe-commit-from': `${commitFromX.value}px`,
}))

function clearTimers() {
  if (unlockTimer) {
    clearTimeout(unlockTimer)
    unlockTimer = null
  }
}

function armUnlock(delayMs: number) {
  if (unlockTimer) clearTimeout(unlockTimer)
  unlockTimer = setTimeout(() => {
    gesture.value = markSwipeAnimationFinished(gesture.value)
    snapBack.value = false
    commitFromX.value = 0
  }, delayMs)
}

watch(
  () => props.pageKey,
  (to, from) => {
    if (from === undefined || to === from) return
    if (swipeDriven.value) {
      swipeDriven.value = false
    } else {
      transitionName.value = transitionNameForIndexChange(from, to)
      commitFromX.value = 0
    }
    gesture.value = {
      ...markSwipeAnimationFinished(gesture.value),
      animating: true,
      lockedUntil: Math.max(gesture.value.lockedUntil, Date.now() + SWIPE_ANIMATION_MS),
    }
    armUnlock(SWIPE_ANIMATION_MS + 40)
  },
)

function setGesture(next: SwipeGestureState) {
  gesture.value = next
}

function onPointerDown(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  setGesture(
    startSwipeGesture(gesture.value, {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      t: event.timeStamp,
      now: Date.now(),
      ignore: isSwipeIgnoredTarget(event.target),
    }),
  )
  snapBack.value = false
}

function onPointerMove(event: PointerEvent) {
  const before = gesture.value
  const next = moveSwipeGesture(before, {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    t: event.timeStamp,
    canPrev: props.canPrev,
    canNext: props.canNext,
  })
  setGesture(next)
  if (!before.dragging && next.dragging) {
    trackRef.value?.setPointerCapture(event.pointerId)
  }
  if (next.dragging && event.cancelable) event.preventDefault()
}

function finishPointer(event: PointerEvent, cancelled: boolean) {
  if (gesture.value.pointerId !== event.pointerId) return
  const track = trackRef.value
  if (track?.hasPointerCapture(event.pointerId)) {
    track.releasePointerCapture(event.pointerId)
  }

  if (cancelled) {
    const dragged = gesture.value.dragging
    const follow = gesture.value.followX
    setGesture(cancelSwipeGesture(gesture.value, event.pointerId))
    if (dragged) {
      snapBack.value = true
      setGesture({ ...gesture.value, followX: follow })
      requestAnimationFrame(() => {
        if (!gesture.value.dragging) {
          setGesture({ ...gesture.value, followX: 0 })
        }
      })
      armUnlock(SWIPE_SNAP_BACK_MS + 20)
    }
    return
  }

  const followAtRelease = gesture.value.followX
  const ended = endSwipeGesture(gesture.value, {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    t: event.timeStamp,
    now: Date.now(),
    canPrev: props.canPrev,
    canNext: props.canNext,
  })

  if (ended.intent) {
    swipeDriven.value = true
    commitFromX.value = followAtRelease
    transitionName.value = ended.intent === 'next' ? 'qswipe-next' : 'qswipe-prev'
    snapBack.value = false
    setGesture(ended.state)
    if (ended.intent === 'next') emit('next')
    else emit('prev')
    armUnlock(SWIPE_ANIMATION_MS + 40)
    return
  }

  if (ended.intent === null && followAtRelease !== 0) {
    snapBack.value = true
    setGesture({ ...ended.state, followX: followAtRelease })
    requestAnimationFrame(() => {
      if (!gesture.value.dragging) {
        setGesture({ ...gesture.value, followX: 0 })
      }
    })
    armUnlock(SWIPE_SNAP_BACK_MS + 20)
    return
  }

  setGesture(ended.state)
}

function onPointerUp(event: PointerEvent) {
  finishPointer(event, false)
}

function onPointerCancel(event: PointerEvent) {
  finishPointer(event, true)
}

function onClickCapture(event: MouseEvent) {
  const consumed = consumeSwipeClickSuppression(gesture.value)
  setGesture(consumed.state)
  if (!consumed.suppress) return
  event.preventDefault()
  event.stopPropagation()
}

function onAfterEnter() {
  gesture.value = markSwipeAnimationFinished(gesture.value)
  snapBack.value = false
}

onBeforeUnmount(clearTimers)
</script>

<template>
  <div
    ref="trackRef"
    class="qswipe-track relative touch-pan-y"
    :class="{
      'select-none': gesture.dragging,
      'qswipe-clip': followActive || gesture.animating,
    }"
    :style="trackStyle"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @click.capture="onClickCapture"
  >
    <Transition :name="transitionName" @after-enter="onAfterEnter">
      <div
        :key="pageKey"
        class="qswipe-page"
        :class="{
          'qswipe-live': followActive || gesture.animating,
          'qswipe-follow': followActive && !gesture.animating,
          'qswipe-snap': snapBack && !gesture.dragging,
        }"
      >
        <slot />
      </div>
    </Transition>
  </div>
</template>
