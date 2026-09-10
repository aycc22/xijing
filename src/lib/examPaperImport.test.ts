import { describe, expect, it } from 'vitest'
import { flattenExamPaperBundle, type ExamPaperBundle } from './examPaperImport'

function bundleWithTags(tags?: string[] | string): ExamPaperBundle {
  return {
    schema_version: '1.0',
    format: 'xijing-exam-paper',
    exam: { title: '考点导入样例' },
    papers: [
      {
        id: 'sample-am',
        title: '上午',
        paper_type: 'choice',
        duration_minutes: 60,
        total_score: 2,
        pass_score: 1,
        questions: [
          {
            external_id: 'q1',
            number: 1,
            type: 'single',
            stem: '有标签',
            options: { A: 'a', B: 'b' },
            answer: 'A',
            tags,
          },
          {
            external_id: 'q2',
            number: 2,
            type: 'single',
            stem: '无标签',
            options: { A: 'a', B: 'b' },
            answer: 'B',
          },
        ],
      },
    ],
  }
}

describe('flattenExamPaperBundle tags', () => {
  it('writes source tags instead of a hardcoded empty array', () => {
    const rows = flattenExamPaperBundle(bundleWithTags(['操作系统', ' 进程调度 ']))
    expect(rows[0].tags).toEqual(['操作系统', '进程调度'])
    expect(rows[1].tags).toEqual([])
  })

  it('parses semicolon-separated tag strings', () => {
    const rows = flattenExamPaperBundle(bundleWithTags('网络;密码学'))
    expect(rows[0].tags).toEqual(['网络', '密码学'])
  })
})
