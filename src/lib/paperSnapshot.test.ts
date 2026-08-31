import { describe, expect, it } from 'vitest'
import { mulberry32 } from './paperCompose'
import {
  buildPaperItems,
  parsePaperItems,
  shuffleOptions,
  type SnapshotSourceQuestion,
} from './paperSnapshot'

const questions: SnapshotSourceQuestion[] = [
  {
    id: 'q1',
    qtype: 'single',
    stem: '题干1',
    options: [
      { key: 'A', text: '甲' },
      { key: 'B', text: '乙' },
      { key: 'C', text: '丙' },
    ],
    answer_keys: ['B'],
    explanation: '解析1',
    case_id: null,
    case_material: null,
  },
  {
    id: 'q2',
    qtype: 'judgement',
    stem: '判断题',
    options: [
      { key: 'TRUE', text: '正确' },
      { key: 'FALSE', text: '错误' },
    ],
    answer_keys: ['TRUE'],
    explanation: '',
    case_id: 'c1',
    case_material: '案例材料',
  },
]

describe('shuffleOptions', () => {
  it('is deterministic for the same seed stream', () => {
    const a = shuffleOptions(questions[0].options, mulberry32(11))
    const b = shuffleOptions(questions[0].options, mulberry32(11))
    expect(a.map((o) => o.key)).toEqual(b.map((o) => o.key))
  })

  it('does not shuffle judgement options', () => {
    const shuffled = shuffleOptions(questions[1].options, mulberry32(99), 'judgement')
    expect(shuffled.map((o) => o.key)).toEqual(['TRUE', 'FALSE'])
  })
})

describe('buildPaperItems', () => {
  it('freezes question content and option order', () => {
    const items = buildPaperItems({
      questionIds: ['q1', 'q2'],
      scores: [50, 50],
      seed: 42,
      questionsById: new Map(questions.map((q) => [q.id, q])),
    })
    expect(items).toHaveLength(2)
    expect(items[0].question_id).toBe('q1')
    expect(items[0].score).toBe(50)
    expect(items[0].snapshot.stem).toBe('题干1')
    expect(items[0].snapshot.answer_keys).toEqual(['B'])
    expect(items[0].snapshot.options.map((o) => o.key).sort()).toEqual(['A', 'B', 'C'])

    const again = buildPaperItems({
      questionIds: ['q1', 'q2'],
      scores: [50, 50],
      seed: 42,
      questionsById: new Map(questions.map((q) => [q.id, q])),
    })
    expect(again[0].snapshot.options).toEqual(items[0].snapshot.options)
  })
})

describe('parsePaperItems', () => {
  it('round-trips paper items', () => {
    const items = buildPaperItems({
      questionIds: ['q2'],
      scores: [100],
      seed: 1,
      questionsById: new Map(questions.map((q) => [q.id, q])),
    })
    expect(parsePaperItems(items)).toEqual(items)
    expect(parsePaperItems(null)).toEqual([])
  })
})
