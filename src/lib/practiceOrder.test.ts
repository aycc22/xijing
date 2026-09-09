import { describe, expect, it } from 'vitest'
import {
  bankMatchesKeyword,
  canPublishBank,
  filterUnanswered,
  shuffleKeepingCases,
} from './practiceOrder'

describe('shuffleKeepingCases', () => {
  it('keeps case groups contiguous', () => {
    const items = [
      { id: 's1', case_id: null },
      { id: 'c1a', case_id: 'c1' },
      { id: 'c1b', case_id: 'c1' },
      { id: 's2', case_id: null },
    ]
    const shuffled = shuffleKeepingCases(items, 42)
    expect(shuffled).toHaveLength(4)
    const first = shuffled.findIndex((q) => q.case_id === 'c1')
    const second = shuffled.findIndex((q, i) => q.case_id === 'c1' && i !== first)
    expect(Math.abs(first - second)).toBe(1)
  })

  it('is deterministic for the same seed', () => {
    const items = [
      { id: 'a', case_id: null },
      { id: 'b', case_id: null },
      { id: 'c', case_id: null },
      { id: 'd', case_id: null },
    ]
    expect(shuffleKeepingCases(items, 7).map((q) => q.id)).toEqual(
      shuffleKeepingCases(items, 7).map((q) => q.id),
    )
  })
})

describe('filterUnanswered', () => {
  it('drops already answered ids', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    expect(filterUnanswered(items, new Set(['b']))).toEqual([{ id: 'a' }, { id: 'c' }])
  })
})

describe('bankMatchesKeyword', () => {
  it('matches title or description', () => {
    const bank = { title: '内科护理', description: '基础习题' }
    expect(bankMatchesKeyword(bank, '内科')).toBe(true)
    expect(bankMatchesKeyword(bank, '习题')).toBe(true)
    expect(bankMatchesKeyword(bank, '外科')).toBe(false)
    expect(bankMatchesKeyword(bank, '  ')).toBe(true)
  })
})

describe('canPublishBank', () => {
  it('refuses empty banks', () => {
    expect(canPublishBank(0)).toBe(false)
    expect(canPublishBank(3)).toBe(true)
  })
})
