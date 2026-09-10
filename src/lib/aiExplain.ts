export interface ExplainContentInput {
  stem: string
  qtype: string
  options: unknown
  answer_keys: unknown
  explanation: string
  case_material?: string | null
  reference_answer?: string | null
  existing_tags?: string[]
}

export interface QuestionAiExplain {
  exam_points: string[]
  intent: string
  pitfalls: string[]
  commentary: string
  related_tags: string[]
}

export interface ExplainUserResult {
  is_correct: boolean
  is_skipped?: boolean
  selected_keys?: string[]
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item).trim()).filter(Boolean)
}

export function canonicalQuestionContent(input: ExplainContentInput): string {
  return JSON.stringify({
    stem: String(input.stem ?? ''),
    qtype: String(input.qtype ?? ''),
    options: input.options ?? [],
    answer_keys: input.answer_keys ?? [],
    explanation: String(input.explanation ?? ''),
    case_material: input.case_material ?? '',
    reference_answer: String(input.reference_answer ?? ''),
  })
}

export function buildExplainModelPayload(input: ExplainContentInput) {
  return {
    stem: String(input.stem ?? ''),
    qtype: String(input.qtype ?? ''),
    options: input.options ?? [],
    answer_keys: input.answer_keys ?? [],
    explanation: String(input.explanation ?? ''),
    case_material: input.case_material ?? '',
    reference_answer: String(input.reference_answer ?? ''),
    existing_tags: Array.isArray(input.existing_tags) ? input.existing_tags.map(String).filter(Boolean) : [],
  }
}

export function normalizeExplainOutput(raw: unknown): QuestionAiExplain | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const commentary = typeof obj.commentary === 'string' ? obj.commentary.trim() : ''
  const intent = typeof obj.intent === 'string' ? obj.intent.trim() : ''
  if (!commentary && !intent) return null
  return {
    exam_points: asStringArray(obj.exam_points).slice(0, 8),
    intent,
    pitfalls: asStringArray(obj.pitfalls).slice(0, 8),
    commentary,
    related_tags: asStringArray(obj.related_tags).slice(0, 8),
  }
}

export function explainCacheHit(
  existing: { status: string; content_hash: string } | null,
  hash: string,
  force: boolean,
): boolean {
  return !force && existing?.status === 'ready' && existing.content_hash === hash
}

export function userResultCaption(result: ExplainUserResult | null | undefined): string {
  if (!result) return ''
  if (result.is_skipped) return '本题你标记为暂不会，下面按考点说明。'
  if (result.is_correct) return '本题你答对了，下面按考点说明。'
  return '本题你答错了，下面按考点说明。'
}
