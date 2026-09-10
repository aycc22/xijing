import { supabase } from './supabase'

export type AiErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'ai_disabled'
  | 'rate_limited'
  | 'invalid_action'
  | 'upstream_error'
  | 'upstream_invalid'
  | 'not_ready'
  | 'network'
  | 'unknown'

export interface AiProxyError {
  code: AiErrorCode
  message: string
  httpStatus?: number
}

export type AiProxyResult<T> = { ok: true; data: T } | { ok: false; error: AiProxyError }

export interface AnalyzeSessionRequest {
  action: 'analyze_session'
  session_type: 'practice' | 'exam'
  session_id: string
  force?: boolean
}

export interface SessionAiReport {
  id: string
  session_type: 'practice' | 'exam'
  session_id: string
  tag_stats: { tag: string; total: number; correct: number; wrong: number; rate: number }[]
  summary: string
  weak_points: { tag: string; reason: string }[]
  suggestions: string[]
  status: 'ready' | 'failed'
  updated_at: string
}

export interface AnalyzeSessionResponse {
  report: SessionAiReport
  cached: boolean
}

const CODE_MESSAGES: Record<AiErrorCode, string> = {
  unauthorized: '请先登录后再使用智能分析',
  forbidden: '只能分析自己的练习或考试记录',
  not_found: '会话不存在',
  ai_disabled: '智能解读暂未开通',
  rate_limited: '今日分析次数已用完，请明日再试',
  invalid_action: '不支持的分析请求',
  upstream_error: '智能解读暂不可用',
  upstream_invalid: '智能解读暂不可用',
  not_ready: '请先完成作答后再生成分析',
  network: '网络异常，智能解读暂不可用',
  unknown: '智能解读暂不可用',
}

const HTTP_CODE: Record<number, AiErrorCode> = {
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'not_ready',
  429: 'rate_limited',
  400: 'invalid_action',
  502: 'upstream_error',
  503: 'ai_disabled',
}

const KNOWN_CODES = new Set<AiErrorCode>(Object.keys(CODE_MESSAGES) as AiErrorCode[])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function readCode(value: unknown): AiErrorCode | null {
  if (typeof value !== 'string') return null
  return KNOWN_CODES.has(value as AiErrorCode) ? (value as AiErrorCode) : null
}

function readHttpStatus(error: unknown, fallback?: number): number | undefined {
  if (typeof fallback === 'number') return fallback
  if (!isRecord(error)) return undefined
  const context = error.context
  if (isRecord(context) && typeof context.status === 'number') return context.status
  if (typeof error.status === 'number') return error.status
  return undefined
}

export function mapAiProxyFailure(input: {
  data: unknown
  error: unknown
  httpStatus?: number
}): AiProxyError {
  const data = isRecord(input.data) ? input.data : null
  const fromBody = readCode(data?.code)
  const errorMessage =
    (isRecord(input.error) && typeof input.error.message === 'string' && input.error.message) ||
    (typeof data?.error === 'string' && data.error) ||
    ''
  const httpStatus = readHttpStatus(input.error, input.httpStatus)
  const fromHttp = httpStatus ? HTTP_CODE[httpStatus] : undefined
  const looksNetwork = /failed to (fetch|send)|network|fetch/i.test(errorMessage)

  const code: AiErrorCode = fromBody ?? (looksNetwork ? 'network' : fromHttp) ?? 'unknown'
  return {
    code,
    message: CODE_MESSAGES[code],
    httpStatus,
  }
}

export async function invokeAiProxy(
  body: AnalyzeSessionRequest,
): Promise<AiProxyResult<AnalyzeSessionResponse>> {
  const { data, error } = await supabase.functions.invoke('ai-proxy', { body })
  if (error) {
    const httpStatus = readHttpStatus(error)
    return { ok: false, error: mapAiProxyFailure({ data, error, httpStatus }) }
  }
  if (!isRecord(data) || !isRecord(data.report)) {
    return {
      ok: false,
      error: { code: 'upstream_invalid', message: CODE_MESSAGES.upstream_invalid },
    }
  }
  return { ok: true, data: data as unknown as AnalyzeSessionResponse }
}

export function aiErrorUserMessage(error: AiProxyError | null | undefined): string {
  if (!error) return CODE_MESSAGES.unknown
  return error.message || CODE_MESSAGES[error.code] || CODE_MESSAGES.unknown
}
