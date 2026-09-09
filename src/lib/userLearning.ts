import type { SupabaseClient } from '@supabase/supabase-js'

export async function loadFavoriteIds(
  supabase: SupabaseClient,
  userId: string,
  questionIds: string[],
): Promise<Set<string>> {
  if (!questionIds.length) return new Set()
  const { data } = await supabase
    .from('question_favorites')
    .select('question_id')
    .eq('user_id', userId)
    .in('question_id', questionIds)
  return new Set((data ?? []).map((row) => row.question_id))
}

export async function toggleFavorite(
  supabase: SupabaseClient,
  userId: string,
  questionId: string,
  favorited: boolean,
): Promise<boolean> {
  if (favorited) {
    await supabase.from('question_favorites').delete().eq('user_id', userId).eq('question_id', questionId)
    return false
  }
  await supabase.from('question_favorites').insert({ user_id: userId, question_id: questionId })
  return true
}

export async function loadNotes(
  supabase: SupabaseClient,
  userId: string,
  questionIds: string[],
): Promise<Map<string, string>> {
  if (!questionIds.length) return new Map()
  const { data } = await supabase
    .from('question_notes')
    .select('question_id, content')
    .eq('user_id', userId)
    .in('question_id', questionIds)
  return new Map((data ?? []).map((row) => [row.question_id, row.content]))
}

export async function saveNote(
  supabase: SupabaseClient,
  userId: string,
  questionId: string,
  content: string,
): Promise<void> {
  const trimmed = content.trim()
  if (!trimmed) {
    await supabase.from('question_notes').delete().eq('user_id', userId).eq('question_id', questionId)
    return
  }
  await supabase.from('question_notes').upsert(
    {
      user_id: userId,
      question_id: questionId,
      content: trimmed,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,question_id' },
  )
}

export interface LearningListItem {
  question_id: string
  stem: string
  bank_id: string
  bank_title: string
  extra?: string
}

function mapQuestionJoin(raw: unknown): { stem: string; bank_id: string; bank_title: string } {
  const question = (Array.isArray(raw) ? raw[0] : raw) as {
    stem?: string
    bank_id?: string
    question_banks?: { title: string } | { title: string }[]
  } | null
  const bank = Array.isArray(question?.question_banks) ? question?.question_banks[0] : question?.question_banks
  return {
    stem: question?.stem ?? '（题目已删除）',
    bank_id: question?.bank_id ?? '',
    bank_title: bank?.title ?? '未命名题库',
  }
}

export async function loadFavoriteList(
  supabase: SupabaseClient,
  userId: string,
): Promise<LearningListItem[]> {
  const { data, error } = await supabase
    .from('question_favorites')
    .select('question_id, created_at, questions!inner(stem, bank_id, question_banks!inner(title))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => {
    const q = mapQuestionJoin(row.questions)
    return { question_id: row.question_id, ...q }
  })
}

export async function loadNoteList(
  supabase: SupabaseClient,
  userId: string,
): Promise<LearningListItem[]> {
  const { data, error } = await supabase
    .from('question_notes')
    .select('question_id, content, updated_at, questions!inner(stem, bank_id, question_banks!inner(title))')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => {
    const q = mapQuestionJoin(row.questions)
    return { question_id: row.question_id, extra: row.content, ...q }
  })
}
