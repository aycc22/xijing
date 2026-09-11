export type SwipeAxis = 'undecided' | 'horizontal' | 'vertical'
export type SwipeCommit = 'prev' | 'next' | null

export const QUESTION_SWIPE = {
  /** Movement before we decide horizontal vs vertical. Vertical wins ties so long stems still scroll. */
  axisLockPx: 12,
  /** Minimum travel (px) to switch question without a flick. */
  distancePx: 56,
  /** Also commit when travel exceeds this fraction of the track width. */
  distanceRatio: 0.18,
  /** Overall |dx|/dt in px/ms (~350px/s) counts as a flick. */
  velocityPxPerMs: 0.35,
  /** Flicks still need a little travel so a jittery tap cannot commit. */
  minFlickPx: 24,
  /** Edge rubber-band when prev/next is not allowed. */
  edgeResistance: 0.32,
  /** Slide duration; keep in sync with `.q-slide-*` CSS. */
  animationMs: 280,
  /** Extra ignore window after a successful switch so one physical swipe cannot skip ahead. */
  cooldownMs: 140,
} as const

export const QUESTION_SWIPE_LOCK_MS = QUESTION_SWIPE.animationMs + QUESTION_SWIPE.cooldownMs

export const SWIPE_INTERACTIVE_SELECTOR = 'input, textarea, select, [contenteditable="true"]'

export function isInteractiveSwipeTarget(target: EventTarget | null): boolean {
  if (!target || typeof (target as Element).closest !== 'function') return false
  return Boolean((target as Element).closest(SWIPE_INTERACTIVE_SELECTOR))
}

export function resolveSwipeAxis(dx: number, dy: number, lockPx = QUESTION_SWIPE.axisLockPx): SwipeAxis {
  const ax = Math.abs(dx)
  const ay = Math.abs(dy)
  if (ax < lockPx && ay < lockPx) return 'undecided'
  return ay >= ax ? 'vertical' : 'horizontal'
}

export function applySwipeOffset(dx: number, canPrev: boolean, canNext: boolean): number {
  if (dx < 0 && !canNext) return dx * QUESTION_SWIPE.edgeResistance
  if (dx > 0 && !canPrev) return dx * QUESTION_SWIPE.edgeResistance
  return dx
}

export function isSwipeLocked(lockUntil: number, now: number): boolean {
  return now < lockUntil
}

export function nextSwipeLockUntil(now: number, durationMs = QUESTION_SWIPE_LOCK_MS): number {
  return now + durationMs
}

export function resolveSwipeCommit(input: {
  dx: number
  dy: number
  dtMs: number
  width: number
  canPrev: boolean
  canNext: boolean
  axis: SwipeAxis
}): SwipeCommit {
  if (input.axis !== 'horizontal') return null

  const intent: SwipeCommit = input.dx < 0 ? 'next' : input.dx > 0 ? 'prev' : null
  if (!intent) return null
  if (intent === 'prev' && !input.canPrev) return null
  if (intent === 'next' && !input.canNext) return null

  const width = input.width > 0 ? input.width : 320
  const threshold = Math.max(QUESTION_SWIPE.distancePx, width * QUESTION_SWIPE.distanceRatio)
  const distanceOk = Math.abs(input.dx) >= threshold

  const dt = input.dtMs > 0 ? input.dtMs : 1
  const velocity = input.dx / dt
  const flickOk =
    Math.abs(input.dx) >= QUESTION_SWIPE.minFlickPx && Math.abs(velocity) >= QUESTION_SWIPE.velocityPxPerMs

  return distanceOk || flickOk ? intent : null
}

/** One completed pointer gesture → at most one question change, then lock. */
export function finishSwipeGesture(
  input: Parameters<typeof resolveSwipeCommit>[0] & { lockUntil: number; now: number },
): { commit: SwipeCommit; lockUntil: number } {
  if (isSwipeLocked(input.lockUntil, input.now)) {
    return { commit: null, lockUntil: input.lockUntil }
  }
  const commit = resolveSwipeCommit(input)
  if (!commit) return { commit: null, lockUntil: input.lockUntil }
  return { commit, lockUntil: nextSwipeLockUntil(input.now) }
}

export function slideTransitionName(fromIndex: number, toIndex: number): 'q-slide-next' | 'q-slide-prev' | '' {
  if (!Number.isFinite(fromIndex) || !Number.isFinite(toIndex) || fromIndex === toIndex) return ''
  const delta = toIndex - fromIndex
  if (delta === 1) return 'q-slide-next'
  if (delta === -1) return 'q-slide-prev'
  return ''
}
