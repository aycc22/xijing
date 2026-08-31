import { describe, expect, it } from 'vitest'
import {
  clampResumeIndex,
  isSessionExpired,
  rebuildAttemptsFromAnswers,
  type StoredAnswer,
} from './practiceResume'

describe('isSessionExpired', () => {
  const now = new Date('2026-08-31T12:00:00Z').getTime()

  it('expires sessions older than 30 days', () => {
    expect(isSessionExpired('2026-07-01T12:00:00Z', now)).toBe(true)
  })

  it('keeps sessions within 30 days', () => {
    expect(isSessionExpired('2026-08-20T12:00:00Z', now)).toBe(false)
  })
})

describe('rebuildAttemptsFromAnswers', () => {
  const ids = ['q1', 'q2', 'q3']
  const answers: StoredAnswer[] = [
    { question_id: 'q1', selected_keys: ['A'], is_correct: true, is_skipped: false },
    { question_id: 'q2', selected_keys: [], is_correct: false, is_skipped: true },
  ]

  it('restores submitted and skipped attempts', () => {
    const { attempts, correctCount } = rebuildAttemptsFromAnswers(ids, answers)
    expect(correctCount).toBe(1)
    expect(attempts[0].status).toBe('answered')
    expect(attempts[0].revealed).toBe(true)
    expect(attempts[1].status).toBe('skipped')
    expect(attempts[2].status).toBe('unanswered')
  })
})

describe('clampResumeIndex', () => {
  it('clamps index into valid range', () => {
    expect(clampResumeIndex(5, 3)).toBe(2)
    expect(clampResumeIndex(-1, 3)).toBe(0)
  })
})
