import { describe, expect, it } from 'vitest'
import {
  historyStatusLabel,
  modeLabel,
  partitionHistory,
  sessionHistoryStatus,
  type HistorySession,
} from './history'

function session(partial: Partial<HistorySession> & Pick<HistorySession, 'id'>): HistorySession {
  return {
    bank_id: 'b1',
    bank_title: '内科',
    mode: 'practice',
    total_count: 10,
    correct_count: 7,
    current_index: 3,
    started_at: '2026-08-20T12:00:00Z',
    finished_at: null,
    expired_at: null,
    ...partial,
  }
}

describe('sessionHistoryStatus', () => {
  it('marks finished sessions', () => {
    expect(sessionHistoryStatus(session({ id: '1', finished_at: '2026-08-21T12:00:00Z' }))).toBe('finished')
  })

  it('marks expired sessions', () => {
    expect(sessionHistoryStatus(session({ id: '2', expired_at: '2026-08-21T12:00:00Z' }))).toBe('expired')
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
