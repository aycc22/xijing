import { describe, expect, it } from 'vitest'
import {
  SWIPE_ANIMATION_MS,
  SWIPE_AXIS_LOCK_PX,
  SWIPE_COMMIT_DISTANCE_PX,
  SWIPE_COOLDOWN_MS,
  SWIPE_EASING,
  SWIPE_FADE_MS,
  SWIPE_FLICK_DISTANCE_PX,
  SWIPE_FOLLOW_FACTOR,
  SWIPE_FOLLOW_MAX_PX,
  SWIPE_SNAP_BACK_MS,
  SWIPE_UNLOCK_BUFFER_MS,
  canAcceptSwipeStart,
  cancelSwipeGesture,
  consumeSwipeClickSuppression,
  endSwipeGesture,
  followTranslateX,
  idleSwipeState,
  isSwipeIgnoredTarget,
  lockGesturesUntil,
  markSwipeAnimationFinished,
  moveSwipeGesture,
  resolveSwipeAxis,
  shouldCommitSwipe,
  startSwipeGesture,
  swipeIntentFromDelta,
  swipeVelocity,
  transitionNameForIndexChange,
} from './questionSwipe'

function dragHorizontal(
  fromX: number,
  toX: number,
  opts?: { canPrev?: boolean; canNext?: boolean; t0?: number; t1?: number; now?: number },
) {
  const canPrev = opts?.canPrev ?? true
  const canNext = opts?.canNext ?? true
  const t0 = opts?.t0 ?? 0
  const t1 = opts?.t1 ?? 200
  const now = opts?.now ?? 1_000
  let state = idleSwipeState()
  state = startSwipeGesture(state, { pointerId: 1, x: fromX, y: 40, t: t0, now })
  state = moveSwipeGesture(state, {
    pointerId: 1,
    x: fromX + (toX - fromX) * 0.4,
    y: 40,
    t: t0 + (t1 - t0) * 0.4,
    canPrev,
    canNext,
  })
  state = moveSwipeGesture(state, { pointerId: 1, x: toX, y: 40, t: t1, canPrev, canNext })
  return endSwipeGesture(state, {
    pointerId: 1,
    x: toX,
    y: 40,
    t: t1,
    now: now + t1,
    canPrev,
    canNext,
  })
}

describe('swipe direction', () => {
  it('maps left swipe to next and right swipe to prev', () => {
    expect(swipeIntentFromDelta(-40)).toBe('next')
    expect(swipeIntentFromDelta(40)).toBe('prev')
    expect(swipeIntentFromDelta(0)).toBeNull()
  })
})

describe('axis lock', () => {
  it('stays undecided until the lock threshold', () => {
    expect(resolveSwipeAxis(4, 3, 'undecided')).toBe('undecided')
    expect(resolveSwipeAxis(SWIPE_AXIS_LOCK_PX, 2, 'undecided')).toBe('horizontal')
  })

  it('prefers vertical when the finger mostly scrolls the stem', () => {
    expect(resolveSwipeAxis(10, 40, 'undecided')).toBe('vertical')
  })

  it('does not flip axis after it is locked', () => {
    expect(resolveSwipeAxis(80, 2, 'vertical')).toBe('vertical')
    expect(resolveSwipeAxis(2, 80, 'horizontal')).toBe('horizontal')
  })
})

describe('commit rules', () => {
  it('commits a long left swipe as next when next is allowed', () => {
    expect(
      shouldCommitSwipe({ dx: -SWIPE_COMMIT_DISTANCE_PX, dtMs: 180, canPrev: true, canNext: true }),
    ).toBe(true)
  })

  it('does not commit a short slow swipe', () => {
    expect(
      shouldCommitSwipe({ dx: -(SWIPE_FLICK_DISTANCE_PX - 4), dtMs: 400, canPrev: true, canNext: true }),
    ).toBe(false)
  })

  it('commits a short flick by velocity', () => {
    expect(
      shouldCommitSwipe({
        dx: -SWIPE_FLICK_DISTANCE_PX,
        dtMs: 50,
        recentDx: -20,
        recentDtMs: 30,
        canPrev: true,
        canNext: true,
      }),
    ).toBe(true)
  })

  it('never commits next when canNext is false (unrevealed practice / last question)', () => {
    expect(
      shouldCommitSwipe({ dx: -120, dtMs: 80, canPrev: true, canNext: false }),
    ).toBe(false)
  })

  it('never commits prev on the first question', () => {
    expect(
      shouldCommitSwipe({ dx: 120, dtMs: 80, canPrev: false, canNext: true }),
    ).toBe(false)
  })
})

