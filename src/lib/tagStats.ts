export const UNTAGGED_TAG = '__untagged__'
export const STEM_TRUNCATE = 200

export interface TagStat {
  tag: string
  total: number
  correct: number
  wrong: number
  rate: number
}

export interface AnswerForTagStats {
  questionId: string
  isCorrect: boolean
  isSkipped?: boolean
}

export interface SessionWeakPoint {
  tag: string
  reason: string
}

export interface SessionAnswerRow extends AnswerForTagStats {
  stem?: string
  qtype?: string
}

export interface AnalyzeSessionInput {
  tag_stats: TagStat[]
  wrong_items: { stem: string; tags: string[]; qtype: string }[]
  correct_count: number
  total_count: number
}

type TagsByQuestionId = Map<string, string[]> | Record<string, string[]>

function tagsForQuestion(questionId: string, tagsByQuestionId: TagsByQuestionId): string[] {
  const raw = tagsByQuestionId instanceof Map ? tagsByQuestionId.get(questionId) : tagsByQuestionId[questionId]
  if (!Array.isArray(raw) || raw.length === 0) return [UNTAGGED_TAG]
  const cleaned = raw.map((tag) => tag.trim()).filter(Boolean)
  return cleaned.length ? cleaned : [UNTAGGED_TAG]
}

function roundRate(correct: number, total: number): number {
  if (!total) return 0
  return Math.round((correct / total) * 100) / 100
}

export function computeTagStats(
  answers: AnswerForTagStats[],
  tagsByQuestionId: TagsByQuestionId,
): TagStat[] {
  const buckets = new Map<string, { total: number; correct: number; wrong: number }>()

  for (const answer of answers) {
    const isWrong = answer.isSkipped || !answer.isCorrect
    const isCorrect = !answer.isSkipped && answer.isCorrect
    for (const tag of tagsForQuestion(answer.questionId, tagsByQuestionId)) {
      const current = buckets.get(tag) ?? { total: 0, correct: 0, wrong: 0 }
      current.total += 1
      if (isCorrect) current.correct += 1
      if (isWrong) current.wrong += 1
      buckets.set(tag, current)
    }
  }

  return [...buckets.entries()].map(([tag, counts]) => ({
    tag,
    total: counts.total,
    correct: counts.correct,
    wrong: counts.wrong,
    rate: roundRate(counts.correct, counts.total),
  }))
}

export function filterWeakPointsToKnownTags(
  weakPoints: SessionWeakPoint[],
  tagStats: TagStat[],
): SessionWeakPoint[] {
  const known = new Set(tagStats.map((stat) => stat.tag))
  return weakPoints.filter((point) => known.has(point.tag))
}

export function truncateStem(stem: string, max = STEM_TRUNCATE): string {
  const trimmed = stem.trim()
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max)
}

export function displayTagLabel(tag: string): string {
  return tag === UNTAGGED_TAG ? '未标注' : tag
}

export function shapeAnalyzeSessionInput(
  answers: SessionAnswerRow[],
  tagsByQuestionId: TagsByQuestionId,
): AnalyzeSessionInput {
  const tag_stats = computeTagStats(answers, tagsByQuestionId)
  const wrong_items = answers
    .filter((answer) => answer.isSkipped || !answer.isCorrect)
    .map((answer) => ({
      stem: truncateStem(answer.stem ?? ''),
      tags: tagsForQuestion(answer.questionId, tagsByQuestionId),
      qtype: answer.qtype ?? '',
    }))
  const correct_count = answers.filter((answer) => !answer.isSkipped && answer.isCorrect).length
  return {
    tag_stats,
    wrong_items,
    correct_count,
    total_count: answers.length,
  }
}
