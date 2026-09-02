import type { CsvLintResult } from './csv'
import type { ParsedExamQuestionRow } from './examPaperImport'
import { flattenExamPaperBundle, type ExamPaperBundle } from './examPaperImport'

export interface ExamPaperLintResult extends CsvLintResult {
  rows: ParsedExamQuestionRow[]
  bundle?: ExamPaperBundle
  meta?: { title?: string; description?: string }
  stats?: {
    morning: number
    afternoon: number
    total: number
    sections: string[]
  }
}

function isExamPaperRoot(parsed: unknown): parsed is Record<string, unknown> {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false
  const root = parsed as Record<string, unknown>
  return root.format === 'xijing-exam-paper' || Array.isArray(root.papers)
}

export function lintExamPaperJson(text: string): ExamPaperLintResult {
  const trimmed = text.trim()
  if (!trimmed) {
    return {
      issues: [{ line: 0, message: '请粘贴试卷 JSON 文本' }],
      rows: [],
      valid: false,
    }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch (e) {
    const message = e instanceof Error ? e.message : '解析失败'
    return {
      issues: [{ line: 0, message: `JSON 格式无效：${message}` }],
      rows: [],
      valid: false,
    }
  }

  if (!isExamPaperRoot(parsed)) {
    return {
      issues: [
        {
          line: 0,
          message: '根节点须为 xijing-exam-paper 格式（含 format 与 papers 字段）',
        },
      ],
      rows: [],
      valid: false,
    }
  }

  try {
    const bundle = normalizeExamBundle(parsed)
    const rows = flattenExamPaperBundle(bundle)
    const morning = rows.filter((r) => r.section?.endsWith('-am')).length
    const afternoon = rows.filter((r) => r.section?.endsWith('-pm')).length
    const sections = [...new Set(rows.map((r) => r.section).filter(Boolean))] as string[]
    return {
      issues: [],
      rows,
      valid: rows.length > 0,
      bundle,
      stats: { morning, afternoon, total: rows.length, sections },
      meta: {
        title: bundle.exam.title,
        description: bundle.exam.notes ?? '',
      },
    }
  } catch (e) {
    return {
      issues: [{ line: 0, message: e instanceof Error ? e.message : '试卷解析失败' }],
      rows: [],
      valid: false,
    }
  }
}

export function parseExamPaperJson(text: string): {
  bundle: ExamPaperBundle
  rows: ParsedExamQuestionRow[]
} {
  const result = lintExamPaperJson(text)
  if (!result.valid || !result.bundle) {
    const first = result.issues[0]
    throw new Error(first ? first.message : '试卷 JSON 无效')
  }
  return { bundle: result.bundle, rows: result.rows }
}

function normalizeExamBundle(parsed: Record<string, unknown>): ExamPaperBundle {
  if (parsed.format && parsed.format !== 'xijing-exam-paper') {
    throw new Error(`不支持的 format：${String(parsed.format)}`)
  }
  const exam = parsed.exam
  if (!exam || typeof exam !== 'object') throw new Error('缺少 exam 元数据')
  const examObj = exam as Record<string, unknown>
  const title = typeof examObj.title === 'string' ? examObj.title.trim() : ''
  if (!title) throw new Error('exam.title 不能为空')

  const papers = parsed.papers
  if (!Array.isArray(papers) || !papers.length) throw new Error('papers 须为非空数组')

  return {
    schema_version: typeof parsed.schema_version === 'string' ? parsed.schema_version : '1.0',
    format: 'xijing-exam-paper',
    exam: {
      title,
      year: typeof examObj.year === 'number' ? examObj.year : undefined,
      session: typeof examObj.session === 'string' ? examObj.session : undefined,
      exam_date: typeof examObj.exam_date === 'string' ? examObj.exam_date : undefined,
      qualification: typeof examObj.qualification === 'string' ? examObj.qualification : undefined,
      level: typeof examObj.level === 'string' ? examObj.level : undefined,
      sources: Array.isArray(examObj.sources)
        ? examObj.sources.filter((s): s is string => typeof s === 'string')
        : undefined,
      notes: typeof examObj.notes === 'string' ? examObj.notes : undefined,
    },
    papers: papers as ExamPaperBundle['papers'],
  }
}
