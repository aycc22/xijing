import { describe, expect, it } from 'vitest'
import {
  computePracticeSummary,
  formatAnswerLabel,
  resultStatusLabel,
  resultStatusSymbol,
  toPracticeReviewItems,
} from './practiceResult'

describe('computePracticeSummary', () => {
  it('computes wrong count and rate from session totals', () => {
    expect(computePracticeSummary({ total_count: 10, correct_count: 7 })).toEqual({
      total: 10,
      correct: 7,
      wrong: 3,
      rate: 70,
    })
  })

  it('handles zero questions', () => {
    expect(computePracticeSummary({ total_count: 0, correct_count: 0 }).rate).toBe(0)
  })
})

describe('formatAnswerLabel', () => {
  it('maps judgement keys to Chinese labels', () => {
    expect(formatAnswerLabel(['TRUE'], 'judgement', [])).toBe('正确')
    expect(formatAnswerLabel(['FALSE'], 'judgement', [])).toBe('错误')
  })

  it('maps option keys to option text', () => {
    const options = [
      { key: 'A', text: '选项A' },
      { key: 'B', text: '选项B' },
    ]
    expect(formatAnswerLabel(['A', 'B'], 'multiple', options)).toBe('A、B · 选项A、选项B')
  })
})

describe('practice review from snapshots', () => {
  it('maps attempt answers without re-scoring live questions', () => {
    const items = toPracticeReviewItems([
      {
        question_id: 'q1',
        selected_keys: ['A'],
        is_correct: true,
        is_skipped: false,
        question_snapshot: {
          stem: '题干',
          qtype: 'single',
          options: [{ key: 'A', text: '对' }],
          answer_keys: ['A'],
          explanation: '解析',
          case_material: null,
        },
      },
      {
        question_id: 'q2',
        selected_keys: [],
        is_correct: false,
        is_skipped: true,
        question_snapshot: null,
      },
    ])
    expect(items[0].snapshot?.stem).toBe('题干')
    expect(items[0].snapshot?.explanation).toBe('解析')
    expect(resultStatusLabel(items[1])).toBe('暂不会')
    expect(resultStatusSymbol(items[0])).toBe('✓')
    expect(resultStatusSymbol(items[1])).toBe('○')
  })
})