describe('follow offset', () => {
  it('follows the finger with damping and clamps', () => {
    expect(followTranslateX(-100, true, true)).toBeCloseTo(-100 * SWIPE_FOLLOW_FACTOR)
    expect(followTranslateX(-400, true, true)).toBe(-SWIPE_FOLLOW_MAX_PX)
  })

  it('uses extra resistance at a blocked edge', () => {
    const free = Math.abs(followTranslateX(-80, true, true))
    const blocked = Math.abs(followTranslateX(-80, true, false))
    expect(blocked).toBeLessThan(free)
  })
})

describe('ignored targets', () => {
  it('ignores textarea / input so short-answer typing is not a swipe', () => {
    expect(isSwipeIgnoredTarget({ nodeName: 'TEXTAREA' })).toBe(true)
    expect(isSwipeIgnoredTarget({ nodeName: 'INPUT' })).toBe(true)
    expect(isSwipeIgnoredTarget({ nodeName: 'BUTTON' })).toBe(false)
  })

  it('uses closest() when the event target is nested in an input', () => {
    expect(
      isSwipeIgnoredTarget({
        closest: (sel: string) => (sel.includes('textarea') ? {} : null),
      }),
    ).toBe(true)
    expect(isSwipeIgnoredTarget({ closest: () => null })).toBe(false)
  })
})

describe('gesture session', () => {
  it('commits a right swipe to prev', () => {
    const result = dragHorizontal(80, 180)
    expect(result.intent).toBe('prev')
  })

  it('commits one left swipe to next and then ignores a second swipe while locked', () => {
    const first = dragHorizontal(200, 120)
    expect(first.intent).toBe('next')
    expect(first.state.animating).toBe(true)
    expect(canAcceptSwipeStart(first.state, first.state.lockedUntil - 1)).toBe(false)

    const secondStart = startSwipeGesture(first.state, {
      pointerId: 2,
      x: 200,
      y: 40,
      t: 400,
      now: first.state.lockedUntil - 1,
    })
    expect(secondStart.pointerId).toBeNull()
    expect(secondStart).toEqual(first.state)
  })

  it('allows another swipe after animation finishes and cooldown elapsed', () => {
    const first = dragHorizontal(200, 120, { now: 1_000 })
    const unlocked = markSwipeAnimationFinished(first.state)
    const now = lockGesturesUntil(1_000 + 200)
    expect(canAcceptSwipeStart(unlocked, now)).toBe(true)

    const restart = startSwipeGesture(unlocked, {
      pointerId: 3,
      x: 180,
      y: 40,
      t: 0,
      now,
    })
    expect(restart.pointerId).toBe(3)
  })

  it('does not skip two questions from one physical swipe (single end → one intent)', () => {
    const result = dragHorizontal(240, 40, { t0: 0, t1: 90 })
    expect(result.intent).toBe('next')
    expect(result.state.lockedUntil).toBeGreaterThan(0)
  })

  it('rubber-bands instead of switching when next is blocked', () => {
    const result = dragHorizontal(200, 80, { canNext: false })
    expect(result.intent).toBeNull()
    expect(result.state.followX).toBe(0)
    expect(result.state.suppressClick).toBe(true)
  })

  it('locks to vertical and does not change question', () => {
    let state = idleSwipeState()
    state = startSwipeGesture(state, { pointerId: 1, x: 100, y: 20, t: 0, now: 0 })
    state = moveSwipeGesture(state, {
      pointerId: 1,
      x: 108,
      y: 80,
      t: 40,
      canPrev: true,
      canNext: true,
    })
    expect(state.axis).toBe('vertical')
    expect(state.dragging).toBe(false)
    const ended = endSwipeGesture(state, {
      pointerId: 1,
      x: 110,
      y: 120,
      t: 80,
      now: 80,
      canPrev: true,
      canNext: true,
    })
    expect(ended.intent).toBeNull()
  })

  it('ignores extra pointers during an active gesture', () => {
    let state = idleSwipeState()
    state = startSwipeGesture(state, { pointerId: 1, x: 100, y: 40, t: 0, now: 0 })
    const other = startSwipeGesture(state, { pointerId: 2, x: 40, y: 40, t: 10, now: 10 })
    expect(other.pointerId).toBe(1)
    const moved = moveSwipeGesture(state, {
      pointerId: 2,
      x: 20,
      y: 40,
      t: 20,
      canPrev: true,
      canNext: true,
    })
    expect(moved.followX).toBe(0)
  })

  it('cancels a drag without emitting navigation', () => {
    let state = idleSwipeState()
    state = startSwipeGesture(state, { pointerId: 1, x: 100, y: 40, t: 0, now: 0 })
    state = moveSwipeGesture(state, {
      pointerId: 1,
      x: 40,
      y: 40,
      t: 30,
      canPrev: true,
      canNext: true,
    })
    expect(state.dragging).toBe(true)
    state = cancelSwipeGesture(state, 1)
    expect(state.pointerId).toBeNull()
    expect(state.dragging).toBe(false)
    expect(state.followX).toBe(0)
  })

  it('suppresses the trailing click after a committed swipe', () => {
    const { state } = dragHorizontal(200, 100)
    const consumed = consumeSwipeClickSuppression(state)
    expect(consumed.suppress).toBe(true)
    expect(consumeSwipeClickSuppression(consumed.state).suppress).toBe(false)
  })
})

