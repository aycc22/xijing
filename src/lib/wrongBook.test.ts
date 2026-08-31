import { describe, expect, it } from 'vitest'
import { bankFilterOptions, filterEntriesByBank, type WrongBookEntry } from './wrongBook'

const entries: WrongBookEntry[] = [
  {
    id: '1',
    question_id: 'q1',
    wrong_count: 2,
    last_wrong_keys: ['A'],
    first_wrong_at: '2026-08-01',
    last_wrong_at: '2026-08-02',
    stem: '题一',
    qtype: 'single',
    bank_id: 'b1',
    bank_title: '内科',
  },
  {
    id: '2',
    question_id: 'q2',
    wrong_count: 1,
    last_wrong_keys: ['B'],
    first_wrong_at: '2026-08-03',
    last_wrong_at: '2026-08-03',
    stem: '题二',
    qtype: 'multiple',
    bank_id: 'b2',
    bank_title: '外科',
  },
]

describe('filterEntriesByBank', () => {
  it('returns all entries for all filter', () => {
    expect(filterEntriesByBank(entries, 'all')).toHaveLength(2)
  })

  it('filters by bank id', () => {
    expect(filterEntriesByBank(entries, 'b1')).toEqual([entries[0]])
  })
})

describe('bankFilterOptions', () => {
  it('builds bank options with counts', () => {
    expect(bankFilterOptions(entries)).toEqual([
      { id: 'b1', title: '内科', count: 1 },
      { id: 'b2', title: '外科', count: 1 },
    ])
  })
})
