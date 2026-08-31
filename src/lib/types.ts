export type AppRole = 'learner' | 'uploader' | 'admin'
export type QuestionType = 'single' | 'multiple' | 'judgement' | 'case_analysis'

export interface Profile {
  id: string
  display_name: string | null
  role: AppRole
  created_at: string
}

export interface QuestionOption {
  key: string
  text: string
}

export interface QuestionBank {
  id: string
  title: string
  description: string
  owner_id: string
  is_published: boolean
  question_count: number
  created_at: string
  updated_at: string
}

export interface Question {
  id: string
  bank_id: string
  qtype: QuestionType
  stem: string
  options: QuestionOption[]
  answer_keys: string[]
  explanation: string
  case_id: string | null
  case_material: string | null
  sort_order: number
}

export interface AttemptSession {
  id: string
  user_id: string
  bank_id: string
  total_count: number
  correct_count: number
  started_at: string
  finished_at: string | null
}

export function canUpload(role: AppRole | null | undefined): boolean {
  return role === 'uploader' || role === 'admin'
}

export function isAdmin(role: AppRole | null | undefined): boolean {
  return role === 'admin'
}

export function sameAnswerSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sa = [...a].map((x) => x.toUpperCase()).sort()
  const sb = [...b].map((x) => x.toUpperCase()).sort()
  return sa.every((v, i) => v === sb[i])
}
