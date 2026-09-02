import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { lintExamPaperJson } from './examPaperJson'
import { examBankDescription, examBankTitle } from './examPaperImport'
import { buildFixedPaperPlan, sectionLabelsFromBundle } from './examPaperCompose'
import { gradeExam } from './examSession'
import { buildPaperItems } from './paperSnapshot'

const samplePath = resolve('public/data/exams/2022-isec-engineer.json')

describe('examPaperJson', () => {
  it('parses 2022 exam sample', () => {
    const text = readFileSync(samplePath, 'utf8')
    const result = lintExamPaperJson(text)
    expect(result.valid).toBe(true)
    expect(result.rows.length).toBeGreaterThan(100)
    expect(result.stats?.morning).toBe(75)
    expect(result.stats?.afternoon).toBeGreaterThan(30)
    expect(result.bundle).toBeTruthy()
    if (result.bundle) {
      expect(examBankTitle(result.bundle)).toContain('2022')
      expect(examBankDescription(result.bundle)).toContain('信息安全工程师')
    }
  })

  it('builds fixed paper plan with scores', () => {
    const text = readFileSync(samplePath, 'utf8')
    const result = lintExamPaperJson(text)
    expect(result.bundle).toBeTruthy()
    const flat = result.rows
    const labels = sectionLabelsFromBundle(result.bundle)
    const fakeQuestions = flat.map((row, index) => ({
      id: `q-${index}`,
      qtype: row.qtype,
      sort_order: index,
      score: row.score,
      section: row.section,
      is_active: true,
    }))
    const amPlan = buildFixedPaperPlan(fakeQuestions, '2022-11-am', labels)
    expect(amPlan.questionIds).toHaveLength(75)
    expect(amPlan.totalScore).toBe(75)

    const fullPlan = buildFixedPaperPlan(fakeQuestions, null, labels)
    expect(fullPlan.questionIds.length).toBe(flat.length)
  })

  it('grades short answer leniently', () => {
    const items = buildPaperItems({
      questionIds: ['q1'],
      scores: [2],
      seed: 1,
      questionsById: new Map([
        [
          'q1',
          {
            id: 'q1',
            qtype: 'short_answer',
            stem: '测试',
            options: [],
            answer_keys: [],
            explanation: '',
            case_id: null,
            case_material: null,
            reference_answer: '网闸（安全隔离与信息交换系统）',
          },
        ],
      ]),
    })
    const graded = gradeExam(items, {
      q1: { selected: ['网闸'], flagged: false },
    })
    expect(graded.score).toBe(2)
    expect(graded.correctCount).toBe(1)
  })
})
