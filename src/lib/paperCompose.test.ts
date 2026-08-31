import { describe, expect, it } from 'vitest'
import {
  allocateScores,
  checkInventory,
  composePaper,
  countByType,
  expandCases,
  mulberry32,
  type ComposeRequest,
  type PoolQuestion,
} from './paperCompose'

const pool: PoolQuestion[] = [
  { id: 's1', qtype: 'single', case_id: null, is_active: true },
  { id: 's2', qtype: 'single', case_id: null, is_active: true },
  { id: 'm1', qtype: 'multiple', case_id: null, is_active: true },
  { id: 'j1', qtype: 'judgement', case_id: null, is_active: true },
  { id: 'c1a', qtype: 'single', case_id: 'case1', is_active: true },
  { id: 'c1b', qtype: 'judgement', case_id: 'case1', is_active: true },
  { id: 'c1c', qtype: 'multiple', case_id: 'case1', is_active: true },
]

describe('mulberry32', () => {
  it('is deterministic for the same seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
})

describe('countByType', () => {
  it('counts active standalone and case sub-questions', () => {
    expect(countByType(pool)).toEqual({
      single: 3,
      multiple: 2,
      judgement: 2,
    })
  })
})

describe('checkInventory', () => {
  it('reports shortages', () => {
    const shortages = checkInventory(pool, { single: 10, multiple: 0, judgement: 0 })
    expect(shortages).toEqual([{ qtype: 'single', requested: 10, available: 3, missing: 7 }])
  })

  it('passes when inventory is enough', () => {
    expect(checkInventory(pool, { single: 2, multiple: 1, judgement: 1 })).toEqual([])
  })
})

describe('expandCases', () => {
  it('pulls entire case when any sub-question is selected', () => {
    const expanded = expandCases(pool, ['c1a'])
    expect(expanded.map((q) => q.id)).toEqual(['c1a', 'c1b', 'c1c'])
  })
})

describe('allocateScores', () => {
  it('averages to 100 with remainder on last item', () => {
    expect(allocateScores(3)).toEqual([33.34, 33.33, 33.33])
    expect(allocateScores(3).reduce((a, b) => a + b, 0)).toBeCloseTo(100, 2)
  })
})

describe('composePaper', () => {
  const request: ComposeRequest = {
    counts: { single: 1, multiple: 0, judgement: 0 },
    seed: 7,
  }

  it('rejects when inventory is short', () => {
    const result = composePaper(pool, { counts: { single: 20, multiple: 0, judgement: 0 }, seed: 1 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.shortages[0].missing).toBe(17)
  })

  it('returns stable order for the same seed', () => {
    const a = composePaper(pool, request)
    const b = composePaper(pool, request)
    expect(a.ok && b.ok).toBe(true)
    if (a.ok && b.ok) {
      expect(a.questionIds).toEqual(b.questionIds)
      expect(a.seed).toBe(7)
      expect(a.scores.reduce((x, y) => x + y, 0)).toBeCloseTo(100, 2)
    }
  })

  it('includes full case when a case sub-question is drawn', () => {
    const result = composePaper(pool, {
      counts: { single: 1, multiple: 0, judgement: 0 },
      seed: 99,
      preferCaseIds: ['case1'],
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.questionIds).toEqual(expect.arrayContaining(['c1a', 'c1b', 'c1c']))
    }
  })
})
