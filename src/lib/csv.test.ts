import { describe, expect, it } from 'vitest'
import { parseQuestionCsv } from './csv'

const JUDGEMENT_CSV = `type,stem,answer,explanation
judgement,地球绕太阳公转,TRUE,地球围绕太阳公转。
judgement,太阳绕地球公转,FALSE,日心说才是正确的。`

describe('parseQuestionCsv judgement', () => {
  it('parses judgement rows with TRUE/FALSE answers', async () => {
    const rows = await parseQuestionCsv(JUDGEMENT_CSV)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      qtype: 'judgement',
      stem: '地球绕太阳公转',
      answer_keys: ['TRUE'],
      explanation: '地球围绕太阳公转。',
    })
    expect(rows[0].options).toEqual([
      { key: 'TRUE', text: '正确' },
      { key: 'FALSE', text: '错误' },
    ])
    expect(rows[1].answer_keys).toEqual(['FALSE'])
  })

  it('rejects judgement with invalid answer', async () => {
    const bad = `type,stem,answer
judgement,无效答案题,MAYBE`
    await expect(parseQuestionCsv(bad)).rejects.toThrow(/TRUE|FALSE/)
  })
})

const CASE_CSV = `type,stem,case_id,case_material,option_a,option_b,option_c,option_d,answer,explanation
single,患者最可能的诊断是？,case1,患者男45岁胸闷2小时。,心梗,肺炎,胃炎,骨折,B,典型胸痛。
judgement,需要立即手术吗？,case1,,,,,,TRUE,急诊指征明确。`

describe('parseQuestionCsv case', () => {
  it('parses case sub-questions with shared case_id and propagated material', async () => {
    const rows = await parseQuestionCsv(CASE_CSV)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      qtype: 'single',
      case_id: 'case1',
      case_material: '患者男45岁胸闷2小时。',
    })
    expect(rows[1]).toMatchObject({
      qtype: 'judgement',
      case_id: 'case1',
      case_material: '患者男45岁胸闷2小时。',
      answer_keys: ['TRUE'],
    })
  })

  it('rejects case group without material', async () => {
    const bad = `type,stem,case_id,case_material,option_a,option_b,answer
single,无材料小题,case2,,A,B,A`
    await expect(parseQuestionCsv(bad)).rejects.toThrow(/材料/)
  })
})

const SORT_CSV = `序号,type,stem,option_a,option_b,answer
3,single,第三题,A,B,A
1,single,第一题,A,B,A
,single,第二题,A,B,B`

describe('parseQuestionCsv sort order', () => {
  it('parses 序号 and sorts rows before import', async () => {
    const rows = await parseQuestionCsv(SORT_CSV)
    expect(rows).toHaveLength(3)
    expect(rows[0].stem).toBe('第一题')
    expect(rows[1].stem).toBe('第二题')
    expect(rows[2].stem).toBe('第三题')
    expect(rows[0].sort_order).toBe(0)
    expect(rows[2].sort_order).toBe(2)
    expect(rows[1].sort_order_explicit).toBe(false)
  })

  it('rejects duplicate 序号', async () => {
    const bad = `序号,type,stem,option_a,option_b,answer
1,single,Q1,A,B,A
1,single,Q2,A,B,A`
    await expect(parseQuestionCsv(bad)).rejects.toThrow(/序号 1/)
  })
})
