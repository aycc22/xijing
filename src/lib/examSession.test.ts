import { describe, expect, it } from 'vitest'
import {
  countUnanswered,
  createExamState,
  examSheetStatus,
  formatExamDuration,
  gradeExam,
  mergeGradingIntoItems,
  splitPaperForStorage,
  toggleFlag,
  updateExamSelection,
  type ExamAnswerMap,
} from './examSession'
import type { PaperItem } from './paperSnapshot'

const items: PaperItem[] = [
  {
    question_id: 'q1',
    score: 50,
    snapshot: {
      stem: '单选',
      qtype: 'single',
      options: [
        { key: 'A', text: 'A' },
        { key: 'B', text: 'B' },
      ],
      answer_keys: ['B'],
      explanation: '选B',
      case_id: null,
      case_material: null,
    },
  },
  {
    question_id: 'q2',
    score: 50,
    snapshot: {
      stem: '多选',
      qtype: 'multiple',
      options: [
        { key: 'A', text: 'A' },
        { key: 'B', text: 'B' },
        { key: 'C', text: 'C' },
      ],
      answer_keys: ['A', 'C'],
      explanation: '',
      case_id: null,
      case_material: null,
    },
  },
]

describe('examSession state', () => {
  it('starts unanswered and tracks flags', () => {
    let answers = createExamState(['q1', 'q2'])
    expect(examSheetStatus(answers.q1)).toBe('unanswered')
    answers = updateExamSelection(answers, 'q1', ['B'])
    expect(examSheetStatus(answers.q1)).toBe('answered')
    answers = toggleFlag(answers, 'q2')
    expect(examSheetStatus(answers.q2)).toBe('flagged')
    expect(countUnanswered(answers, ['q1', 'q2'])).toBe(1)
  })
})

describe('gradeExam', () => {
  it('scores only fully correct multiple choice', () => {
    const answers: ExamAnswerMap = {
      q1: { selected: ['B'], flagged: false },
      q2: { selected: ['A'], flagged: false },
    }
    const result = gradeExam(items, answers)
    expect(result.correctCount).toBe(1)
    expect(result.score).toBe(50)
    expect(result.items[1].is_correct).toBe(false)
  })

  it('awards full score when all correct', () => {
    const answers: ExamAnswerMap = {
      q1: { selected: ['B'], flagged: false },
      q2: { selected: ['C', 'A'], flagged: false },
    }
    const result = gradeExam(items, answers)
    expect(result.correctCount).toBe(2)
    expect(result.score).toBe(100)
  })
})

describe('splitPaperForStorage', () => {
  it('removes answers from public items and keeps them in grading', () => {
    const { publicItems, grading } = splitPaperForStorage(items)
    expect(publicItems[0].snapshot.answer_keys).toEqual([])
    expect(publicItems[0].snapshot.explanation).toBe('')
    expect(grading.q1.answer_keys).toEqual(['B'])
    expect(grading.q1.explanation).toBe('选B')
    const merged = mergeGradingIntoItems(publicItems, grading)
    expect(merged[0].snapshot.answer_keys).toEqual(['B'])
    expect(formatExamDuration(65_000)).toBe('1 分 5 秒')
  })

  it('does not treat empty keys as correct', () => {
    const blank: PaperItem[] = [
      {
        ...items[0],
        snapshot: { ...items[0].snapshot, answer_keys: [] },
      },
    ]
    const result = gradeExam(blank, { q1: { selected: [], flagged: false } })
    expect(result.items[0].is_correct).toBe(false)
  })
})
