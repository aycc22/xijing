import { describe, expect, it } from 'vitest'
import { deadlineFromMinutes, formatCountdown, isExamTimedOut, remainingMs } from './examTimer'

describe('exam timer', () => {
  it('skips deadline when unlimited', () => {
    expect(deadlineFromMinutes(0)).toBeNull()
  })

  it('formats remaining time', () => {
    expect(formatCountdown(65_000)).toBe('1:05')
    expect(formatCountdown(3_661_000)).toBe('1:01:01')
    expect(formatCountdown(-10)).toBe('0:00')
  })

  it('detects timeout', () => {
    const past = new Date(Date.now() - 1000).toISOString()
    expect(isExamTimedOut(past)).toBe(true)
    expect(remainingMs(null)).toBeNull()
  })
})
