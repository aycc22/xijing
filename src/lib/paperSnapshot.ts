import { mulberry32 } from './paperCompose'
import type { QuestionOption, QuestionType } from './types'

export interface SnapshotSourceQuestion {
  id: string
  qtype: QuestionType
  stem: string
  options: QuestionOption[]
  answer_keys: string[]
  explanation: string
  case_id: string | null
  case_material: string | null
  attachments?: unknown[] | null
  reference_answer?: string
}

export interface PaperItemSnapshot {
  stem: string
  qtype: QuestionType
  options: QuestionOption[]
  answer_keys: string[]
  explanation: string
  case_id: string | null
  case_material: string | null
  attachments?: unknown[] | null
  reference_answer?: string
}

export interface PaperItem {
  question_id: string
  score: number
  snapshot: PaperItemSnapshot
}

function shuffleInPlace<T>(items: T[], rand: () => number): T[] {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

export function shuffleOptions(
  options: QuestionOption[],
  rand: () => number,
  qtype?: QuestionType,
): QuestionOption[] {
  if (qtype === 'judgement' || options.length <= 1) return options.map((o) => ({ ...o }))
  return shuffleInPlace(options, rand).map((o) => ({ ...o }))
}

export function buildPaperItems(input: {
  questionIds: string[]
  scores: number[]
  seed: number
  questionsById: Map<string, SnapshotSourceQuestion>
}): PaperItem[] {
  const rand = mulberry32(input.seed ^ 0x9e3779b9)
  const items: PaperItem[] = []
  for (let i = 0; i < input.questionIds.length; i++) {
    const id = input.questionIds[i]
    const q = input.questionsById.get(id)
    if (!q) continue
    items.push({
      question_id: id,
      score: input.scores[i] ?? 0,
      snapshot: {
        stem: q.stem,
        qtype: q.qtype,
        options: shuffleOptions(q.options, rand, q.qtype),
        answer_keys: [...q.answer_keys],
        explanation: q.explanation,
        case_id: q.case_id,
        case_material: q.case_material,
        attachments: q.attachments ?? null,
        reference_answer: q.reference_answer ?? '',
      },
    })
  }
  return items
}

export function parsePaperItems(raw: unknown): PaperItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((row) => {
      if (!row || typeof row !== 'object') return null
      const item = row as PaperItem
      if (!item.question_id || !item.snapshot?.stem) return null
      return {
        question_id: item.question_id,
        score: Number(item.score) || 0,
        snapshot: {
          stem: item.snapshot.stem,
          qtype: item.snapshot.qtype,
          options: Array.isArray(item.snapshot.options) ? item.snapshot.options : [],
          answer_keys: Array.isArray(item.snapshot.answer_keys) ? item.snapshot.answer_keys : [],
          explanation: item.snapshot.explanation ?? '',
          case_id: item.snapshot.case_id ?? null,
          case_material: item.snapshot.case_material ?? null,
          attachments: item.snapshot.attachments ?? null,
          reference_answer: item.snapshot.reference_answer ?? '',
        },
      }
    })
    .filter(Boolean) as PaperItem[]
}

export function paperItemsAsCaseRows(items: PaperItem[]) {
  return items.map((item) => ({
    case_id: item.snapshot.case_id,
    case_material: item.snapshot.case_material,
    attachments: item.snapshot.attachments ?? null,
    stem: item.snapshot.stem,
  }))
}
