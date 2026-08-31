import type { QuestionType } from './types'

export type ObjectiveType = 'single' | 'multiple' | 'judgement'

export interface PoolQuestion {
  id: string
  qtype: QuestionType
  case_id: string | null
  is_active: boolean
}

export interface TypeCounts {
  single: number
  multiple: number
  judgement: number
}

export interface InventoryShortage {
  qtype: ObjectiveType
  requested: number
  available: number
  missing: number
}

export interface ComposeRequest {
  counts: TypeCounts
  seed: number
  /** Test helper: force drawing from these cases first */
  preferCaseIds?: string[]
}

export type ComposeResult =
  | {
      ok: true
      seed: number
      questionIds: string[]
      scores: number[]
      totalScore: number
    }
  | {
      ok: false
      shortages: InventoryShortage[]
    }

export function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

export function isObjectiveType(qtype: QuestionType): qtype is ObjectiveType {
  return qtype === 'single' || qtype === 'multiple' || qtype === 'judgement'
}

export function countByType(pool: PoolQuestion[]): TypeCounts {
  const counts: TypeCounts = { single: 0, multiple: 0, judgement: 0 }
  for (const q of pool) {
    if (!q.is_active || !isObjectiveType(q.qtype)) continue
    counts[q.qtype] += 1
  }
  return counts
}

export function checkInventory(pool: PoolQuestion[], requested: TypeCounts): InventoryShortage[] {
  const available = countByType(pool)
  const shortages: InventoryShortage[] = []
  for (const qtype of ['single', 'multiple', 'judgement'] as const) {
    const need = requested[qtype] ?? 0
    if (need <= 0) continue
    if (available[qtype] < need) {
      shortages.push({
        qtype,
        requested: need,
        available: available[qtype],
        missing: need - available[qtype],
      })
    }
  }
  return shortages
}

export function expandCases(pool: PoolQuestion[], selectedIds: string[]): PoolQuestion[] {
  const byId = new Map(pool.map((q) => [q.id, q]))
  const caseIds = new Set<string>()
  for (const id of selectedIds) {
    const q = byId.get(id)
    if (q?.case_id) caseIds.add(q.case_id)
  }
  const result: PoolQuestion[] = []
  const seen = new Set<string>()
  for (const id of selectedIds) {
    const q = byId.get(id)
    if (!q) continue
    if (q.case_id && caseIds.has(q.case_id)) {
      for (const sibling of pool) {
        if (sibling.case_id !== q.case_id || !sibling.is_active || seen.has(sibling.id)) continue
        seen.add(sibling.id)
        result.push(sibling)
      }
    } else if (!seen.has(q.id)) {
      seen.add(q.id)
      result.push(q)
    }
  }
  return result
}

/** Average to 100; put remainder on the first item so sum is exactly 100.00 */
export function allocateScores(count: number): number[] {
  if (count <= 0) return []
  const base = Math.floor((10000 / count)) / 100
  const scores = Array.from({ length: count }, () => base)
  const sum = Number((base * count).toFixed(2))
  const rem = Number((100 - sum).toFixed(2))
  scores[0] = Number((scores[0] + rem).toFixed(2))
  return scores
}

function pickByType(
  candidates: PoolQuestion[],
  qtype: ObjectiveType,
  count: number,
  rand: () => number,
): PoolQuestion[] {
  const filtered = candidates.filter((q) => q.qtype === qtype && q.is_active)
  return shuffle(filtered, rand).slice(0, count)
}

export function composePaper(pool: PoolQuestion[], request: ComposeRequest): ComposeResult {
  const shortages = checkInventory(pool, request.counts)
  if (shortages.length) return { ok: false, shortages }

  const rand = mulberry32(request.seed)
  const active = pool.filter((q) => q.is_active && isObjectiveType(q.qtype))
  const selected: PoolQuestion[] = []
  const used = new Set<string>()

  const preferredCases = new Set(request.preferCaseIds ?? [])
  if (preferredCases.size) {
    for (const caseId of preferredCases) {
      const caseQs = active.filter((q) => q.case_id === caseId)
      for (const q of caseQs) {
        if (used.has(q.id)) continue
        if ((request.counts[q.qtype as ObjectiveType] ?? 0) <= 0) continue
        selected.push(q)
        used.add(q.id)
      }
    }
  }

  for (const qtype of ['single', 'multiple', 'judgement'] as const) {
    const need = request.counts[qtype] ?? 0
    const already = selected.filter((q) => q.qtype === qtype).length
    const remaining = Math.max(0, need - already)
    if (!remaining) continue
    const picks = pickByType(
      active.filter((q) => !used.has(q.id)),
      qtype,
      remaining,
      rand,
    )
    for (const q of picks) {
      selected.push(q)
      used.add(q.id)
    }
  }

  // Expand cases: any selected case sub-question brings entire case
  const expanded = expandCases(active, selected.map((q) => q.id))

  // Keep case groups contiguous: group by case_id, shuffle groups, shuffle non-case
  const caseGroups = new Map<string, PoolQuestion[]>()
  const standalone: PoolQuestion[] = []
  for (const q of expanded) {
    if (q.case_id) {
      const list = caseGroups.get(q.case_id) ?? []
      list.push(q)
      caseGroups.set(q.case_id, list)
    } else {
      standalone.push(q)
    }
  }

  const groupBlocks: PoolQuestion[][] = [
    ...[...caseGroups.values()].map((g) => g),
    ...standalone.map((q) => [q]),
  ]
  const orderedBlocks = shuffle(groupBlocks, rand)
  const ordered = orderedBlocks.flat()
  const scores = allocateScores(ordered.length)

  return {
    ok: true,
    seed: request.seed,
    questionIds: ordered.map((q) => q.id),
    scores,
    totalScore: 100,
  }
}

export function formatShortages(shortages: InventoryShortage[]): string {
  return shortages
    .map((s) => {
      const label = s.qtype === 'single' ? '单选' : s.qtype === 'multiple' ? '多选' : '判断'
      return `${label}缺少 ${s.missing} 道（需要 ${s.requested}，仅有 ${s.available}）`
    })
    .join('；')
}

export function totalRequested(counts: TypeCounts): number {
  return (counts.single || 0) + (counts.multiple || 0) + (counts.judgement || 0)
}

export function createSeed(): number {
  return Math.floor(Math.random() * 0xffffffff)
}
