import { describe, expect, it } from 'vitest'
import {
  buildExplainModelPayload,
  canonicalQuestionContent,
  explainCacheHit,
  normalizeExplainOutput,
  userResultCaption,
} from './aiExplain'

const sample = {
  stem: '时间片轮转的特点是？',
  qtype: 'single',
  options: [{ key: 'A', text: '抢占' }],
  answer_keys: ['A'],
  explanation: 'RR 是抢占式调度。',
  case_material: null,
  reference_answer: '',
  existing_tags: ['进程管理'],
}

describe('canonicalQuestionContent', () => {
  it('serializes fields in a stable order without user answers', () => {
    const json = canonicalQuestionContent(sample)
    expect(json).toBe(
      JSON.stringify({
        stem: '时间片轮转的特点是？',
        qtype: 'single',
        options: [{ key: 'A', text: '抢占' }],
        answer_keys: ['A'],
        explanation: 'RR 是抢占式调度。',
        case_material: '',
        reference_answer: '',
      }),
    )
    expect(json).not.toContain('is_correct')
    expect(json).not.toContain('selected')
  })

  it('changes when the stem is edited', () => {
    const a = canonicalQuestionContent(sample)
    const b = canonicalQuestionContent({ ...sample, stem: '改过的题干' })
    expect(a).not.toBe(b)
  })
})

describe('buildExplainModelPayload', () => {
  it('includes teaching fields and existing tags, not user answers', () => {
    const payload = buildExplainModelPayload(sample)
    expect(payload).toEqual({
      stem: sample.stem,
      qtype: sample.qtype,
      options: sample.options,
      answer_keys: sample.answer_keys,
      explanation: sample.explanation,
      case_material: '',
      reference_answer: '',
      existing_tags: ['进程管理'],
    })
  })
})

describe('normalizeExplainOutput', () => {
  it('keeps short exam points, pitfalls and related tags', () => {
    const parsed = normalizeExplainOutput({
      exam_points: ['进程调度', '时间片', '  '],
      intent: '考查时间片轮转。',
      pitfalls: ['与优先级调度混淆'],
      commentary: '答错常见于忽略抢占。',
      related_tags: ['CPU调度', '进程管理'],
    })
    expect(parsed).toEqual({
      exam_points: ['进程调度', '时间片'],
      intent: '考查时间片轮转。',
      pitfalls: ['与优先级调度混淆'],
      commentary: '答错常见于忽略抢占。',
      related_tags: ['CPU调度', '进程管理'],
    })
  })

  it('rejects empty teaching text', () => {
    expect(normalizeExplainOutput({ exam_points: ['x'] })).toBeNull()
    expect(normalizeExplainOutput(null)).toBeNull()
    expect(normalizeExplainOutput('nope')).toBeNull()
  })

  it('caps lists at 8 items', () => {
    const parsed = normalizeExplainOutput({
      exam_points: Array.from({ length: 12 }, (_, i) => `p${i}`),
      intent: '意图',
      pitfalls: [],
      commentary: '点评',
      related_tags: Array.from({ length: 9 }, (_, i) => `t${i}`),
    })
    expect(parsed?.exam_points).toHaveLength(8)
    expect(parsed?.related_tags).toHaveLength(8)
  })
})

describe('explainCacheHit', () => {
  it('hits only ready rows with the same hash when not forced', () => {
    expect(explainCacheHit({ status: 'ready', content_hash: 'abc' }, 'abc', false)).toBe(true)
    expect(explainCacheHit({ status: 'ready', content_hash: 'abc' }, 'zzz', false)).toBe(false)
    expect(explainCacheHit({ status: 'failed', content_hash: 'abc' }, 'abc', false)).toBe(false)
    expect(explainCacheHit({ status: 'ready', content_hash: 'abc' }, 'abc', true)).toBe(false)
    expect(explainCacheHit(null, 'abc', false)).toBe(false)
  })
})

describe('userResultCaption', () => {
  it('relates to correctness locally without model input', () => {
    expect(userResultCaption({ is_correct: true })).toBe('本题你答对了，下面按考点说明。')
    expect(userResultCaption({ is_correct: false })).toBe('本题你答错了，下面按考点说明。')
    expect(userResultCaption({ is_correct: false, is_skipped: true })).toBe(
      '本题你标记为暂不会，下面按考点说明。',
    )
    expect(userResultCaption(null)).toBe('')
  })
})
