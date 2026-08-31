export type QuestionSheetStatus = 'unanswered' | 'answered' | 'skipped'

export interface QuestionAttempt {
  status: 'unanswered' | 'answered' | 'skipped'
  selected: string[]
  revealed: boolean
  isCorrect: boolean | null
}

export function createPracticeState(count: number): QuestionAttempt[] {
  return Array.from({ length: count }, () => ({
    status: 'unanswered',
    selected: [],
    revealed: false,
    isCorrect: null,
  }))
}

export function sheetStatus(attempt: QuestionAttempt | undefined): QuestionSheetStatus {
  if (!attempt || attempt.status === 'unanswered') return 'unanswered'
  return attempt.status
}

export function canSubmitAnswer(attempt: QuestionAttempt | undefined): boolean {
  if (!attempt || attempt.revealed) return false
  return attempt.selected.length > 0
}

export function markAnswered(attempt: QuestionAttempt, isCorrect: boolean): QuestionAttempt {
  return {
    ...attempt,
    status: 'answered',
    revealed: true,
    isCorrect,
  }
}

export function markSkipped(attempt: QuestionAttempt): QuestionAttempt {
  return {
    ...attempt,
    status: 'skipped',
    selected: [],
    revealed: true,
    isCorrect: false,
  }
}

export function canGoPrev(index: number): boolean {
  return index > 0
}

export function canGoNext(index: number, total: number, attempt: QuestionAttempt): boolean {
  return attempt.revealed && index < total - 1
}

export function syncAttemptSelection(attempt: QuestionAttempt, selected: string[]): QuestionAttempt {
  if (attempt.revealed) return attempt
  return { ...attempt, selected: [...selected] }
}
