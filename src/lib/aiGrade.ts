export type GradingStatus = 'scored' | 'pending' | 'done' | 'failed'

export interface AiRubricHit {
  point: string
  hit: boolean
}

export interface AiFeedback {
  text: string
  rubric_hits: AiRubricHit[]
}

export interface AiGradeParsed {
  score: number
  feedback: string
  rubric_hits: AiRubricHit[]
}

export interface GradedItemAiFields {
  question_id: string
  score: number
  earned: number
  is_correct?: boolean
  grading_status?: GradingStatus
  ai_score?: number
  ai_feedback?: AiFeedback
}

export function gradingStatusOnSubmit(qtype: string): GradingStatus {
  return qtype === 'short_answer' ? 'pending' : 'scored'
}

export function clampAiScore(score: number, maxScore: number): number {
  if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore < 0) return 0
  const capped = Math.min(Math.max(score, 0), maxScore)
  if (Number.isInteger(maxScore)) return Math.round(capped)
  return Math.round(capped * 2) / 2
}

export function normalizeGradeOutput(raw: unknown, maxScore: number): AiGradeParsed | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const score = typeof obj.score === 'number' ? obj.score : Number(obj.score)
  if (!Number.isFinite(score)) return null
  const hitsRaw = Array.isArray(obj.rubric_hits) ? obj.rubric_hits : []
  const rubric_hits = hitsRaw.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const hit = item as Record<string, unknown>
    const point = typeof hit.point === 'string' ? hit.point.trim() : ''
    if (!point) return []
    return [{ point, hit: hit.hit === true }]
  })
  return {
    score: clampAiScore(score, maxScore),
    feedback: typeof obj.feedback === 'string' ? obj.feedback.trim() : '',
    rubric_hits,
  }
}

export function shouldReuseGrade(status: string | undefined, force: boolean): boolean {
  return status === 'done' && !force
}

export function mergeAiGradeIntoItems<T extends GradedItemAiFields>(
  items: T[],
  questionId: string,
  patch: {
    grading_status: GradingStatus
    ai_score?: number
    ai_feedback?: AiFeedback
  },
): T[] {
  return items.map((item) => {
    if (item.question_id !== questionId) return item
    return {
      ...item,
      earned: item.earned,
      score: item.score,
      is_correct: item.is_correct,
      grading_status: patch.grading_status,
      ...(patch.ai_score !== undefined ? { ai_score: patch.ai_score } : {}),
      ...(patch.ai_feedback ? { ai_feedback: patch.ai_feedback } : {}),
    }
  })
}

export function needsAiGrade(item: {
  qtype?: string
  grading_status?: GradingStatus
}): boolean {
  if (item.qtype !== 'short_answer') return false
  return item.grading_status !== 'done' && item.grading_status !== 'failed'
}
