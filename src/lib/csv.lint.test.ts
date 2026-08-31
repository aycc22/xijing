import { describe, expect, it } from 'vitest'
import { lintQuestionCsvRows } from './csv'

describe('lintQuestionCsvRows', () => {
  it('collects per-row errors without stopping', () => {
    const data = [
      { type: 'single', stem: '', option_a: 'A', option_b: 'B', answer: 'A' },
      { type: 'unknown', stem: '题干', option_a: 'A', option_b: 'B', answer: 'A' },
    ]
    const result = lintQuestionCsvRows(data as Record<string, string>[])
    expect(result.valid).toBe(false)
    expect(result.issues).toHaveLength(2)
    expect(result.issues[0]).toMatchObject({ line: 2, message: expect.stringContaining('stem') })
    expect(result.issues[1]).toMatchObject({ line: 3, message: expect.stringContaining('未知题型') })
  })

  it('returns valid rows when all lines pass', () => {
    const data = [
      { type: 'single', stem: 'Q1', option_a: 'A', option_b: 'B', answer: 'A' },
      { type: 'judgement', stem: 'Q2', answer: 'TRUE' },
    ]
    const result = lintQuestionCsvRows(data as Record<string, string>[])
    expect(result.valid).toBe(true)
    expect(result.rows).toHaveLength(2)
  })
})