describe('transition naming', () => {
  it('slides for adjacent questions and fades for answer-sheet jumps', () => {
    expect(transitionNameForIndexChange(2, 3)).toBe('qswipe-next')
    expect(transitionNameForIndexChange(3, 2)).toBe('qswipe-prev')
    expect(transitionNameForIndexChange(1, 8)).toBe('qswipe-fade')
  })
})

describe('velocity helper', () => {
  it('returns 0 for non-positive duration', () => {
    expect(swipeVelocity(-40, 0)).toBe(0)
  })
})

describe('lock window', () => {
  it('covers the animation plus cooldown', () => {
    expect(lockGesturesUntil(1000) - 1000).toBe(SWIPE_ANIMATION_MS + SWIPE_COOLDOWN_MS)
  })

  it('keeps a committed swipe locked through the longer page-turn', () => {
    const now = 1_000
    const result = dragHorizontal(200, 120, { now })
    const commitAt = now + 200
    expect(result.state.lockedUntil).toBe(commitAt + SWIPE_ANIMATION_MS + SWIPE_COOLDOWN_MS)
    expect(canAcceptSwipeStart(result.state, commitAt + SWIPE_ANIMATION_MS - 1)).toBe(false)
    expect(canAcceptSwipeStart(result.state, result.state.lockedUntil - 1)).toBe(false)
  })
})

describe('page-turn timing', () => {
  it('is slower than a 300ms snap so the motion is readable on a phone', () => {
    expect(SWIPE_ANIMATION_MS).toBeGreaterThanOrEqual(420)
    expect(SWIPE_SNAP_BACK_MS).toBeGreaterThanOrEqual(300)
    expect(SWIPE_FADE_MS).toBeGreaterThanOrEqual(280)
    expect(SWIPE_UNLOCK_BUFFER_MS).toBeGreaterThan(0)
    expect(SWIPE_SNAP_BACK_MS).toBeLessThanOrEqual(SWIPE_ANIMATION_MS)
  })

  it('uses an ease-out curve rather than linear or ease-in', () => {
    expect(SWIPE_EASING.startsWith('cubic-bezier(')).toBe(true)
    const nums = SWIPE_EASING.slice('cubic-bezier('.length, -1).split(',').map(Number)
    expect(nums).toHaveLength(4)
    const [x1, y1, x2, y2] = nums
    expect(y1).toBeGreaterThan(x1)
    expect(y2).toBeGreaterThan(x2)
  })

  it('keeps CSS fallbacks aligned with JS timing constants', async () => {
    const { readFileSync } = await import('node:fs')
    const { fileURLToPath } = await import('node:url')
    const css = readFileSync(fileURLToPath(new URL('../style.css', import.meta.url)), 'utf8')
    expect(css).toContain(`--qswipe-duration: ${SWIPE_ANIMATION_MS}ms`)
    expect(css).toContain(`--qswipe-snap-duration: ${SWIPE_SNAP_BACK_MS}ms`)
    expect(css).toContain(`--qswipe-fade-duration: ${SWIPE_FADE_MS}ms`)
    expect(css).toContain(`--qswipe-easing: ${SWIPE_EASING}`)
  })
})
