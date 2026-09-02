import { describe, expect, it } from 'vitest'
import { lintQuestionJson, parseQuestionJson } from './questionJson'

const SAMPLE = `[
  {
    "type": "single",
    "stem": "人体正常体温约为多少摄氏度？",
    "options": { "A": "35℃", "B": "36.5℃", "C": "38℃", "D": "39℃" },
    "answer": "B"
  },
  {
    "type": "multiple",
    "stem": "下列哪些属于生命体征？",
    "options": ["体温", "血压", "呼吸", "脉搏"],
    "answer": ["A", "B", "C", "D"]
  },
  {
    "type": "judgement",
    "stem": "地球绕太阳公转",
    "answer": "TRUE"
  }
]`

describe('lintQuestionJson', () => {
  it('parses array root with object and array options', () => {
    const result = lintQuestionJson(SAMPLE)
    expect(result.valid).toBe(true)
    expect(result.rows).toHaveLength(3)
    expect(result.rows[0].options).toEqual([
      { key: 'A', text: '35℃' },
      { key: 'B', text: '36.5℃' },
      { key: 'C', text: '38℃' },
      { key: 'D', text: '39℃' },
    ])
    expect(result.rows[1].answer_keys).toEqual(['A', 'B', 'C', 'D'])
    expect(result.rows[2].options).toEqual([
      { key: 'TRUE', text: '正确' },
      { key: 'FALSE', text: '错误' },
    ])
  })

  it('parses wrapped questions object and meta', () => {
    const text = `{
      "title": "示例题库",
      "description": "测试",
      "questions": [
        { "type": "single", "stem": "Q1", "options": { "A": "a", "B": "b" }, "answer": "A" }
      ]
    }`
    const result = lintQuestionJson(text)
    expect(result.valid).toBe(true)
    expect(result.meta).toEqual({ title: '示例题库', description: '测试' })
  })

  it('parses key/text options array', () => {
    const text = `[{
      "type": "single",
      "stem": "Q1",
      "options": [{ "key": "A", "text": "选项A" }, { "key": "B", "text": "选项B" }],
      "answer": "B"
    }]`
    const result = lintQuestionJson(text)
    expect(result.valid).toBe(true)
    expect(result.rows[0].options).toEqual([
      { key: 'A', text: '选项A' },
      { key: 'B', text: '选项B' },
    ])
  })

  it('propagates case material across case group', () => {
    const text = `[
      {
        "type": "single",
        "stem": "患者最可能的诊断是？",
        "case_id": "case1",
        "case_material": "患者男45岁胸闷2小时。",
        "options": { "A": "心梗", "B": "肺炎" },
        "answer": "B"
      },
      {
        "type": "judgement",
        "stem": "需要立即手术吗？",
        "case_id": "case1",
        "answer": "TRUE"
      }
    ]`
    const rows = parseQuestionJson(text)
    expect(rows[1].case_material).toBe('患者男45岁胸闷2小时。')
  })

  it('rejects case group without material', () => {
    const text = `[{
      "type": "single",
      "stem": "无材料小题",
      "case_id": "case2",
      "options": { "A": "A", "B": "B" },
      "answer": "A"
    }]`
    const result = lintQuestionJson(text)
    expect(result.valid).toBe(false)
    expect(result.issues[0]?.message).toMatch(/材料/)
  })

  it('rejects duplicate external_id', () => {
    const text = `[
      { "type": "single", "stem": "Q1", "options": { "A": "a", "B": "b" }, "answer": "A", "external_id": "x1" },
      { "type": "single", "stem": "Q2", "options": { "A": "a", "B": "b" }, "answer": "A", "external_id": "x1" }
    ]`
    const result = lintQuestionJson(text)
    expect(result.valid).toBe(false)
    expect(result.issues[0]?.message).toMatch(/题重复/)
  })

  it('rejects invalid json', () => {
    const result = lintQuestionJson('{ bad json')
    expect(result.valid).toBe(false)
    expect(result.issues[0]?.message).toMatch(/JSON 格式无效/)
  })

  it('rejects empty array', () => {
    const result = lintQuestionJson('[]')
    expect(result.valid).toBe(false)
    expect(result.issues[0]?.message).toMatch(/没有有效题目/)
  })

  it('rejects invalid judgement answer', () => {
    const text = `[{ "type": "judgement", "stem": "无效", "answer": "MAYBE" }]`
    const result = lintQuestionJson(text)
    expect(result.valid).toBe(false)
    expect(result.issues[0]?.message).toMatch(/TRUE|FALSE/)
  })

  it('parses explicit 序号 and sorts rows by it', () => {
    const text = `[
      { "序号": 3, "type": "single", "stem": "第三题", "options": { "A": "a", "B": "b" }, "answer": "A" },
      { "序号": 1, "type": "single", "stem": "第一题", "options": { "A": "a", "B": "b" }, "answer": "A" }
    ]`
    const result = lintQuestionJson(text)
    expect(result.valid).toBe(true)
    expect(result.rows[0].stem).toBe('第一题')
    expect(result.rows[0].sort_order).toBe(0)
    expect(result.rows[1].sort_order).toBe(2)
    expect(result.rows[0].sort_order_explicit).toBe(true)
  })

  it('rejects duplicate 序号', () => {
    const text = `[
      { "序号": 1, "type": "single", "stem": "Q1", "options": { "A": "a", "B": "b" }, "answer": "A" },
      { "序号": 1, "type": "single", "stem": "Q2", "options": { "A": "a", "B": "b" }, "answer": "A" }
    ]`
    const result = lintQuestionJson(text)
    expect(result.valid).toBe(false)
    expect(result.issues[0]?.message).toMatch(/序号 1/)
  })
})
