import { describe, expect, it } from 'vitest'
import { planQuestionImport } from './importPlan'
import type { ParsedQuestionRow } from './csv'

const row = (external_id: string | null): ParsedQuestionRow => ({
  line: 2,
  external_id,
  qtype: 'single',
  stem: '题干',
  options: [
    { key: 'A', text: 'A' },
    { key: 'B', text: 'B' },
  ],
  answer_keys: ['A'],
  explanation: '',
  case_id: null,
  case_material: '',
})

describe('planQuestionImport', () => {
  it('inserts rows without external_id and updates matching ids', () => {
    const plan = planQuestionImport([row(null), row('q1')], new Map([['q1', 'uuid-1']]))
    expect(plan.inserts).toHaveLength(1)
    expect(plan.updates).toHaveLength(1)
    expect(plan.updates[0].questionId).toBe('uuid-1')
  })
})
