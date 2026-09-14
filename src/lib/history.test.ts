import { describe, expect, it } from 'vitest'
import {
  applyPracticeAnsweredCounts,
  computeHistoryStats,
  countAnswersBySessionId,
  detailPathForSession,
  examResultPath,
  examReviewPath,
  historyResultText,
  historyStatusLabel,
  mergeHistorySessions,
  modeLabel,
  partitionHistory,
  practiceResultPath,
  practiceReviewPath,
  sessionHistoryStatus,
  type HistorySession,
} from './history'

function session(partial: Partial<HistorySession> & Pick<HistorySession, 'id'>): HistorySession {
  return {
    bank_id: 'b1',
    bank_title: '内科',
    mode: 'practice',
    kind: 'practice',
    paper_id: null,
    total_count: 10,
    correct_count: 7,
    answered_count: undefined,
    current_index: 3,
    started_at: '2026-08-20T12:00:00Z',
    finished_at: null,
    expired_at: null,
    ...partial,
  }
}

describe('sessionHistoryStatus', () => {
  it('marks finished sessions', () => {
    expect(sessionHistoryStatus(session({ id: '1', finished_at: '2026-08-21T12:00:00Z' }))).toBe(
      'finished',
    )
  })

  it('marks expired sessions', () => {
    expect(sessionHistoryStatus(session({ id: '2', expired_at: '2026-08-21T12:00:00Z' }))).toBe(
      'expired',
    )
  })

  it('marks in-progress sessions', () => {
    expect(sessionHistoryStatus(session({ id: '3' }))).toBe('in_progress')
  })
})

describe('partitionHistory', () => {
  it('splits unfinished and finished lists', () => {
    const rows = [
      session({ id: 'a', finished_at: '2026-08-21T12:00:00Z' }),
      session({ id: 'b' }),
      session({ id: 'c', expired_at: '2026-08-22T12:00:00Z' }),
    ]
    const parts = partitionHistory(rows)
    expect(parts.inProgress.map((s) => s.id)).toEqual(['b'])
    expect(parts.finished.map((s) => s.id)).toEqual(['a'])
    expect(parts.expired.map((s) => s.id)).toEqual(['c'])
  })
})

describe('labels', () => {
  it('labels mode and status', () => {
    expect(modeLabel('practice')).toBe('刷题')
    expect(modeLabel('exam')).toBe('答题')
    expect(historyStatusLabel('in_progress')).toBe('未完成')
    expect(historyStatusLabel('finished')).toBe('已完成')
    expect(historyStatusLabel('expired')).toBe('已过期')
  })
})

describe('result and review paths', () => {
  it('keeps summary and review on distinct deep-linkable routes', () => {
    expect(practiceResultPath('p1')).toBe('/result/p1')
    expect(practiceReviewPath('p1')).toBe('/result/p1/review')
    expect(examResultPath('e1')).toBe('/exam-result/e1')
    expect(examReviewPath('e1')).toBe('/exam-result/e1/review')
    expect(practiceReviewPath('p1')).not.toBe(practiceResultPath('p1'))
    expect(examReviewPath('e1')).not.toBe(examResultPath('e1'))
  })
})

describe('detailPathForSession', () => {
  it('sends finished practice to result page, not the review page', () => {
    expect(
      detailPathForSession(session({ id: 'p1', finished_at: '2026-08-21T12:00:00Z' })),
    ).toBe('/result/p1')
  })

  it('sends in-progress practice to quiz', () => {
    expect(detailPathForSession(session({ id: 'p2' }))).toBe('/quiz/b1')
  })

  it('sends finished exams to exam-result, not practice result', () => {
    expect(
      detailPathForSession(
        session({
          id: 'e1',
          mode: 'exam',
          kind: 'exam',
          paper_id: 'paper-1',
          finished_at: '2026-08-21T12:00:00Z',
        }),
      ),
    ).toBe('/exam-result/e1')
  })

  it('sends in-progress exams to exam page', () => {
    expect(
      detailPathForSession(
        session({
          id: 'e2',
          mode: 'exam',
          kind: 'exam',
          paper_id: 'paper-9',
        }),
      ),
    ).toBe('/exam/paper-9')
  })
})

describe('mergeHistorySessions', () => {
  it('sorts newest first', () => {
    const rows = [
      session({ id: 'old', started_at: '2026-01-01T00:00:00Z' }),
      session({ id: 'new', started_at: '2026-08-01T00:00:00Z' }),
    ]
    expect(mergeHistorySessions(rows).map((s) => s.id)).toEqual(['new', 'old'])
  })
})

describe('computeHistoryStats', () => {
  it('sums finished sessions only', () => {
    const stats = computeHistoryStats([
      session({ id: 'f', finished_at: '2026-08-21T12:00:00Z', total_count: 10, correct_count: 7 }),
      session({ id: 'open', total_count: 5, correct_count: 1 }),
    ])
    expect(stats).toEqual({ sessionCount: 1, total: 10, answered: 10, correct: 7, rate: 70 })
  })

  it('uses attempted questions as the accuracy denominator', () => {
    const stats = computeHistoryStats([
      session({
        id: 'early',
        finished_at: '2026-08-21T12:00:00Z',
        total_count: 63,
        correct_count: 3,
        answered_count: 4,
      }),
    ])
    expect(stats.total).toBe(63)
    expect(stats.answered).toBe(4)
    expect(stats.correct).toBe(3)
    expect(stats.rate).toBe(75)
  })
})

describe('historyResultText', () => {
  it('shows progress for unfinished sessions', () => {
    expect(historyResultText(session({ id: 'open', current_index: 2, total_count: 10 }))).toBe(
      '进度 3 / 10',
    )
  })

  it('does not treat unanswered as wrong on finished practice', () => {
    expect(
      historyResultText(
        session({
          id: 'done',
          finished_at: '2026-08-21T12:00:00Z',
          total_count: 63,
          correct_count: 3,
          answered_count: 4,
        }),
      ),
    ).toBe('3/4 · 75% · 未作答 59')
  })
})

describe('practice answered counts', () => {
  it('aggregates attempt_answers rows by session', () => {
    const counts = countAnswersBySessionId([
      { session_id: 's1' },
      { session_id: 's1' },
      { session_id: 's2' },
    ])
    expect(counts.get('s1')).toBe(2)
    expect(counts.get('s2')).toBe(1)
  })

  it('attaches counts only to practice sessions', () => {
    const counts = new Map([
      ['p1', 4],
      ['e1', 99],
    ])
    const rows = applyPracticeAnsweredCounts(
      [
        session({ id: 'p1', total_count: 63, correct_count: 3 }),
        session({ id: 'e1', kind: 'exam', mode: 'exam', total_count: 10, correct_count: 8 }),
      ],
      counts,
    )
    expect(rows[0].answered_count).toBe(4)
    expect(rows[1].answered_count).toBeUndefined()
  })
})
