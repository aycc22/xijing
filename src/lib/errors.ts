const EXAM_SUBMIT_ERROR_MAP: Record<string, string> = {
  'exam session not found': '答题记录不存在，请返回试卷重新开始',
  'not allowed': '登录已过期或无权限，请重新登录后再交卷',
  'paper not found': '试卷不存在或已被删除，无法交卷',
  'paper grading not found': '试卷缺少判分数据，请联系管理员或重新组卷',
  'Could not find the function public.finish_exam_session': '服务器尚未更新交卷功能，请稍后再试',
}

function normalizeErrorText(message: string): string {
  return message.trim().toLowerCase()
}

function mapKnownExamSubmitError(message: string): string | null {
  const normalized = normalizeErrorText(message)
  for (const [key, value] of Object.entries(EXAM_SUBMIT_ERROR_MAP)) {
    if (normalized.includes(key.toLowerCase())) return value
  }
  if (normalized.includes('jwt expired') || normalized.includes('invalid jwt')) {
    return '登录已过期，请重新登录后再交卷'
  }
  if (normalized.includes('failed to fetch') || normalized.includes('network')) {
    return '网络异常，请检查网络后重试'
  }
  return null
}

export function formatErrorMessage(err: unknown, fallback: string): string {
  if (!err) return fallback
  if (typeof err === 'string') {
    const mapped = mapKnownExamSubmitError(err)
    return mapped ?? err
  }
  if (err instanceof Error) {
    const mapped = mapKnownExamSubmitError(err.message)
    return mapped ?? (err.message || fallback)
  }
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const message = String((err as { message: unknown }).message ?? '')
    if (message) {
      const mapped = mapKnownExamSubmitError(message)
      return mapped ?? message
    }
  }
  return fallback
}
