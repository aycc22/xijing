import type { SupabaseClient } from '@supabase/supabase-js'

export type MasteryStatus = 'pending' | 'reviewing' | 'mastered'

export interface WrongBookEntry {
  id: string
  question_id: string
  wrong_count: number
  last_wrong_keys: string[]
  first_wrong_at: string
  last_wrong_at: string
  consecutive_correct: number
  mastery: MasteryStatus
  stem: string
  qtype: 'single' | 'multiple' | 'judgement' | 'case_analysis'
  bank_id: string
  bank_title: string
}

export function normalizeMastery(raw: string | null | undefined): MasteryStatus {
  if (raw === 'reviewing' || raw === 'mastered') return raw
  return 'pending'
}

export function masteryLabel(status: MasteryStatus): string {
  switch (status) {
    case 'pending':
      return '待复习'
    case 'reviewing':
      return '复习中'
    case 'mastered':
      return '已掌握'
  }
}

export function nextMasteryState(
  current: { consecutive_correct: number; mastery?: MasteryStatus },
  isCorrect: boolean,
): { consecutive_correct: number; mastery: MasteryStatus } {
  if (!isCorrect) return { consecutive_correct: 0, mastery: 'pending' }
  const consecutive = (current.consecutive_correct || 0) + 1
  return {
    consecutive_correct: consecutive,
    mastery: consecutive >= 2 ? 'mastered' : 'reviewing',
  }
}

export function filterEntriesByBank(entries: WrongBookEntry[], bankId: string): WrongBookEntry[] {
  if (bankId === 'all') return entries
  return entries.filter((entry) => entry.bank_id === bankId)
}

export function filterEntriesByMastery(
  entries: WrongBookEntry[],
  mastery: MasteryStatus | 'all',
): WrongBookEntry[] {
  if (mastery === 'all') return entries
  return entries.filter((entry) => entry.mastery === mastery)
}

/** 在题目列表中定位指定题目的起始下标；找不到则从 0 开始 */
export function resolveQuestionStartIndex(questionIds: string[], questionId: string | null | undefined): number {
  if (!questionId) return 0
  const index = questionIds.indexOf(questionId)
  return index >= 0 ? index : 0
}

export function bankFilterOptions(entries: WrongBookEntry[]): { id: string; title: string; count: number }[] {
  const map = new Map<string, { title: string; count: number }>()
  for (const entry of entries) {
    const current = map.get(entry.bank_id)
    if (current) current.count += 1
    else map.set(entry.bank_id, { title: entry.bank_title, count: 1 })
  }
  return [...map.entries()].map(([id, value]) => ({ id, title: value.title, count: value.count }))
}

export async function recordWrongQuestion(
  supabase: SupabaseClient,
  userId: string,
  questionId: string,
  selectedKeys: string[],
): Promise<void> {
  const { data: existing, error: lookupError } = await supabase
    .from('wrong_question_items')
    .select('id, wrong_count')
    .eq('user_id', userId)
    .eq('question_id', questionId)
    .maybeSingle()
  if (lookupError) throw lookupError

  const keys = selectedKeys.map((k) => k.toUpperCase())
  const now = new Date().toISOString()
  const reset = nextMasteryState({ consecutive_correct: 0 }, false)

  if (existing) {
    const { error } = await supabase
      .from('wrong_question_items')
      .update({
        wrong_count: existing.wrong_count + 1,
        last_wrong_keys: keys,
        last_wrong_at: now,
        consecutive_correct: reset.consecutive_correct,
        mastery: reset.mastery,
      })
      .eq('id', existing.id)
    if (error) throw error
    return
  }

  const { error } = await supabase.from('wrong_question_items').insert({
    user_id: userId,
    question_id: questionId,
    wrong_count: 1,
    last_wrong_keys: keys,
    first_wrong_at: now,
    last_wrong_at: now,
    consecutive_correct: reset.consecutive_correct,
    mastery: reset.mastery,
  })
  if (error) throw error
}

export async function recordIndependentCorrect(
  supabase: SupabaseClient,
  userId: string,
  questionId: string,
): Promise<void> {
  const { data: existing, error: lookupError } = await supabase
    .from('wrong_question_items')
    .select('id, consecutive_correct, mastery')
    .eq('user_id', userId)
    .eq('question_id', questionId)
    .maybeSingle()
  if (lookupError) throw lookupError
  if (!existing) return

  const next = nextMasteryState(
    {
      consecutive_correct: existing.consecutive_correct ?? 0,
      mastery: normalizeMastery(existing.mastery),
    },
    true,
  )
  const { error } = await supabase
    .from('wrong_question_items')
    .update({
      consecutive_correct: next.consecutive_correct,
      mastery: next.mastery,
    })
    .eq('id', existing.id)
  if (error) throw error
}

export async function loadWrongQuestionIds(
  supabase: SupabaseClient,
  userId: string,
  bankId: string,
): Promise<Set<string>> {
  const { data } = await supabase
    .from('wrong_question_items')
    .select('question_id, questions!inner(bank_id)')
    .eq('user_id', userId)
    .eq('questions.bank_id', bankId)
  return new Set((data ?? []).map((row) => row.question_id))
}

export async function loadWrongBookEntries(
  supabase: SupabaseClient,
  userId: string,
): Promise<WrongBookEntry[]> {
  const { data, error } = await supabase
    .from('wrong_question_items')
    .select(
      'id, question_id, wrong_count, last_wrong_keys, first_wrong_at, last_wrong_at, consecutive_correct, mastery, questions!inner(stem, qtype, bank_id, question_banks!inner(title))',
    )
    .eq('user_id', userId)
    .order('last_wrong_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => {
    const raw = row.questions as unknown
    const question = (Array.isArray(raw) ? raw[0] : raw) as {
      stem: string
      qtype: WrongBookEntry['qtype']
      bank_id: string
      question_banks: { title: string } | { title: string }[]
    }
    const bank = Array.isArray(question.question_banks)
      ? question.question_banks[0]
      : question.question_banks
    return {
      id: row.id,
      question_id: row.question_id,
      wrong_count: row.wrong_count,
      last_wrong_keys: row.last_wrong_keys ?? [],
      first_wrong_at: row.first_wrong_at,
      last_wrong_at: row.last_wrong_at,
      consecutive_correct: row.consecutive_correct ?? 0,
      mastery: normalizeMastery(row.mastery),
      stem: question.stem,
      qtype: question.qtype,
      bank_id: question.bank_id,
      bank_title: bank?.title ?? '未命名题库',
    }
  })
}
