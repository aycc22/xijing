import { markAnswered, markSkipped, type QuestionAttempt } from './practiceSession'

export const PRACTICE_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

export interface StoredAnswer {
  question_id: string
  selected_keys: string[]
  is_correct: boolean
  is_skipped: boolean
}

export function isSessionExpired(startedAt: string, now = Date.now()): boolean {
  return now - new Date(startedAt).getTime() > PRACTICE_SESSION_TTL_MS
}

export function clampResumeIndex(savedIndex: number, total: number): number {
  if (total <= 0) return 0
  return Math.min(Math.max(0, savedIndex), total - 1)
}

export function rebuildAttemptsFromAnswers(
  questionIds: string[],
  answers: StoredAnswer[],
): { attempts: QuestionAttempt[]; correctCount: number } {
  const byQuestion = new Map(answers.map((a) => [a.question_id, a]))
  let correctCount = 0
  const attempts = questionIds.map((questionId) => {
    const stored = byQuestion.get(questionId)
    if (!stored) {
      return { status: 'unanswered' as const, selected: [], revealed: false, isCorrect: null }
    }
    if (stored.is_skipped) return markSkipped({ status: 'unanswered', selected: [], revealed: false, isCorrect: null })
    if (stored.is_correct) correctCount += 1
    return markAnswered(
      { status: 'unanswered', selected: [...stored.selected_keys], revealed: false, isCorrect: null },
      stored.is_correct,
    )
  })
  return { attempts, correctCount }
}

export function applyDraftSelection(
  attempts: QuestionAttempt[],
  questionIndex: number,
  draftKeys: string[] | null | undefined,
): QuestionAttempt[] {
  if (!draftKeys?.length || questionIndex < 0 || questionIndex >= attempts.length) return attempts
  const attempt = attempts[questionIndex]
  if (attempt.revealed) return attempts
  const next = [...attempts]
  next[questionIndex] = { ...attempt, selected: [...draftKeys] }
  return next
}

export function isResumableSession(session: {
  finished_at: string | null
  expired_at?: string | null
  started_at: string
}): boolean {
  if (session.finished_at || session.expired_at) return false
  return !isSessionExpired(session.started_at)
}
