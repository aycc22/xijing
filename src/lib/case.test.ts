import { describe, expect, it } from 'vitest'
import { finalizeCaseGroups, resolveCaseAttachments, resolveCaseMaterial, shouldShowCaseMaterial } from './case'
import type { Question } from './types'

const caseQuestions: Pick<Question, 'case_id' | 'case_material' | 'stem'>[] = [
  { case_id: 'c1', case_material: '患者男，45岁，胸闷。', stem: '最可能的诊断？' },
  { case_id: 'c1', case_material: null, stem: '需要立即手术吗？' },
  { case_id: null, case_material: null, stem: '独立单选题' },
]

describe('resolveCaseMaterial', () => {
  it('finds material from any row in the same case group', () => {
    expect(resolveCaseMaterial(caseQuestions, 1)).toBe('患者男，45岁，胸闷。')
  })

  it('returns null for non-case questions', () => {
    expect(resolveCaseMaterial(caseQuestions, 2)).toBeNull()
  })
})

describe('shouldShowCaseMaterial', () => {
  it('shows material only on the first sub-question of a case', () => {
    expect(shouldShowCaseMaterial(caseQuestions, 0)).toBe(true)
    expect(shouldShowCaseMaterial(caseQuestions, 1)).toBe(false)
    expect(shouldShowCaseMaterial(caseQuestions, 2)).toBe(false)
  })
})

describe('resolveCaseAttachments', () => {
  it('finds attachments from any row in the same case group', () => {
    const rows = [
      {
        case_id: 'c1',
        case_material: '材料',
        attachments: [{ type: 'image', id: 'fig1', url: '/img/fig1.svg' }],
        stem: 'Q1',
      },
      { case_id: 'c1', case_material: '材料', attachments: null, stem: 'Q2' },
    ]
    expect(resolveCaseAttachments(rows, 1)).toHaveLength(1)
    expect(resolveCaseAttachments(rows, 1)[0].url).toBe('/img/fig1.svg')
  })
})

describe('finalizeCaseGroups', () => {
  it('propagates material and attachments across case rows', () => {
    const rows = finalizeCaseGroups([
      { case_id: 'c1', case_material: '材料A', attachments: [{ type: 'image', id: 'f1' }], stem: 'Q1' },
      { case_id: 'c1', case_material: '', stem: 'Q2' },
    ])
    expect(rows[1].case_material).toBe('材料A')
    expect(rows[1].attachments).toEqual([{ type: 'image', id: 'f1' }])
  })

  it('rejects cases without material', () => {
    const rows = finalizeCaseGroups([
      { case_id: 'c1', case_material: '材料A', stem: 'Q1' },
      { case_id: 'c1', case_material: '', stem: 'Q2' },
    ])
    expect(rows[1].case_material).toBe('材料A')
  })

  it('throws when a case group has no material', () => {
    expect(() =>
      finalizeCaseGroups([
        { case_id: 'c1', case_material: '', stem: 'Q1' },
        { case_id: 'c1', case_material: '', stem: 'Q2' },
      ]),
    ).toThrow(/材料/)
  })
})
