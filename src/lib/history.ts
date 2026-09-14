import { computePracticeSummary } from './practiceResult'

export type SessionMode = 'practice' | 'exam'
export type HistoryKind = 'practice' | 'exam'
export type HistoryStatus = 'in_progress' | 'finished' | 'expired'

export interface HistorySession {
  id: string
  bank_id: string
  bank_title: string
  mode: SessionMode
  kind: HistoryKind
  paper_id?: string | null
  total_count: number
  correct_count: number
  answered_count?: number | null
  current_index: number
  started_at: string
  finished_at: string | null
  expired_at: string | null
}

export function sessionHistoryStatus(session: {
  finished_at: string | null
  expired_at: string | null
}): HistoryStatus {
  if (session.finished_at) return 'finished'
  if (session.expired_at) return 'expired'
  return 'in_progress'
}

export function partitionHistory(sessions: HistorySession[]) {
  const inProgress: HistorySession[] = []
  const finished: HistorySession[] = []
  const expired: HistorySession[] = []
  for (const session of sessions) {
    const status = sessionHistoryStatus(session)
    if (status === 'finished') finished.push(session)
    else if (status === 'expired') expired.push(session)
    else inProgress.push(session)
  }
  return { inProgress, finished, expired }
}

export function modeLabel(mode: SessionMode): string {
  return mode === 'exam' ? '答题' : '刷题'
}

export function historyStatusLabel(status: HistoryStatus): string {
  switch (status) {
    case 'in_progress':
      return '未完成'
    case 'finished':
      return '已完成'
    case 'expired':
      return '已过期'
  }
}

export function historyResultText(session: HistorySession): string {
  const status = sessionHistoryStatus(session)
  if (status === 'in_progress') {
    return `进度 ${Math.min(session.current_index + 1, session.total_count)} / ${session.total_count}`
  }
  if (status === 'expired') return '已过期'
  const summary = computePracticeSummary(session)
  const headline = `${summary.correct}/${summary.answered} · ${summary.rate}%`
  if (summary.unanswered > 0) return `${headline} · 未作答 ${summary.unanswered}`
  return headline
}

export function countAnswersBySessionId(rows: { session_id: string }[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const row of rows) {
    counts.set(row.session_id, (counts.get(row.session_id) ?? 0) + 1)
  }
  return counts
}

export function applyPracticeAnsweredCounts(
  sessions: HistorySession[],
  counts: Map<string, number>,
): HistorySession[] {
  return sessions.map((session) => {
    if (session.kind !== 'practice') return session
    return { ...session, answered_count: counts.get(session.id) ?? 0 }
  })
}

export function practiceResultPath(sessionId: string): string {
  return `/result/${sessionId}`
}

export function practiceReviewPath(sessionId: string): string {
  return `${practiceResultPath(sessionId)}/review`
}

export function examResultPath(sessionId: string): string {
  return `/exam-result/${sessionId}`
}

export function examReviewPath(sessionId: string): string {
  return `${examResultPath(sessionId)}/review`
}

export function detailPathForSession(session: HistorySession): string {
  const status = sessionHistoryStatus(session)
  const isExam = session.kind === 'exam' || session.mode === 'exam'
  if (isExam) {
    if (status === 'in_progress' && session.paper_id) return `/exam/${session.paper_id}`
    return examResultPath(session.id)
  }
  if (status === 'in_progress') return `/quiz/${session.bank_id}`
  return practiceResultPath(session.id)
}

export function mergeHistorySessions(rows: HistorySession[]): HistorySession[] {
  return [...rows].sort((a, b) => (a.started_at < b.started_at ? 1 : -1))
}

export function computeHistoryStats(sessions: HistorySession[]) {
  const finished = sessions.filter((s) => sessionHistoryStatus(s) === 'finished')
  const total = finished.reduce((sum, s) => sum + s.total_count, 0)
  const answered = finished.reduce((sum, s) => sum + (s.answered_count ?? s.total_count), 0)
  const correct = finished.reduce((sum, s) => sum + s.correct_count, 0)
  const rate = answered ? Math.round((correct / answered) * 100) : 0
  return {
    sessionCount: finished.length,
    total,
    answered,
    correct,
    rate,
  }
}
