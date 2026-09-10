import { describe, expect, it } from 'vitest'
import {
  UNTAGGED_TAG,
  computeTagStats,
  filterWeakPointsToKnownTags,
  shapeAnalyzeSessionInput,
} from './tagStats'

const tags = (map: Record<string, string[]>) => map

describe('computeTagStats', () => {
  it('splits one question across every tag', () => {
    const stats = computeTagStats(
      [{ questionId: 'q1', isCorrect: false }],
      tags({ q1: ['操作系统', '进程调度'] }),
    )
    expect(stats).toEqual([
      { tag: '操作系统', total: 1, correct: 0, wrong: 1, rate: 0 },
      { tag: '进程调度', total: 1, correct: 0, wrong: 1, rate: 0 },
    ])
  })

  it('buckets questions without tags as untagged', () => {
    const stats = computeTagStats(
      [
        { questionId: 'q1', isCorrect: true },
        { questionId: 'q2', isCorrect: false },
      ],
      tags({ q1: [], q2: [] }),
    )
    expect(stats).toEqual([
      { tag: UNTAGGED_TAG, total: 2, correct: 1, wrong: 1, rate: 0.5 },
    ])
  })

  it('treats missing tag map entries as untagged', () => {
    const stats = computeTagStats([{ questionId: 'gone', isCorrect: false }], tags({}))
    expect(stats).toEqual([{ tag: UNTAGGED_TAG, total: 1, correct: 0, wrong: 1, rate: 0 }])
  })

  it('counts skipped answers as wrong, not correct', () => {
    const stats = computeTagStats(
      [
        { questionId: 'q1', isCorrect: false, isSkipped: true },
        { questionId: 'q2', isCorrect: true },
      ],
      tags({ q1: ['网络'], q2: ['网络'] }),
    )
    expect(stats).toEqual([{ tag: '网络', total: 2, correct: 1, wrong: 1, rate: 0.5 }])
  })

  it('reports all-correct and all-wrong rates', () => {
    const allCorrect = computeTagStats(
      [
        { questionId: 'q1', isCorrect: true },
        { questionId: 'q2', isCorrect: true },
      ],
      tags({ q1: ['数据库'], q2: ['数据库'] }),
    )
    expect(allCorrect).toEqual([{ tag: '数据库', total: 2, correct: 2, wrong: 0, rate: 1 }])

    const allWrong = computeTagStats(
      [
        { questionId: 'q1', isCorrect: false },
        { questionId: 'q2', isCorrect: false },
      ],
      tags({ q1: ['数据库'], q2: ['数据库'] }),
    )
    expect(allWrong).toEqual([{ tag: '数据库', total: 2, correct: 0, wrong: 2, rate: 0 }])
  })

  it('rounds rate to two decimal places', () => {
    const stats = computeTagStats(
      [
        { questionId: 'q1', isCorrect: true },
        { questionId: 'q2', isCorrect: false },
        { questionId: 'q3', isCorrect: false },
      ],
      tags({ q1: ['操作系统'], q2: ['操作系统'], q3: ['操作系统'] }),
    )
    expect(stats[0]).toMatchObject({ total: 3, correct: 1, wrong: 2, rate: 0.33 })
  })
})

describe('filterWeakPointsToKnownTags', () => {
  it('keeps only tags present in local tag_stats', () => {
    const filtered = filterWeakPointsToKnownTags(
      [
        { tag: '操作系统', reason: '错了两道' },
        { tag: '编造考点', reason: '模型幻觉' },
      ],
      [{ tag: '操作系统', total: 3, correct: 1, wrong: 2, rate: 0.33 }],
    )
    expect(filtered).toEqual([{ tag: '操作系统', reason: '错了两道' }])
  })
})

describe('shapeAnalyzeSessionInput', () => {
  it('builds tag_stats, truncated wrong stems, and session counts', () => {
    const stem = '甲'.repeat(240)
    const payload = shapeAnalyzeSessionInput(
      [
        {
          questionId: 'q1',
          isCorrect: false,
          stem,
          qtype: 'single',
        },
        { questionId: 'q2', isCorrect: true, stem: '已掌握', qtype: 'single' },
      ],
      tags({ q1: ['操作系统'], q2: ['操作系统'] }),
    )
    expect(payload.tag_stats[0]).toMatchObject({ tag: '操作系统', total: 2, correct: 1, wrong: 1 })
    expect(payload.correct_count).toBe(1)
    expect(payload.total_count).toBe(2)
    expect(payload.wrong_items).toEqual([
      { stem: '甲'.repeat(200), tags: ['操作系统'], qtype: 'single' },
    ])
  })
})
