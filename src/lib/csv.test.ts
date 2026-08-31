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
