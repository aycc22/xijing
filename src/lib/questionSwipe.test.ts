import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { SWIPE_ANIMATION_MS, SWIPE_EASING, SWIPE_FADE_MS, transitionNameForIndexChange } from './questionSwipe'

const styleCss = readFileSync(fileURLToPath(new URL('../style.css', import.meta.url)), 'utf8')
const pagerSource = readFileSync(
  fileURLToPath(new URL('../components/QuestionSwipePager.vue', import.meta.url)),
  'utf8',
)

describe('transition naming', () => {
  it('slides for adjacent questions and fades for answer-sheet jumps', () => {
    expect(transitionNameForIndexChange(2, 3)).toBe('qswipe-next')
    expect(transitionNameForIndexChange(3, 2)).toBe('qswipe-prev')
    expect(transitionNameForIndexChange(1, 8)).toBe('qswipe-fade')
  })
})

describe('page-turn timing', () => {
  it('keeps adjacent turns readable on a phone', () => {
    expect(SWIPE_ANIMATION_MS).toBeGreaterThanOrEqual(420)
    expect(SWIPE_FADE_MS).toBeGreaterThanOrEqual(280)
    expect(SWIPE_FADE_MS).toBeLessThanOrEqual(SWIPE_ANIMATION_MS)
  })

  it('uses an ease-out curve rather than linear or ease-in', () => {
    expect(SWIPE_EASING.startsWith('cubic-bezier(')).toBe(true)
    const nums = SWIPE_EASING.slice('cubic-bezier('.length, -1).split(',').map(Number)
    expect(nums).toHaveLength(4)
    const [x1, y1, x2, y2] = nums
    expect(y1).toBeGreaterThan(x1)
    expect(y2).toBeGreaterThan(x2)
  })

  it('keeps CSS fallbacks aligned with JS timing constants', () => {
    expect(styleCss).toContain(`--qswipe-duration: ${SWIPE_ANIMATION_MS}ms`)
    expect(styleCss).toContain(`--qswipe-fade-duration: ${SWIPE_FADE_MS}ms`)
    expect(styleCss).toContain(`--qswipe-easing: ${SWIPE_EASING}`)
  })

  it('fades leave and enter cards fully so overlapping ghosts do not linger', () => {
    expect(styleCss).toMatch(/\.qswipe-next-leave-to\s*\{[^}]*opacity:\s*0/)
    expect(styleCss).toMatch(/\.qswipe-next-enter-from\s*\{[^}]*opacity:\s*0/)
    expect(styleCss).toMatch(/\.qswipe-prev-leave-to\s*\{[^}]*opacity:\s*0/)
    expect(styleCss).toMatch(/\.qswipe-prev-enter-from\s*\{[^}]*opacity:\s*0/)
    expect(styleCss).toContain('isolation: isolate')
  })
})

describe('swipe gesture removal', () => {
  it('does not keep pointer handlers or follow-finger state on the question pager', () => {
    expect(pagerSource).not.toMatch(/pointerdown|pointermove|pointerup|pointercancel|touchstart|touchmove|touchend/)
    expect(pagerSource).not.toMatch(/followX|snapBack|swipeDriven|emit\(['"](?:prev|next)['"]\)/)
    expect(styleCss).not.toMatch(/qswipe-follow|qswipe-snap|--qswipe-follow|--qswipe-commit-from|--qswipe-snap-duration/)
  })
})
