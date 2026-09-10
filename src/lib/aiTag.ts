export const AI_TAG_BATCH_LIMIT = 50

export type AiDifficulty = 'easy' | 'medium' | 'hard'

export interface AnalyzeQuestionSuggestion {
  tags: string[]
  difficulty: AiDifficulty | null
  exam_point_note: string
}

export interface AiTagQuestionRef {
  id: string
  tags_edited_at?: string | null
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item).trim()).filter(Boolean)
}

function parseDifficulty(value: unknown): AiDifficulty | null {
  return value === 'easy' || value === 'medium' || value === 'hard' ? value : null
}

export function normalizeAnalyzeQuestionOutput(raw: unknown): AnalyzeQuestionSuggestion | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const tags = asStringArray(obj.tags).slice(0, 8)
  if (!tags.length) return null
  return {
    tags,
    difficulty: parseDifficulty(obj.difficulty),
    exam_point_note: typeof obj.exam_point_note === 'string' ? obj.exam_point_note.trim() : '',
  }
}

export function shouldSkipAiTagWrite(tagsEditedAt: string | null | undefined, force: boolean): boolean {
  return Boolean(tagsEditedAt) && !force
}

export function selectQuestionsForAiTag<T extends AiTagQuestionRef>(
  selected: T[],
  options: { force: boolean; limit?: number },
): { toAnalyze: T[]; skippedEdited: T[]; truncated: boolean } {
  const limit = options.limit ?? AI_TAG_BATCH_LIMIT
  const truncated = selected.length > limit
  const limited = selected.slice(0, limit)
  if (options.force) {
    return { toAnalyze: limited, skippedEdited: [], truncated }
  }
  const skippedEdited = limited.filter((question) => Boolean(question.tags_edited_at))
  const toAnalyze = limited.filter((question) => !question.tags_edited_at)
  return { toAnalyze, skippedEdited, truncated }
}

export function questionUpdateFromAnalyze(
  suggestion: AnalyzeQuestionSuggestion,
  editedAt: string,
  includeDifficulty: boolean,
): { tags: string[]; tags_edited_at: string; difficulty?: AiDifficulty } {
  const payload: { tags: string[]; tags_edited_at: string; difficulty?: AiDifficulty } = {
    tags: suggestion.tags,
    tags_edited_at: editedAt,
  }
  if (includeDifficulty && suggestion.difficulty) payload.difficulty = suggestion.difficulty
  return payload
}
