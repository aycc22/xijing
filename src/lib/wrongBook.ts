import type { SupabaseClient } from '@supabase/supabase-js'

export interface WrongBookEntry {
  id: string
  question_id: string
  wrong_count: number
  last_wrong_keys: string[]
  first_wrong_at: string
  last_wrong_at: string
  stem: string
  qtype: 'single' | 'multiple' | 'judgement' | 'case_analysis'
  bank_id: string
  bank_title: string
}

export function filterEntriesByBank(entries: WrongBookEntry[], bankId: string): WrongBookEntry[] {
  if (bankId === 'all') return entries
  return entries.filter((entry) => entry.bank_id === bankId)
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

  if (existing) {
    const { error } = await supabase
      .from('wrong_question_items')
      .update({
        wrong_count: existing.wrong_count + 1,
        last_wrong_keys: keys,
        last_wrong_at: now,
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
  })
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
      'id, question_id, wrong_count, last_wrong_keys, first_wrong_at, last_wrong_at, questions!inner(stem, qtype, bank_id, question_banks!inner(title))',
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
      stem: question.stem,
      qtype: question.qtype,
      bank_id: question.bank_id,
      bank_title: bank?.title ?? '未命名题库',
    }
  })
}
