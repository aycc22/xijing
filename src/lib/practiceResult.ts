import type { QuestionOption, QuestionType } from './types'

export interface PracticeSummary {
  total: number
  correct: number
  wrong: number
  rate: number
}

export function computePracticeSummary(session: {
  total_count: number
  correct_count: number
}): PracticeSummary {
  const total = session.total_count
  const correct = session.correct_count
  const wrong = Math.max(0, total - correct)
  const rate = total ? Math.round((correct / total) * 100) : 0
  return { total, correct, wrong, rate }
}

const JUDGEMENT_LABELS: Record<string, string> = {
  TRUE: '正确',
  FALSE: '错误',
}

export function formatAnswerLabel(
  keys: string[],
  qtype: QuestionType,
  options: QuestionOption[],
): string {
  if (!keys.length) return '未作答'
  if (qtype === 'judgement') {
    return keys.map((k) => JUDGEMENT_LABELS[k.toUpperCase()] ?? k).join('、')
  }
  const keyText = keys.join('、')
  const labels = keys
    .map((k) => options.find((o) => o.key.toUpperCase() === k.toUpperCase())?.text ?? k)
    .join('、')
  return labels !== keyText ? `${keyText} · ${labels}` : keyText
}

export function verdictForRate(rate: number): string {
  if (rate >= 90) return '路径清晰'
  if (rate >= 70) return '稳步向前'
  if (rate >= 50) return '还需巩固'
  return '再走一程'
}

export function resultStatusLabel(input: { is_correct: boolean; is_skipped: boolean }): string {
  if (input.is_skipped) return '暂不会'
  return input.is_correct ? '正确' : '错误'
}
