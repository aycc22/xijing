import { mulberry32 } from './paperCompose'

export function shuffleInPlace<T>(items: T[], rand: () => number): T[] {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

/** Shuffle questions while keeping the same case_id group contiguous. */
export function shuffleKeepingCases<T extends { case_id: string | null }>(
  items: T[],
  seed = Date.now(),
): T[] {
  const caseGroups = new Map<string, T[]>()
  const standalone: T[] = []
  for (const item of items) {
    if (item.case_id) {
      const list = caseGroups.get(item.case_id) ?? []
      list.push(item)
      caseGroups.set(item.case_id, list)
    } else {
      standalone.push(item)
    }
  }
  const blocks: T[][] = [
    ...[...caseGroups.values()],
    ...standalone.map((item) => [item]),
  ]
  return shuffleInPlace(blocks, mulberry32(seed)).flat()
}

export function filterUnanswered<T extends { id: string }>(items: T[], answeredIds: Set<string>): T[] {
  return items.filter((item) => !answeredIds.has(item.id))
}

export function bankMatchesKeyword(
  bank: { title: string; description?: string | null },
  keyword: string,
): boolean {
  const q = keyword.trim().toLowerCase()
  if (!q) return true
  const title = bank.title.toLowerCase()
  const description = (bank.description ?? '').toLowerCase()
  return title.includes(q) || description.includes(q)
}

export function canPublishBank(activeQuestionCount: number): boolean {
  return activeQuestionCount > 0
}
