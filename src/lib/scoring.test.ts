import { describe, expect, it } from 'vitest'
import {
  gradeShortAnswer,
  isAnswerCorrect,
  isSingleChoice,
  optionRevealClass,
  questionTypeLabel,
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

  it('scores short answers via reference text', () => {
    expect(isAnswerCorrect(['SQL注入'], [], 'short_answer', 'SQL注入漏洞')).toBe(true)
    expect(isAnswerCorrect(['XSS'], [], 'short_answer', 'SQL注入漏洞')).toBe(false)
  })
})

describe('gradeShortAnswer', () => {
  it('ignores case and extra whitespace', () => {
    expect(gradeShortAnswer(['  Sql注入  '], 'SQL注入')).toBe(true)
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
