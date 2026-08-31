import type { Question } from './types'

export interface QuestionSnapshot {
  stem: string
  qtype: Question['qtype']
  options: Question['options']
  answer_keys: string[]
  explanation: string
  case_material: string | null
}

export function buildQuestionSnapshot(question: Question): QuestionSnapshot {
  return {
    stem: question.stem,
    qtype: question.qtype,
    options: question.options,
    answer_keys: [...question.answer_keys],
    explanation: question.explanation,
    case_material: question.case_material,
  }
}

export function parseQuestionSnapshot(raw: unknown): QuestionSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as QuestionSnapshot
  if (!s.stem || !s.qtype) return null
  return {
    stem: s.stem,
    qtype: s.qtype,
    options: Array.isArray(s.options) ? s.options : [],
    answer_keys: Array.isArray(s.answer_keys) ? s.answer_keys : [],
    explanation: s.explanation ?? '',
    case_material: s.case_material ?? null,
  }
}
