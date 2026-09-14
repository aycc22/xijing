import type { SupabaseClient } from '@supabase/supabase-js'
import {
  applyPracticeAnsweredCounts,
  countAnswersBySessionId,
  type HistorySession,
} from './history'

export async function hydratePracticeAnsweredCounts(
  supabase: SupabaseClient,
  sessions: HistorySession[],
): Promise<HistorySession[]> {
  const practiceIds = sessions.filter((session) => session.kind === 'practice').map((session) => session.id)
  if (!practiceIds.length) return sessions
  const { data, error } = await supabase
    .from('attempt_answers')
    .select('session_id')
    .in('session_id', practiceIds)
  if (error) throw error
  const counts = countAnswersBySessionId((data ?? []) as { session_id: string }[])
  for (const id of practiceIds) {
    if (!counts.has(id)) counts.set(id, 0)
  }
  return applyPracticeAnsweredCounts(sessions, counts)
}
