import { describe, expect, it } from 'vitest'
import {
  isAnswerCorrect,
  isShortAnswerCorrect,
  isSingleChoice,
  isTextAnswer,
  optionRevealClass,
  questionTypeLabel,
  storedAnswerKeys,
  toggleSelection,
} from './scoring'

describe('isSingleChoice', () => {
  it('treats single and judgement as single-choice', () => {
    expect(isSingleChoice('single')).toBe(true)
    expect(isSingleChoice('judgement')).toBe(true)
    expect(isSingleChoice('multiple')).toBe(false)
  })
})

describe('isAnswerCorrect', () => {
  it('scores judgement TRUE/FALSE answers', () => {
    expect(isAnswerCorrect(['TRUE'], ['TRUE'])).toBe(true)
    expect(isAnswerCorrect(['FALSE'], ['TRUE'])).toBe(false)
  })

  it('scores multiple-choice with order ignored', () => {
    expect(isAnswerCorrect(['A', 'C'], ['C', 'A'])).toBe(true)
    expect(isAnswerCorrect(['A'], ['A', 'C'])).toBe(false)
  })

  it('fuzzy-matches short answers against the reference, not option keys', () => {
    expect(isAnswerCorrect(['网闸'], [], 'short_answer', '网闸（安全隔离）')).toBe(true)
    expect(isAnswerCorrect(['  网闸  '], ['A'], 'short_answer', '网闸（安全隔离）')).toBe(true)
    expect(isAnswerCorrect(['无关'], [], 'short_answer', '网闸')).toBe(false)
    expect(isAnswerCorrect(['网闸'], [], 'short_answer', '')).toBe(false)
  })
})

describe('short answer helpers', () => {
  it('treats short_answer as text input', () => {
    expect(isTextAnswer('short_answer')).toBe(true)
    expect(isTextAnswer('single')).toBe(false)
    expect(isShortAnswerCorrect('网闸', '网闸（安全隔离与信息交换系统）')).toBe(true)
    expect(isShortAnswerCorrect('', '网闸')).toBe(false)
  })

  it('does not uppercase short-answer text when persisting', () => {
    expect(storedAnswerKeys(['a'], 'single')).toEqual(['A'])
    expect(storedAnswerKeys(['网闸隔离'], 'short_answer')).toEqual(['网闸隔离'])
  })
})

describe('toggleSelection', () => {
  it('replaces selection for judgement questions', () => {
    expect(toggleSelection(['TRUE'], 'FALSE', 'judgement')).toEqual(['FALSE'])
  })
})

describe('questionTypeLabel', () => {
  it('labels judgement as 判断', () => {
    expect(questionTypeLabel('judgement')).toBe('判断')
  })
})

describe('optionRevealClass', () => {
  it('marks picked wrong answers after reveal', () => {
    expect(optionRevealClass('FALSE', ['FALSE'], ['TRUE'], true)).toBe('option-wrong')
    expect(optionRevealClass('TRUE', ['FALSE'], ['TRUE'], true)).toBe('option-correct')
  })
})
