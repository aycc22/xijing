import type { SupabaseClient } from '@supabase/supabase-js'

export async function recordWrongQuestion(
  supabase: SupabaseClient,
  userId: string,
  questionId: string,
  selectedKeys: string[],
): Promise<void> {
  const { data: existing } = await supabase
    .from('wrong_question_items')
    .select('id, wrong_count')
    .eq('user_id', userId)
    .eq('question_id', questionId)
    .maybeSingle()

  const keys = selectedKeys.map((k) => k.toUpperCase())
  const now = new Date().toISOString()

  if (existing) {
    await supabase
      .from('wrong_question_items')
      .update({
        wrong_count: existing.wrong_count + 1,
        last_wrong_keys: keys,
        last_wrong_at: now,
      })
      .eq('id', existing.id)
    return
  }

  await supabase.from('wrong_question_items').insert({
    user_id: userId,
    question_id: questionId,
    wrong_count: 1,
    last_wrong_keys: keys,
    first_wrong_at: now,
    last_wrong_at: now,
  })
}
