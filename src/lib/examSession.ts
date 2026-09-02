import { sameAnswerSet, type QuestionType } from './types'
import type { PaperItem } from './paperSnapshot'

export interface ExamAnswer {
  selected: string[]
  flagged: boolean
}

export type ExamAnswerMap = Record<string, ExamAnswer>

export type ExamSheetStatus = 'unanswered' | 'answered' | 'flagged'

export interface GradedExamItem {
  question_id: string
  score: number
  earned: number
  selected_keys: string[]
  is_correct: boolean
  flagged: boolean
  snapshot: PaperItem['snapshot']
}

export interface GradedExam {
  score: number
  correctCount: number
  totalCount: number
  items: GradedExamItem[]
}

export function createExamState(questionIds: string[]): ExamAnswerMap {
  const map: ExamAnswerMap = {}
  for (const id of questionIds) {
    map[id] = { selected: [], flagged: false }
  }
  return map
}

export function examSheetStatus(answer: ExamAnswer | undefined): ExamSheetStatus {
  if (!answer) return 'unanswered'
  if (answer.flagged && !answer.selected.length) return 'flagged'
  if (answer.selected.length) return answer.flagged ? 'flagged' : 'answered'
  return 'unanswered'
}

export function updateExamSelection(
  answers: ExamAnswerMap,
  questionId: string,
  selected: string[],
): ExamAnswerMap {
  const current = answers[questionId] ?? { selected: [], flagged: false }
  return {
    ...answers,
    [questionId]: { ...current, selected: [...selected] },
  }
}

export function toggleFlag(answers: ExamAnswerMap, questionId: string): ExamAnswerMap {
  const current = answers[questionId] ?? { selected: [], flagged: false }
  return {
    ...answers,
    [questionId]: { ...current, flagged: !current.flagged },
  }
}

export function countUnanswered(
  answers: ExamAnswerMap,
  questionIds: string[],
  qtypes?: Record<string, QuestionType>,
): number {
  return questionIds.filter((id) => {
    const selected = answers[id]?.selected ?? []
    if (qtypes?.[id] === 'short_answer') return !selected[0]?.trim()
    return !selected.length
  }).length
}

export function updateExamTextAnswer(
  answers: ExamAnswerMap,
  questionId: string,
  text: string,
): ExamAnswerMap {
  const current = answers[questionId] ?? { selected: [], flagged: false }
  const trimmed = text.trim()
  return {
    ...answers,
    [questionId]: { ...current, selected: trimmed ? [trimmed] : [] },
  }
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function gradeShortAnswer(selected: string[], reference: string): boolean {
  const user = normalizeText(selected[0] ?? '')
  const ref = normalizeText(reference)
  if (!user || !ref) return false
  return user === ref || ref.includes(user) || user.includes(ref)
}

export function toPublicPaperItems(items: PaperItem[]): PaperItem[] {
  return items.map((item) => ({
    question_id: item.question_id,
    score: item.score,
    snapshot: {
      ...item.snapshot,
      answer_keys: [],
      explanation: '',
    },
  }))
}

export function gradeExam(items: PaperItem[], answers: ExamAnswerMap): GradedExam {
  let score = 0
  let correctCount = 0
  const graded: GradedExamItem[] = items.map((item) => {
    const selected = answers[item.question_id]?.selected ?? []
    const normalized = selected.map((k) => k.toUpperCase())
    const keys = item.snapshot.answer_keys.map((k) => k.toUpperCase())
    let ok = false
    if (item.snapshot.qtype === 'short_answer') {
      ok = gradeShortAnswer(selected, item.snapshot.reference_answer ?? '')
    } else {
      ok = keys.length > 0 && sameAnswerSet(normalized, keys)
    }
    const earned = ok ? Number(item.score) : 0
    if (ok) {
      correctCount += 1
      score += earned
    }
    return {
      question_id: item.question_id,
      score: Number(item.score),
      earned,
      selected_keys: item.snapshot.qtype === 'short_answer' ? selected : normalized,
      is_correct: ok,
      flagged: Boolean(answers[item.question_id]?.flagged),
      snapshot: item.snapshot,
    }
  })
  return {
    score: Number(score.toFixed(2)),
    correctCount,
    totalCount: items.length,
    items: graded,
  }
}

export function splitPaperForStorage(items: PaperItem[]): {
  publicItems: PaperItem[]
  grading: Record<string, { answer_keys: string[]; explanation: string; reference_answer?: string }>
} {
  const grading: Record<string, { answer_keys: string[]; explanation: string; reference_answer?: string }> = {}
  const publicItems = items.map((item) => {
    grading[item.question_id] = {
      answer_keys: [...item.snapshot.answer_keys],
      explanation: item.snapshot.explanation,
      reference_answer: item.snapshot.reference_answer ?? '',
    }
    return {
      question_id: item.question_id,
      score: item.score,
      snapshot: {
        ...item.snapshot,
        answer_keys: [],
        explanation: '',
        reference_answer: '',
      },
    }
  })
  return { publicItems, grading }
}

export function mergeGradingIntoItems(
  publicItems: PaperItem[],
  grading: Record<string, { answer_keys: string[]; explanation: string; reference_answer?: string }>,
): PaperItem[] {
  return publicItems.map((item) => ({
    ...item,
    snapshot: {
      ...item.snapshot,
      answer_keys: grading[item.question_id]?.answer_keys ?? [],
      explanation: grading[item.question_id]?.explanation ?? '',
      reference_answer: grading[item.question_id]?.reference_answer ?? '',
    },
  }))
}

export function formatExamDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h} 小时 ${m} 分 ${s} 秒`
  if (m > 0) return `${m} 分 ${s} 秒`
  return `${s} 秒`
}

export interface TypePerformance {
  qtype: PaperItem['snapshot']['qtype']
  total: number
  correct: number
  rate: number
}

export function summarizeByType(items: GradedExamItem[]): TypePerformance[] {
  const order = ['single', 'multiple', 'judgement', 'short_answer'] as const
  const map = new Map<string, { total: number; correct: number }>()
  for (const item of items) {
    const key = item.snapshot.qtype
    const cur = map.get(key) ?? { total: 0, correct: 0 }
    cur.total += 1
    if (item.is_correct) cur.correct += 1
    map.set(key, cur)
  }
  return order
    .filter((t) => map.has(t))
    .map((qtype) => {
      const cur = map.get(qtype)!
      return {
        qtype,
        total: cur.total,
        correct: cur.correct,
        rate: cur.total ? Math.round((cur.correct / cur.total) * 100) : 0,
      }
    })
}
