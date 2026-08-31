import { describe, expect, it } from 'vitest'
import {
  canGoNext,
  canGoPrev,
  canSubmitAnswer,
  createPracticeState,
  markAnswered,
  markSkipped,
  sheetStatus,
  type QuestionAttempt,
} from './practiceSession'

describe('practiceSession', () => {
  it('starts with all questions unanswered', () => {
    const state = createPracticeState(3)
    expect(state.every((a) => sheetStatus(a) === 'unanswered')).toBe(true)
  })

  it('blocks submit without selection', () => {
    const attempt: QuestionAttempt = { status: 'unanswered', selected: [], revealed: false, isCorrect: null }
    expect(canSubmitAnswer(attempt)).toBe(false)
    expect(canSubmitAnswer({ ...attempt, selected: ['A'] })).toBe(true)
  })

  it('marks skip as revealed incorrect', () => {
    const attempt = markSkipped({ status: 'unanswered', selected: [], revealed: false, isCorrect: null })
    expect(attempt.status).toBe('skipped')
    expect(attempt.revealed).toBe(true)
    expect(attempt.isCorrect).toBe(false)
    expect(sheetStatus(attempt)).toBe('skipped')
  })

  it('marks answered correctly', () => {
    const base = { status: 'unanswered' as const, selected: ['B'], revealed: false, isCorrect: null }
    const attempt = markAnswered(base, true)
    expect(sheetStatus(attempt)).toBe('answered')
    expect(attempt.isCorrect).toBe(true)
  })

  it('allows prev except on first question', () => {
    expect(canGoPrev(0)).toBe(false)
    expect(canGoPrev(2)).toBe(true)
  })

  it('allows next only after reveal or when reviewing', () => {
    const unanswered: QuestionAttempt = { status: 'unanswered', selected: [], revealed: false, isCorrect: null }
    const answered: QuestionAttempt = { status: 'answered', selected: ['A'], revealed: true, isCorrect: true }
    expect(canGoNext(0, 5, unanswered)).toBe(false)
    expect(canGoNext(0, 5, answered)).toBe(true)
    expect(canGoNext(4, 5, answered)).toBe(false)
  })
})
