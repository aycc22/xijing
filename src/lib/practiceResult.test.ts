import { describe, expect, it } from 'vitest'
import { computePracticeSummary, formatAnswerLabel } from './practiceResult'

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
