export type SwipeAxis = 'undecided' | 'horizontal' | 'vertical'
export type SwipeIntent = 'prev' | 'next'
export type QuestionSwipeTransition = 'qswipe-next' | 'qswipe-prev' | 'qswipe-fade'

/** 位移超过该像素才锁定轴向，避免点选项时误判为滑动 */
export const SWIPE_AXIS_LOCK_PX = 12
/** 水平位移需明显大于垂直，才抢过长题干的纵向滚动 */
export const SWIPE_HORIZONTAL_RATIO = 1.2
/** 松开时达到该水平距离则切题（约一指宽） */
export const SWIPE_COMMIT_DISTANCE_PX = 56
/** 轻甩时允许更短距离，但仍需超过点按抖动 */
export const SWIPE_FLICK_DISTANCE_PX = 28
/** px/ms。约 45px / 100ms */
export const SWIPE_COMMIT_VELOCITY = 0.45
export const SWIPE_FOLLOW_FACTOR = 0.38
export const SWIPE_FOLLOW_MAX_PX = 64
/** 到边界（不能上一题/下一题）时的跟手阻尼 */
export const SWIPE_EDGE_RESISTANCE = 0.28
/**
 * 切题过渡时长。300ms + easeOutExpo 在手机上会显得「一闪而过」；
 * 480ms 接近 Keen Slider 默认、长于 iOS UIPageViewController 的 ~350ms，
 * 配合下方 ease-out 曲线，整段位移都看得清。
 */
export const SWIPE_ANIMATION_MS = 480
/** 答题卡跳题的淡入淡出，略短于滑页但仍慢于硬切 */
export const SWIPE_FADE_MS = 340
/** 切题动画结束后的额外冷却，防止一次手势连跳两题 */
export const SWIPE_COOLDOWN_MS = 160
/** 未过阈值回弹，略快于换页，但仍跟手后能看清回位 */
export const SWIPE_SNAP_BACK_MS = 360
/**
 * easeOutQuad：比 cubic-bezier(0.22, 1, 0.36, 1)（easeOutExpo）更匀速，
 * 接近 iOS UIScrollView 分页减速，前段不会把动作「甩完」。
 */
export const SWIPE_EASING = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
/** 定时器相对 CSS 过渡的余量，避免动画未结束就解锁 */
export const SWIPE_UNLOCK_BUFFER_MS = 64

const IGNORE_SELECTOR = 'textarea, input, select, [contenteditable="true"], [data-no-swipe]'

export interface SwipeGestureState {
  axis: SwipeAxis
  pointerId: number | null
  startX: number
  startY: number
  startT: number
  lastX: number
  lastT: number
  followX: number
  dragging: boolean
  animating: boolean
  lockedUntil: number
  suppressClick: boolean
}

export function idleSwipeState(): SwipeGestureState {
  return {
    axis: 'undecided',
    pointerId: null,
    startX: 0,
    startY: 0,
    startT: 0,
    lastX: 0,
    lastT: 0,
    followX: 0,
    dragging: false,
    animating: false,
    lockedUntil: 0,
    suppressClick: false,
  }
}

export function lockGesturesUntil(now: number, extraMs = SWIPE_COOLDOWN_MS): number {
  return now + SWIPE_ANIMATION_MS + extraMs
}

export function canAcceptSwipeStart(state: SwipeGestureState, now: number): boolean {
  if (state.dragging || state.animating) return false
  if (state.pointerId !== null) return false
  return now >= state.lockedUntil
}

export function isSwipeIgnoredTarget(target: unknown): boolean {
  if (!target || typeof target !== 'object') return false
  const el = target as { closest?: (selector: string) => unknown; nodeName?: string }
  if (typeof el.closest === 'function') {
    try {
      return Boolean(el.closest(IGNORE_SELECTOR))
    } catch {
      return false
    }
  }
  const name = typeof el.nodeName === 'string' ? el.nodeName.toLowerCase() : ''
  return name === 'textarea' || name === 'input' || name === 'select'
}

export function resolveSwipeAxis(dx: number, dy: number, current: SwipeAxis): SwipeAxis {
  if (current !== 'undecided') return current
  const ax = Math.abs(dx)
  const ay = Math.abs(dy)
  if (ax < SWIPE_AXIS_LOCK_PX && ay < SWIPE_AXIS_LOCK_PX) return 'undecided'
  return ax > ay * SWIPE_HORIZONTAL_RATIO ? 'horizontal' : 'vertical'
}

/** 手指左滑（dx < 0）→ 下一题；右滑 → 上一题，与常见刷题 App / 翻页一致 */
export function swipeIntentFromDelta(dx: number): SwipeIntent | null {
  if (dx < 0) return 'next'
  if (dx > 0) return 'prev'
  return null
}

export function followTranslateX(dx: number, canPrev: boolean, canNext: boolean): number {
  let x = dx * SWIPE_FOLLOW_FACTOR
  const intent = swipeIntentFromDelta(dx)
  const blocked = (intent === 'next' && !canNext) || (intent === 'prev' && !canPrev)
  if (blocked) x *= SWIPE_EDGE_RESISTANCE
  return Math.max(-SWIPE_FOLLOW_MAX_PX, Math.min(SWIPE_FOLLOW_MAX_PX, x))
}

