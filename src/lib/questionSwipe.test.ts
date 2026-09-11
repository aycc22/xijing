import { describe, expect, it } from 'vitest'
import {
  applySwipeOffset,
  finishSwipeGesture,
  isInteractiveSwipeTarget,
  isSwipeLocked,
  nextSwipeLockUntil,
  QUESTION_SWIPE,
  QUESTION_SWIPE_LOCK_MS,
  resolveSwipeAxis,
  resolveSwipeCommit,
  slideTransitionName,
  type SwipeCommit,
} from './questionSwipe'

function gesture(partial: Partial<Parameters<typeof resolveSwipeCommit>[0]> = {}) {
  return {
    dx: 0,
    dy: 0,
    dtMs: 160,
    width: 360,
    canPrev: true,
    canNext: true,
    axis: 'horizontal' as const,
    ...partial,
  }
}

describe('resolveSwipeAxis', () => {
  it('stays undecided until the lock distance', () => {
    expect(resolveSwipeAxis(4, 3)).toBe('undecided')
    expect(resolveSwipeAxis(11, 2)).toBe('undecided')
  })

  it('prefers vertical when movement is tied or mostly vertical so long stems still scroll', () => {
    expect(resolveSwipeAxis(20, 20)).toBe('vertical')
    expect(resolveSwipeAxis(18, 40)).toBe('vertical')
    expect(resolveSwipeAxis(8, 30)).toBe('vertical')
  })

  it('locks horizontal only when sideways travel clearly wins', () => {
    expect(resolveSwipeAxis(-40, 10)).toBe('horizontal')
    expect(resolveSwipeAxis(50, -12)).toBe('horizontal')
  })
})

describe('resolveSwipeCommit', () => {
  it('maps swipe left to next and swipe right to prev', () => {
    expect(resolveSwipeCommit(gesture({ dx: -80 }))).toBe('next')
    expect(resolveSwipeCommit(gesture({ dx: 80 }))).toBe('prev')
  })

  it('ignores vertical or undecided axes', () => {
    expect(resolveSwipeCommit(gesture({ dx: -90, dy: 100, axis: 'vertical' }))).toBe(null)
    expect(resolveSwipeCommit(gesture({ dx: -90, axis: 'undecided' }))).toBe(null)
  })

  it('does not commit a short slow drag (option tap / accidental nudge)', () => {
    expect(resolveSwipeCommit(gesture({ dx: -20, dtMs: 280 }))).toBe(null)
    expect(resolveSwipeCommit(gesture({ dx: 30, dtMs: 400 }))).toBe(null)
  })

  it('commits a short but fast flick', () => {
    expect(resolveSwipeCommit(gesture({ dx: -40, dtMs: 80 }))).toBe('next')
    expect(resolveSwipeCommit(gesture({ dx: 40, dtMs: 70 }))).toBe('prev')
  })

  it('does not treat a tiny jitter as a flick', () => {
    expect(resolveSwipeCommit(gesture({ dx: -10, dtMs: 20 }))).toBe(null)
  })

  it('respects canPrev / canNext (rubber-band, no skip past ends or unrevealed practice next)', () => {
    expect(resolveSwipeCommit(gesture({ dx: -90, canNext: false }))).toBe(null)
    expect(resolveSwipeCommit(gesture({ dx: 90, canPrev: false }))).toBe(null)
  })

  it('uses width ratio so a wide screen still needs a real swipe', () => {
    expect(resolveSwipeCommit(gesture({ dx: -50, width: 400, dtMs: 400 }))).toBe(null)
    expect(resolveSwipeCommit(gesture({ dx: -80, width: 400, dtMs: 400 }))).toBe('next')
  })
})

describe('applySwipeOffset', () => {
  it('follows the finger when the direction is allowed', () => {
    expect(applySwipeOffset(-40, true, true)).toBe(-40)
    expect(applySwipeOffset(25, true, true)).toBe(25)
  })

  it('rubber-bands at the ends', () => {
    expect(applySwipeOffset(-100, true, false)).toBeCloseTo(-100 * QUESTION_SWIPE.edgeResistance)
    expect(applySwipeOffset(100, false, true)).toBeCloseTo(100 * QUESTION_SWIPE.edgeResistance)
  })
})

describe('finishSwipeGesture lock', () => {
  it('commits at most once until animation + cooldown elapse', () => {
    const first = finishSwipeGesture({ ...gesture({ dx: -90 }), lockUntil: 0, now: 1_000 })
    expect(first.commit).toBe('next')
    expect(first.lockUntil).toBe(1_000 + QUESTION_SWIPE_LOCK_MS)

    const rapid = finishSwipeGesture({ ...gesture({ dx: -120 }), lockUntil: first.lockUntil, now: 1_080 })
    expect(rapid.commit).toBe(null)

    const stillLocked = finishSwipeGesture({
      ...gesture({ dx: -120 }),
      lockUntil: first.lockUntil,
      now: first.lockUntil - 1,
    })
    expect(stillLocked.commit).toBe(null)

    const afterLock = finishSwipeGesture({
      ...gesture({ dx: -90 }),
      lockUntil: first.lockUntil,
      now: first.lockUntil,
    })
    expect(afterLock.commit).toBe('next')
  })

  it('does not arm a lock when the gesture is not a commit', () => {
    const result = finishSwipeGesture({ ...gesture({ dx: -10, dtMs: 300 }), lockUntil: 0, now: 50 })
    expect(result.commit).toBe(null)
    expect(result.lockUntil).toBe(0)
  })

  it('treats a single gesture as one question even if travel is many screen-widths', () => {
    const commits: SwipeCommit[] = []
    let lockUntil = 0
    // One pointer-up with a huge dx — still one commit, not a skip of 3 questions.
    const done = finishSwipeGesture({ ...gesture({ dx: -900, width: 300 }), lockUntil, now: 0 })
    commits.push(done.commit)
    lockUntil = done.lockUntil
    expect(commits).toEqual(['next'])
    expect(isSwipeLocked(lockUntil, 10)).toBe(true)
  })
})

describe('slideTransitionName', () => {
  it('slides only for adjacent question changes', () => {
    expect(slideTransitionName(2, 3)).toBe('q-slide-next')
    expect(slideTransitionName(2, 1)).toBe('q-slide-prev')
    expect(slideTransitionName(0, 8)).toBe('')
    expect(slideTransitionName(4, 4)).toBe('')
  })
})

describe('isInteractiveSwipeTarget', () => {
  it('ignores swipes that start on form fields so short-answer typing is safe', () => {
    const textarea = { closest: (sel: string) => (sel.includes('textarea') ? {} : null) }
    expect(isInteractiveSwipeTarget(textarea as unknown as EventTarget)).toBe(true)
    const option = { closest: () => null }
    expect(isInteractiveSwipeTarget(option as unknown as EventTarget)).toBe(false)
    expect(isInteractiveSwipeTarget(null)).toBe(false)
  })
})

describe('lock helpers', () => {
  it('computes lock window from now', () => {
    expect(nextSwipeLockUntil(100)).toBe(100 + QUESTION_SWIPE_LOCK_MS)
    expect(isSwipeLocked(100, 99)).toBe(true)
    expect(isSwipeLocked(100, 100)).toBe(false)
  })
})
