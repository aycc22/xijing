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