export function swipeVelocity(dx: number, dtMs: number): number {
  if (dtMs <= 0) return 0
  return Math.abs(dx) / dtMs
}

export function shouldCommitSwipe(input: {
  dx: number
  dtMs: number
  recentDx?: number
  recentDtMs?: number
  canPrev: boolean
  canNext: boolean
}): boolean {
  const intent = swipeIntentFromDelta(input.dx)
  if (!intent) return false
  if (intent === 'next' && !input.canNext) return false
  if (intent === 'prev' && !input.canPrev) return false

  const distance = Math.abs(input.dx)
  if (distance >= SWIPE_COMMIT_DISTANCE_PX) return true

  const overall = swipeVelocity(input.dx, input.dtMs)
  const recentDt = input.recentDtMs ?? 0
  const flick =
    recentDt > 0 && recentDt <= 64 ? swipeVelocity(input.recentDx ?? 0, recentDt) : 0
  const velocity = Math.max(overall, flick)
  return distance >= SWIPE_FLICK_DISTANCE_PX && velocity >= SWIPE_COMMIT_VELOCITY
}

export function transitionNameForIndexChange(from: number, to: number): QuestionSwipeTransition {
  if (to === from + 1) return 'qswipe-next'
  if (to === from - 1) return 'qswipe-prev'
  return 'qswipe-fade'
}

export function startSwipeGesture(
  state: SwipeGestureState,
  input: {
    pointerId: number
    x: number
    y: number
    t: number
    now: number
    ignore?: boolean
  },
): SwipeGestureState {
  if (input.ignore || !canAcceptSwipeStart(state, input.now)) return state
  return {
    ...state,
    axis: 'undecided',
    pointerId: input.pointerId,
    startX: input.x,
    startY: input.y,
    startT: input.t,
    lastX: input.x,
    lastT: input.t,
    followX: 0,
    dragging: false,
    suppressClick: false,
  }
}

export function moveSwipeGesture(
  state: SwipeGestureState,
  input: {
    pointerId: number
    x: number
    y: number
    t: number
    canPrev: boolean
    canNext: boolean
  },
): SwipeGestureState {
  if (state.pointerId !== input.pointerId) return state
  const dx = input.x - state.startX
  const dy = input.y - state.startY
  const axis = resolveSwipeAxis(dx, dy, state.axis)
  if (axis !== 'horizontal') {
    return { ...state, axis, lastX: input.x, lastT: input.t }
  }
  return {
    ...state,
    axis,
    lastX: input.x,
    lastT: input.t,
    dragging: true,
    followX: followTranslateX(dx, input.canPrev, input.canNext),
  }
}

export function endSwipeGesture(
  state: SwipeGestureState,
  input: {
    pointerId: number
    x: number
    y: number
    t: number
    now: number
    canPrev: boolean
    canNext: boolean
  },
): { state: SwipeGestureState; intent: SwipeIntent | null } {
  if (state.pointerId !== input.pointerId) {
    return { state, intent: null }
  }

  const dx = input.x - state.startX
  const dtMs = Math.max(input.t - state.startT, 1)
  const recentDx = input.x - state.lastX
  const recentDtMs = Math.max(input.t - state.lastT, 1)
  const wasHorizontalDrag = state.axis === 'horizontal' && state.dragging

  const released: SwipeGestureState = {
    ...state,
    axis: 'undecided',
    pointerId: null,
    dragging: false,
    lastX: input.x,
    lastT: input.t,
  }

  if (!wasHorizontalDrag) {
    return { state: { ...released, followX: 0 }, intent: null }
  }

  const commit = shouldCommitSwipe({
    dx,
    dtMs,
    recentDx,
    recentDtMs,
    canPrev: input.canPrev,
    canNext: input.canNext,
  })
  const intent = commit ? swipeIntentFromDelta(dx) : null

  if (intent) {
    return {
      state: {
        ...released,
        followX: 0,
        animating: true,
        lockedUntil: lockGesturesUntil(input.now),
        suppressClick: true,
      },
      intent,
    }
  }

  return {
    state: {
      ...released,
      followX: 0,
      animating: true,
      lockedUntil: input.now + SWIPE_SNAP_BACK_MS + SWIPE_UNLOCK_BUFFER_MS,
      suppressClick: Math.abs(dx) >= SWIPE_AXIS_LOCK_PX,
    },
    intent: null,
  }
}

export function cancelSwipeGesture(state: SwipeGestureState, pointerId: number): SwipeGestureState {
  if (state.pointerId !== pointerId) return state
  return {
    ...state,
    axis: 'undecided',
    pointerId: null,
    dragging: false,
    followX: 0,
    animating: state.followX !== 0,
    suppressClick: state.dragging,
  }
}

export function markSwipeAnimationFinished(state: SwipeGestureState): SwipeGestureState {
  return {
    ...state,
    animating: false,
    dragging: false,
    followX: 0,
  }
}

export function consumeSwipeClickSuppression(state: SwipeGestureState): {
  state: SwipeGestureState
  suppress: boolean
} {
  if (!state.suppressClick) return { state, suppress: false }
  return { state: { ...state, suppressClick: false }, suppress: true }
}
