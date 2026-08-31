import { onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../lib/supabase'
import {
  applyDraftSelection,
  clampResumeIndex,
  isSessionExpired,
  rebuildAttemptsFromAnswers,
  isResumableSession,
} from '../lib/practiceResume'
import type { QuestionAttempt } from '../lib/practiceSession'
import type { Question } from '../lib/types'

export async function expireStaleSessions(userId: string): Promise<void> {
  const { data } = await supabase
    .from('attempt_sessions')
    .select('id, started_at')
    .eq('user_id', userId)
    .is('finished_at', null)
    .is('expired_at', null)

  const stale = (data ?? []).filter((s) => isSessionExpired(s.started_at))
  if (!stale.length) return
  const now = new Date().toISOString()
  await Promise.all(
    stale.map((s) => supabase.from('attempt_sessions').update({ expired_at: now }).eq('id', s.id)),
  )
}

export async function findResumableSession(userId: string, bankId: string) {
  const { data } = await supabase
    .from('attempt_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('bank_id', bankId)
    .is('finished_at', null)
    .is('expired_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data || !isResumableSession(data)) return null
  return data
}

export async function loadSessionProgress(
  sessionId: string,
  questions: Question[],
): Promise<{ attempts: QuestionAttempt[]; correctCount: number; index: number }> {
  const [{ data: session }, { data: answers }] = await Promise.all([
    supabase.from('attempt_sessions').select('*').eq('id', sessionId).single(),
    supabase.from('attempt_answers').select('question_id, selected_keys, is_correct, is_skipped').eq('session_id', sessionId),
  ])
  if (!session) throw new Error('会话不存在')

  const questionIds = questions.map((q) => q.id)
  const rebuilt = rebuildAttemptsFromAnswers(questionIds, (answers ?? []) as Parameters<typeof rebuildAttemptsFromAnswers>[1])
  let attempts = rebuilt.attempts
  const draftIdx = questions.findIndex((q) => q.id === session.draft_question_id)
  attempts = applyDraftSelection(attempts, draftIdx, session.draft_selected_keys)
  const index = clampResumeIndex(session.current_index ?? 0, questions.length)
  return { attempts, correctCount: rebuilt.correctCount, index }
}

export async function saveSessionProgress(input: {
  sessionId: string
  index: number
  correctCount: number
  totalCount: number
  draftQuestionId: string | null
  draftSelectedKeys: string[]
  revealed: boolean
}): Promise<void> {
  await supabase
    .from('attempt_sessions')
    .update({
      current_index: input.index,
      correct_count: input.correctCount,
      total_count: input.totalCount,
      draft_question_id: input.draftQuestionId,
      draft_selected_keys: input.revealed ? [] : input.draftSelectedKeys.map((k) => k.toUpperCase()),
    })
    .eq('id', input.sessionId)
}

export function usePracticeAutosave(save: () => Promise<void>) {
  onBeforeUnmount(() => {
    void save()
  })
}

export function shouldForceNewSession(route: ReturnType<typeof useRoute>): boolean {
  return route.query.new === '1' || route.query.new === 'true'
}
