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
