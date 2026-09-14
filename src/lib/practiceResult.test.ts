import { describe, expect, it } from 'vitest'
import {
  computePracticeSummary,
  computePracticeSummaryFromAnswers,
  formatAnswerLabel,
  resultStatusLabel,
  resultStatusSymbol,
  toPracticeReviewItems,
} from './practiceResult'

describe('computePracticeSummary', () => {
  it('treats omitted answered_count as fully judged so exam results stay total-based', () => {
    expect(computePracticeSummary({ total_count: 10, correct_count: 7 })).toEqual({
      total: 10,
      answered: 10,
      correct: 7,
      wrong: 3,
      unanswered: 0,
      rate: 70,
    })
  })

  it('does not count unanswered into wrong or the accuracy denominator', () => {
    expect(
      computePracticeSummary({ total_count: 63, correct_count: 3, answered_count: 4 }),
    ).toEqual({
      total: 63,
      answered: 4,
      correct: 3,
      wrong: 1,
      unanswered: 59,
      rate: 75,
    })
  })

  it('counts 暂不会 as attempted wrong via answer rows', () => {
    expect(
      computePracticeSummaryFromAnswers(63, [
        { is_correct: true, is_skipped: false },
        { is_correct: true, is_skipped: false },
        { is_correct: true, is_skipped: false },
        { is_correct: false, is_skipped: true },
      ]),
    ).toMatchObject({
      answered: 4,
      correct: 3,
      wrong: 1,
      unanswered: 59,
      rate: 75,
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
          reference_answer: '',
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
