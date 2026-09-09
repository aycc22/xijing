import { describe, expect, it } from 'vitest'
import { pageRange, totalPages } from './pagination'

describe('pageRange', () => {
  it('computes inclusive from/to for page 1', () => {
    expect(pageRange(1, 20)).toEqual({ from: 0, to: 19, page: 1, pageSize: 20 })
  })

  it('computes later pages and clamps invalid page', () => {
    expect(pageRange(3, 10)).toEqual({ from: 20, to: 29, page: 3, pageSize: 10 })
    expect(pageRange(0, 10).page).toBe(1)
  })
})

describe('totalPages', () => {
  it('returns at least 1', () => {
    expect(totalPages(0)).toBe(1)
  })

  it('ceils remainder', () => {
    expect(totalPages(21, 20)).toBe(2)
    expect(totalPages(20, 20)).toBe(1)
  })
})
