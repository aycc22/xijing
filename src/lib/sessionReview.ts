import { formatAnswerLabel } from './practiceResult'
import { ensureQuestionOptions } from './scoring'
import type { QuestionOption, QuestionType } from './types'

export type ReviewOptionMark = 'correct' | 'missed' | 'wrong' | 'neutral'

export interface ReviewPlayerSnapshot {
  stem: string
  qtype: QuestionType
  options: QuestionOption[]
  answer_keys: string[]
  explanation?: string
  case_material?: string | null
  attachments?: unknown[] | null
  reference_answer?: string
}

export interface ReviewPlayerItem {
  question_id: string
  selected_keys: string[]
  is_correct: boolean
  is_skipped?: boolean
  earned?: number
  score?: number
  snapshot: ReviewPlayerSnapshot | null
}

export function clampReviewIndex(index: number, total: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0
  if (!Number.isFinite(index)) return 0
  return Math.min(Math.max(0, Math.trunc(index)), total - 1)
}

export function canGoReviewPrev(index: number): boolean {
  return index > 0
}

export function canGoReviewNext(index: number, total: number): boolean {
  return total > 0 && index < total - 1
}

function keySet(keys: string[]): Set<string> {
  return new Set(keys.map((k) => k.toUpperCase()))
}

export function markReviewOption(
  key: string,
  selectedKeys: string[],
  answerKeys: string[],
): ReviewOptionMark {
  const picked = keySet(selectedKeys).has(key.toUpperCase())
  const isAnswer = keySet(answerKeys).has(key.toUpperCase())
  if (isAnswer) return picked ? 'correct' : 'missed'
  if (picked) return 'wrong'
  return 'neutral'
}

export function reviewOptionClass(mark: ReviewOptionMark): string {
  if (mark === 'correct' || mark === 'missed') return 'option-correct'
  if (mark === 'wrong') return 'option-wrong'
  return ''
}

export function reviewOptionSymbol(mark: ReviewOptionMark): string {
  if (mark === 'correct' || mark === 'missed') return '✓'
  if (mark === 'wrong') return '✗'
  return ''
}

export function reviewOptionLabels(mark: ReviewOptionMark): string[] {
  if (mark === 'correct') return ['你的选择', '正确答案']
  if (mark === 'missed') return ['正确答案']
  if (mark === 'wrong') return ['你的选择']
  return []
}

export function resolveReviewOptions(snapshot: ReviewPlayerSnapshot | null): {
  options: QuestionOption[]
  missing: boolean
} {
  if (!snapshot) return { options: [], missing: true }
  if (snapshot.qtype === 'short_answer') return { options: [], missing: false }
  const options = ensureQuestionOptions(snapshot.qtype, snapshot.options ?? [])
  return { options, missing: options.length === 0 }
}

export function reviewUserAnswerText(item: ReviewPlayerItem): string {
  const snap = item.snapshot
  if (!snap) return item.selected_keys.join('、') || '未作答'
  if (snap.qtype === 'short_answer') return item.selected_keys[0]?.trim() || '（未作答）'
  return formatAnswerLabel(item.selected_keys, snap.qtype, snap.options ?? [])
}

export function reviewStandardAnswerText(snapshot: ReviewPlayerSnapshot | null): string | null {
  if (!snapshot) return null
  if (snapshot.qtype === 'short_answer') return snapshot.reference_answer?.trim() || '（无参考答案）'
  return formatAnswerLabel(snapshot.answer_keys, snapshot.qtype, snapshot.options ?? [])
}

export function reviewSheetStatus(item: ReviewPlayerItem): 'correct' | 'wrong' | 'skipped' {
  if (item.is_skipped) return 'skipped'
  return item.is_correct ? 'correct' : 'wrong'
}
