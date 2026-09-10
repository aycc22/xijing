import { beforeEach, describe, expect, it, vi } from 'vitest'

const invoke = vi.fn()

vi.mock('./supabase', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => invoke(...args),
    },
  },
}))

import { invokeAiProxy, mapAiProxyFailure } from './aiProxy'

describe('mapAiProxyFailure', () => {
  it('prefers structured code from the function body', () => {
    expect(
      mapAiProxyFailure({
        data: { error: '未配置 Key', code: 'ai_disabled' },
        error: { message: 'Edge Function returned a non-2xx status code' },
        httpStatus: 503,
      }),
    ).toEqual({
      code: 'ai_disabled',
      message: '智能解读暂未开通',
      httpStatus: 503,
    })
  })

  it('maps not_ready for unrevealed questions', () => {
    expect(
      mapAiProxyFailure({
        data: { code: 'not_ready' },
        error: { context: { status: 409 } },
      }).code,
    ).toBe('not_ready')
  })

  it('maps HTTP status when body has no code', () => {
    expect(
      mapAiProxyFailure({
        data: null,
        error: { message: 'Invalid JWT' },
        httpStatus: 401,
      }).code,
    ).toBe('unauthorized')
    expect(
      mapAiProxyFailure({
        data: { error: 'too many' },
        error: {},
        httpStatus: 429,
      }).code,
    ).toBe('rate_limited')
    expect(
      mapAiProxyFailure({
        data: null,
        error: { message: 'failed to fetch' },
      }).code,
    ).toBe('network')
  })
})

describe('invokeAiProxy', () => {
  beforeEach(() => {
    invoke.mockReset()
  })

  it('returns report data on success', async () => {
    invoke.mockResolvedValue({
      data: { report: { id: 'r1', status: 'ready' }, cached: true },
      error: null,
    })
    const result = await invokeAiProxy({
      action: 'analyze_session',
      session_type: 'practice',
      session_id: 's1',
    })
    expect(result).toEqual({
      ok: true,
      data: { report: { id: 'r1', status: 'ready' }, cached: true },
    })
    expect(invoke).toHaveBeenCalledWith('ai-proxy', {
      body: { action: 'analyze_session', session_type: 'practice', session_id: 's1' },
    })
  })

  it('maps ai_disabled from a failed invoke', async () => {
    invoke.mockResolvedValue({
      data: { error: 'missing key', code: 'ai_disabled' },
      error: { message: 'Edge Function returned a non-2xx status code', context: { status: 503 } },
    })
    const result = await invokeAiProxy({
      action: 'analyze_session',
      session_type: 'exam',
      session_id: 's1',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('ai_disabled')
      expect(result.error.message).toBe('智能解读暂未开通')
    }
  })

  it('maps unauthorized, forbidden, and rate_limited', async () => {
    invoke.mockResolvedValueOnce({
      data: { code: 'unauthorized' },
      error: { context: { status: 401 } },
    })
    const unauth = await invokeAiProxy({
      action: 'analyze_session',
      session_type: 'practice',
      session_id: 's1',
    })
    expect(unauth.ok).toBe(false)
    if (!unauth.ok) expect(unauth.error.code).toBe('unauthorized')

    invoke.mockResolvedValueOnce({
      data: { code: 'forbidden' },
      error: { context: { status: 403 } },
    })
    const forbidden = await invokeAiProxy({
      action: 'analyze_session',
      session_type: 'practice',
      session_id: 's1',
    })
    expect(forbidden.ok).toBe(false)
    if (!forbidden.ok) expect(forbidden.error.code).toBe('forbidden')

    invoke.mockResolvedValueOnce({
      data: { code: 'rate_limited' },
      error: { context: { status: 429 } },
    })
    const limited = await invokeAiProxy({
      action: 'analyze_session',
      session_type: 'practice',
      session_id: 's1',
    })
    expect(limited.ok).toBe(false)
    if (!limited.ok) expect(limited.error.code).toBe('rate_limited')
  })

  it('returns explain payload on success', async () => {
    invoke.mockResolvedValue({
      data: {
        explain: { question_id: 'q1', commentary: '点评', intent: '意图', exam_points: [], pitfalls: [], related_tags: [] },
        user_result: { is_correct: false, is_skipped: false, selected_keys: ['B'] },
        cached: true,
      },
      error: null,
    })
    const result = await invokeAiProxy({
      action: 'explain_question',
      question_id: 'q1',
      session_type: 'practice',
      session_id: 's1',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.explain.commentary).toBe('点评')
      expect(result.data.cached).toBe(true)
    }
  })

  it('returns analyze_question suggestion', async () => {
    invoke.mockResolvedValue({
      data: { suggestion: { tags: ['进程调度'], difficulty: 'medium', exam_point_note: 'n' }, applied: false },
      error: null,
    })
    const result = await invokeAiProxy({ action: 'analyze_question', question_id: 'q1', apply: false })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.suggestion.tags).toEqual(['进程调度'])
  })

  it('returns grade payload without treating it as a session report', async () => {
    invoke.mockResolvedValue({
      data: {
        grade: {
          question_id: 'q1',
          ai_score: 4,
          max_score: 5,
          ai_feedback: { text: '较好', rubric_hits: [] },
          grading_status: 'done',
          earned: 0,
          score: 5,
        },
        cached: false,
      },
      error: null,
    })
    const result = await invokeAiProxy({
      action: 'grade_short_answer',
      session_id: 's1',
      question_id: 'q1',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.grade.ai_score).toBe(4)
      expect(result.data.grade.earned).toBe(0)
    }
  })

  it('maps fetch failures to network', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: { message: 'Failed to send a request to the Edge Function' },
    })
    const result = await invokeAiProxy({
      action: 'analyze_session',
      session_type: 'practice',
      session_id: 's1',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('network')
  })
})
