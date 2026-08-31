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
