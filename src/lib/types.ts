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
  external_id: string | null
  qtype: QuestionType
  stem: string
  options: QuestionOption[]
  answer_keys: string[]
  explanation: string
  case_id: string | null
  case_material: string | null
  is_active: boolean
  sort_order: number
}

export type SessionMode = 'practice' | 'exam'

export interface AttemptSession {
  id: string
  user_id: string
  bank_id: string
  mode: SessionMode
  total_count: number
  correct_count: number
  current_index: number
  started_at: string
  finished_at: string | null
  expired_at: string | null
  draft_question_id: string | null
  draft_selected_keys: string[]
}

export function isSessionInProgress(session: AttemptSession): boolean {
  return !session.finished_at && !session.expired_at
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
