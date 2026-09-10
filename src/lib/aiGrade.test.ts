import { describe, expect, it } from 'vitest'
import {
  clampAiScore,
  gradingStatusOnSubmit,
  mergeAiGradeIntoItems,
  needsAiGrade,
  normalizeGradeOutput,
  shouldReuseGrade,
} from './aiGrade'

describe('gradingStatusOnSubmit', () => {
  it('marks short answer pending and objective items scored', () => {
    expect(gradingStatusOnSubmit('short_answer')).toBe('pending')
    expect(gradingStatusOnSubmit('single')).toBe('scored')
    expect(gradingStatusOnSubmit('multiple')).toBe('scored')
    expect(gradingStatusOnSubmit('judgement')).toBe('scored')
  })
})

describe('clampAiScore', () => {
  it('clamps to [0, max] and rounds to integer when max is integer', () => {
    expect(clampAiScore(4.6, 5)).toBe(5)
    expect(clampAiScore(-1, 5)).toBe(0)
    expect(clampAiScore(9, 5)).toBe(5)
  })

  it('rounds to half points when max is not an integer', () => {
    expect(clampAiScore(1.24, 2.5)).toBe(1)
    expect(clampAiScore(1.26, 2.5)).toBe(1.5)
  })
})

describe('normalizeGradeOutput', () => {
  it('parses score, feedback and rubric hits then clamps', () => {
    expect(
      normalizeGradeOutput(
        {
          score: 8,
          feedback: '要点基本覆盖',
          rubric_hits: [
            { point: '定义', hit: true },
            { point: '例子', hit: false },
          ],
        },
        5,
      ),
    ).toEqual({
      score: 5,
      feedback: '要点基本覆盖',
      rubric_hits: [
        { point: '定义', hit: true },
        { point: '例子', hit: false },
      ],
    })
  })

  it('rejects missing numeric score', () => {
    expect(normalizeGradeOutput({ feedback: 'x' }, 5)).toBeNull()
    expect(normalizeGradeOutput(null, 5)).toBeNull()
  })
})

describe('needsAiGrade', () => {
  it('grades unfinished short answers only', () => {
    expect(needsAiGrade({ qtype: 'short_answer', grading_status: 'pending' })).toBe(true)
    expect(needsAiGrade({ qtype: 'short_answer' })).toBe(true)
    expect(needsAiGrade({ qtype: 'short_answer', grading_status: 'done' })).toBe(false)
    expect(needsAiGrade({ qtype: 'single', grading_status: 'pending' })).toBe(false)
  })
})

describe('shouldReuseGrade', () => {
  it('reuses done grades unless force is set', () => {
    expect(shouldReuseGrade('done', false)).toBe(true)
    expect(shouldReuseGrade('done', true)).toBe(false)
    expect(shouldReuseGrade('failed', false)).toBe(false)
    expect(shouldReuseGrade('pending', false)).toBe(false)
  })
})

describe('mergeAiGradeIntoItems', () => {
  const items = [
    {
      question_id: 'obj',
      score: 2,
      earned: 2,
      is_correct: true,
      grading_status: 'scored' as const,
    },
    {
      question_id: 'sa',
      score: 5,
      earned: 0,
      is_correct: false,
      grading_status: 'pending' as const,
    },
  ]

  it('writes advisory AI fields without changing earned or max score', () => {
    const next = mergeAiGradeIntoItems(items, 'sa', {
      grading_status: 'done',
      ai_score: 4,
      ai_feedback: { text: '较好', rubric_hits: [{ point: '定义', hit: true }] },
    })
    expect(next[1]).toMatchObject({
      question_id: 'sa',
      score: 5,
      earned: 0,
      is_correct: false,
      grading_status: 'done',
      ai_score: 4,
      ai_feedback: { text: '较好', rubric_hits: [{ point: '定义', hit: true }] },
    })
    expect(next[0]).toEqual(items[0])
    const sessionScore = next.reduce((sum, item) => sum + item.earned, 0)
    expect(sessionScore).toBe(2)
  })

  it('marks failed without touching earned', () => {
    const next = mergeAiGradeIntoItems(items, 'sa', { grading_status: 'failed' })
    expect(next[1].earned).toBe(0)
    expect(next[1].grading_status).toBe('failed')
  })
})
