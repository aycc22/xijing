import { describe, expect, it } from 'vitest'
import {
  canGoReviewNext,
  canGoReviewPrev,
  clampReviewIndex,
  markReviewOption,
  resolveReviewOptions,
  reviewOptionClass,
  reviewOptionLabels,
  reviewOptionSymbol,
  reviewSheetStatus,
  reviewStandardAnswerText,
  reviewUserAnswerText,
  type ReviewPlayerItem,
} from './sessionReview'

function item(partial: Partial<ReviewPlayerItem> & Pick<ReviewPlayerItem, 'question_id'>): ReviewPlayerItem {
  return {
    selected_keys: [],
    is_correct: false,
    snapshot: null,
    ...partial,
  }
}

describe('clampReviewIndex', () => {
  it('clamps to the last question', () => {
    expect(clampReviewIndex(9, 3)).toBe(2)
  })

  it('clamps negative and non-finite indexes to 0', () => {
    expect(clampReviewIndex(-2, 5)).toBe(0)
    expect(clampReviewIndex(Number.NaN, 5)).toBe(0)
  })

  it('returns 0 when there are no questions', () => {
    expect(clampReviewIndex(3, 0)).toBe(0)
  })
})

describe('review navigation bounds', () => {
  it('disables prev on the first question and next on the last', () => {
    expect(canGoReviewPrev(0)).toBe(false)
    expect(canGoReviewPrev(1)).toBe(true)
    expect(canGoReviewNext(0, 1)).toBe(false)
    expect(canGoReviewNext(1, 3)).toBe(true)
    expect(canGoReviewNext(2, 3)).toBe(false)
  })
})

describe('markReviewOption', () => {
  it('marks selected correct, missed correct, and wrong picks', () => {
    expect(markReviewOption('A', ['A'], ['A', 'C'])).toBe('correct')
    expect(markReviewOption('C', ['A'], ['A', 'C'])).toBe('missed')
    expect(markReviewOption('B', ['B'], ['A'])).toBe('wrong')
    expect(markReviewOption('D', ['B'], ['A'])).toBe('neutral')
  })

  it('compares keys case-insensitively', () => {
    expect(markReviewOption('a', ['A'], ['a'])).toBe('correct')
    expect(markReviewOption('true', ['TRUE'], ['TRUE'])).toBe('correct')
  })
})

describe('review option presentation', () => {
  it('uses more than color: symbols and labels', () => {
    expect(reviewOptionSymbol('correct')).toBe('✓')
    expect(reviewOptionSymbol('missed')).toBe('✓')
    expect(reviewOptionSymbol('wrong')).toBe('✗')
    expect(reviewOptionLabels('correct')).toEqual(['你的选择', '正确答案'])
    expect(reviewOptionLabels('missed')).toEqual(['正确答案'])
    expect(reviewOptionLabels('wrong')).toEqual(['你的选择'])
    expect(reviewOptionClass('correct')).toBe('option-correct')
    expect(reviewOptionClass('wrong')).toBe('option-wrong')
    expect(reviewOptionClass('neutral')).toBe('')
  })
})

describe('resolveReviewOptions', () => {
  it('fills judgement options when the snapshot omitted them', () => {
    const resolved = resolveReviewOptions({
      stem: '对吗',
      qtype: 'judgement',
      options: [],
      answer_keys: ['TRUE'],
    })
    expect(resolved.missing).toBe(false)
    expect(resolved.options.map((o) => o.key)).toEqual(['TRUE', 'FALSE'])
  })

  it('reports missing options for choice questions without a snapshot list', () => {
    expect(
      resolveReviewOptions({
        stem: '题干',
        qtype: 'single',
        options: [],
        answer_keys: ['A'],
      }).missing,
    ).toBe(true)
    expect(resolveReviewOptions(null).missing).toBe(true)
  })

  it('does not treat short-answer as missing options', () => {
    expect(
      resolveReviewOptions({
        stem: '简述',
        qtype: 'short_answer',
        options: [],
        answer_keys: [],
        reference_answer: '参考',
      }),
    ).toEqual({ options: [], missing: false })
  })
})

describe('review answer text', () => {
  it('formats choice answers from the snapshot', () => {
    const row = item({
      question_id: 'q1',
      selected_keys: ['B'],
      snapshot: {
        stem: '题干',
        qtype: 'single',
        options: [
          { key: 'A', text: '甲' },
          { key: 'B', text: '乙' },
        ],
        answer_keys: ['A'],
      },
    })
    expect(reviewUserAnswerText(row)).toBe('B · 乙')
    expect(reviewStandardAnswerText(row.snapshot)).toBe('A · 甲')
  })

  it('uses short-answer text and reference answer', () => {
    const row = item({
      question_id: 'q2',
      selected_keys: ['  用户作答  '],
      snapshot: {
        stem: '简述',
        qtype: 'short_answer',
        options: [],
        answer_keys: [],
        reference_answer: '标准参考',
      },
    })
    expect(reviewUserAnswerText(row)).toBe('用户作答')
    expect(reviewStandardAnswerText(row.snapshot)).toBe('标准参考')
  })

  it('degrades when the snapshot is missing', () => {
    const row = item({ question_id: 'q3', selected_keys: ['A'] })
    expect(reviewUserAnswerText(row)).toBe('A')
    expect(reviewStandardAnswerText(null)).toBeNull()
  })
})

describe('reviewSheetStatus', () => {
  it('maps skipped / correct / wrong for the jumper', () => {
    expect(reviewSheetStatus(item({ question_id: 'a', is_skipped: true }))).toBe('skipped')
    expect(reviewSheetStatus(item({ question_id: 'b', is_correct: true }))).toBe('correct')
    expect(reviewSheetStatus(item({ question_id: 'c', is_correct: false }))).toBe('wrong')
  })
})
