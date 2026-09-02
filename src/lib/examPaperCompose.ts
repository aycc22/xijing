import { buildPaperItems, type SnapshotSourceQuestion } from './paperSnapshot'
import type { ExamPaperBundle } from './examPaperImport'
import type { Question } from './types'

export interface FixedPaperSection {
  sectionId: string | null
  label: string
}

export interface FixedPaperPlan {
  sectionId: string | null
  label: string
  questionIds: string[]
  scores: number[]
  totalScore: number
  counts: Record<string, number>
  sectionLabels: Record<string, string>
}

export function listFixedPaperSections(
  bundle: ExamPaperBundle | null | undefined,
): FixedPaperSection[] {
  if (!bundle?.papers?.length) {
    return [{ sectionId: null, label: '全部题目' }]
  }
  const sections: FixedPaperSection[] = bundle.papers.map((p) => ({
    sectionId: p.id,
    label: p.title,
  }))
  sections.push({ sectionId: null, label: '全真模考（上午+下午）' })
  return sections
}

export function buildFixedPaperPlan(
  questions: Pick<
    Question,
    'id' | 'qtype' | 'sort_order' | 'score' | 'section' | 'is_active'
  >[],
  sectionId: string | null,
  sectionLabels: Record<string, string>,
): FixedPaperPlan {
  const active = questions
    .filter((q) => q.is_active)
    .filter((q) => (sectionId ? q.section === sectionId : true))
    .sort((a, b) => a.sort_order - b.sort_order)

  const questionIds = active.map((q) => q.id)
  const scores = active.map((q) => Number(q.score ?? 1))
  const totalScore = Number(scores.reduce((sum, s) => sum + s, 0).toFixed(2))
  const counts: Record<string, number> = {}
  for (const q of active) {
    if (q.qtype === 'short_answer') counts.short_answer = (counts.short_answer ?? 0) + 1
    else if (q.qtype === 'single' || q.qtype === 'multiple' || q.qtype === 'judgement') {
      counts[q.qtype] = (counts[q.qtype] ?? 0) + 1
    }
  }

  const label =
    sectionId && sectionLabels[sectionId]
      ? sectionLabels[sectionId]
      : sectionId
        ? sectionId
        : '全真模考'

  return {
    sectionId,
    label,
    questionIds,
    scores,
    totalScore,
    counts,
    sectionLabels,
  }
}

export function buildFixedPaperItems(input: {
  questionIds: string[]
  scores: number[]
  seed: number
  questionsById: Map<string, SnapshotSourceQuestion>
}) {
  return buildPaperItems(input)
}

export function sectionLabelsFromBundle(bundle: ExamPaperBundle | null | undefined) {
  const labels: Record<string, string> = {}
  for (const paper of bundle?.papers ?? []) {
    labels[paper.id] = paper.title
  }
  return labels
}
