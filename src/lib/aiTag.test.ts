import { describe, expect, it } from 'vitest'
import {
  AI_TAG_BATCH_LIMIT,
  normalizeAnalyzeQuestionOutput,
  questionUpdateFromAnalyze,
  selectQuestionsForAiTag,
  shouldSkipAiTagWrite,
} from './aiTag'

describe('normalizeAnalyzeQuestionOutput', () => {
  it('requires 1–8 tags and optional difficulty', () => {
    expect(
      normalizeAnalyzeQuestionOutput({
        tags: ['进程调度', '操作系统', ''],
        difficulty: 'medium',
        exam_point_note: '时间片',
      }),
    ).toEqual({
      tags: ['进程调度', '操作系统'],
      difficulty: 'medium',
      exam_point_note: '时间片',
    })
  })

  it('rejects empty tags and unknown difficulty', () => {
    expect(normalizeAnalyzeQuestionOutput({ tags: [] })).toBeNull()
    expect(normalizeAnalyzeQuestionOutput({ tags: ['ok'], difficulty: 'nightmare' })?.difficulty).toBe(
      null,
    )
    expect(normalizeAnalyzeQuestionOutput(null)).toBeNull()
  })

  it('caps tags at 8', () => {
    const parsed = normalizeAnalyzeQuestionOutput({
      tags: Array.from({ length: 10 }, (_, i) => `t${i}`),
    })
    expect(parsed?.tags).toHaveLength(8)
  })
})

describe('shouldSkipAiTagWrite', () => {
  it('skips confirmed tags unless force is set', () => {
    expect(shouldSkipAiTagWrite('2026-09-10T00:00:00Z', false)).toBe(true)
    expect(shouldSkipAiTagWrite('2026-09-10T00:00:00Z', true)).toBe(false)
    expect(shouldSkipAiTagWrite(null, false)).toBe(false)
    expect(shouldSkipAiTagWrite(undefined, false)).toBe(false)
  })
})

describe('selectQuestionsForAiTag', () => {
  const questions = [
    { id: 'a', tags_edited_at: null },
    { id: 'b', tags_edited_at: '2026-09-01T00:00:00Z' },
    { id: 'c', tags_edited_at: null },
  ]

  it('skips edited tags by default and caps at 50', () => {
    const result = selectQuestionsForAiTag(questions, { force: false })
    expect(result.toAnalyze.map((q) => q.id)).toEqual(['a', 'c'])
    expect(result.skippedEdited.map((q) => q.id)).toEqual(['b'])
    expect(result.truncated).toBe(false)
  })

  it('includes edited tags when force is true', () => {
    const result = selectQuestionsForAiTag(questions, { force: true })
    expect(result.toAnalyze.map((q) => q.id)).toEqual(['a', 'b', 'c'])
    expect(result.skippedEdited).toEqual([])
  })

  it('truncates selection to the batch limit', () => {
    const many = Array.from({ length: 52 }, (_, i) => ({ id: `q${i}`, tags_edited_at: null }))
    const result = selectQuestionsForAiTag(many, { force: false })
    expect(result.toAnalyze).toHaveLength(AI_TAG_BATCH_LIMIT)
    expect(result.truncated).toBe(true)
  })
})

describe('questionUpdateFromAnalyze', () => {
  it('writes tags and confirmation stamp; optional difficulty', () => {
    const now = '2026-09-10T12:00:00.000Z'
    expect(
      questionUpdateFromAnalyze(
        { tags: ['进程调度'], difficulty: 'hard', exam_point_note: 'x' },
        now,
        true,
      ),
    ).toEqual({
      tags: ['进程调度'],
      tags_edited_at: now,
      difficulty: 'hard',
    })
    expect(
      questionUpdateFromAnalyze(
        { tags: ['进程调度'], difficulty: null, exam_point_note: '' },
        now,
        true,
      ),
    ).toEqual({
      tags: ['进程调度'],
      tags_edited_at: now,
    })
  })
})
