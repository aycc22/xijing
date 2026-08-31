import Papa from 'papaparse'
import { validateCaseGroups, type CsvRowIssue } from './case'
import { JUDGEMENT_OPTIONS } from './scoring'
import type { QuestionOption, QuestionType } from './types'

export interface ParsedQuestionRow {
  line: number
  external_id: string | null
  qtype: QuestionType
  stem: string
  options: QuestionOption[]
  answer_keys: string[]
  explanation: string
  case_id: string | null
  case_material: string
}

export interface CsvLintResult {
  issues: CsvRowIssue[]
  rows: ParsedQuestionRow[]
  valid: boolean
}

export type { CsvRowIssue }

const OPTION_COLS = ['option_a', 'option_b', 'option_c', 'option_d', 'option_e', 'option_f'] as const
const KEYS = ['A', 'B', 'C', 'D', 'E', 'F'] as const
const JUDGEMENT_ANSWERS = new Set(['TRUE', 'FALSE'])

function normalizeType(raw: string): QuestionType {
  const t = raw.trim().toLowerCase()
  if (t === 'single' || t === '单选') return 'single'
  if (t === 'multiple' || t === '多选') return 'multiple'
  if (t === 'judgement' || t === '判断') return 'judgement'
  if (t === 'case' || t === 'case_analysis' || t === '案例分析') {
    throw new Error('案例小题请使用 single / multiple / judgement，并填写 case_id')
  }
  throw new Error(`未知题型: ${raw}`)
}

function parseAnswers(raw: string): string[] {
  return raw
    .split(/[;；,，|/\s]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
}

function parseJudgementAnswer(raw: string): string[] {
  const normalized = raw.trim().toUpperCase()
  if (normalized === '正确') return ['TRUE']
  if (normalized === '错误') return ['FALSE']
  const answer_keys = parseAnswers(raw)
  if (answer_keys.length !== 1 || !JUDGEMENT_ANSWERS.has(answer_keys[0])) {
    throw new Error('判断题答案须为 TRUE 或 FALSE')
  }
  return answer_keys
}

function readExternalId(row: Record<string, string>): string | null {
  const raw = (row.external_id ?? row['外部标识'] ?? '').trim()
  return raw || null
}

function readCaseId(row: Record<string, string>): string | null {
  const raw = (row.case_id ?? row['案例标识'] ?? '').trim()
  return raw || null
}

function readCaseMaterial(row: Record<string, string>): string {
  return (row.case_material ?? row['案例材料'] ?? '').trim()
}

export function parseQuestionRow(row: Record<string, string>, line: number): ParsedQuestionRow {
  const stem = (row.stem ?? row['题干'] ?? '').trim()
  if (!stem) throw new Error('缺少 stem（题干）')

    const qtype = normalizeType(row.type ?? row['题型'] ?? 'single')
  const answerRaw = (row.answer ?? row['答案'] ?? '').trim()
  if (!answerRaw) throw new Error('缺少 answer（答案）')

  let options: QuestionOption[]
  let answer_keys: string[]

  if (qtype === 'judgement') {
    options = [...JUDGEMENT_OPTIONS]
    answer_keys = parseJudgementAnswer(answerRaw)
  } else {
    options = []
    OPTION_COLS.forEach((col, i) => {
      const text = (row[col] ?? '').trim()
      if (text) options.push({ key: KEYS[i], text })
    })
    if (options.length < 2) throw new Error('至少需要 2 个选项')
    answer_keys = parseAnswers(answerRaw)
    const valid = new Set(options.map((o) => o.key))
    for (const k of answer_keys) {
      if (!valid.has(k)) throw new Error(`答案 ${k} 不在选项中`)
    }
    if (qtype === 'single' && answer_keys.length !== 1) {
      throw new Error('单选题答案只能有 1 个')
    }
    if (qtype === 'multiple' && answer_keys.length < 2) {
      throw new Error('多选题至少 2 个答案')
    }
  }

  return {
    line,
    external_id: readExternalId(row),
    qtype,
    stem,
    options,
    answer_keys,
    explanation: (row.explanation ?? row['解析'] ?? '').trim(),
    case_id: readCaseId(row),
    case_material: readCaseMaterial(row),
  }
}

function finalizeRows(rows: ParsedQuestionRow[]): ParsedQuestionRow[] {
  const materialByCase = new Map<string, string>()
  for (const row of rows) {
    if (!row.case_id) continue
    const material = row.case_material.trim()
    if (material) materialByCase.set(row.case_id, material)
  }
  return rows.map((row) => {
    if (!row.case_id) return row
    return { ...row, case_material: materialByCase.get(row.case_id) ?? row.case_material }
  })
}

function lintDuplicateExternalIds(rows: ParsedQuestionRow[]): CsvRowIssue[] {
  const seen = new Map<string, number>()
  const issues: CsvRowIssue[] = []
  for (const row of rows) {
    if (!row.external_id) continue
    const prev = seen.get(row.external_id)
    if (prev !== undefined) {
      issues.push({
        line: row.line,
        message: `external_id「${row.external_id}」与第 ${prev} 行重复`,
      })
    } else {
      seen.set(row.external_id, row.line)
    }
  }
  return issues
}

export function lintQuestionCsvRows(
  data: Record<string, string>[],
  parseErrors: { row?: number; message: string }[] = [],
): CsvLintResult {
  const issues: CsvRowIssue[] = parseErrors.map((e) => ({
    line: (e.row ?? 0) + 2,
    message: e.message,
  }))

  const rows: ParsedQuestionRow[] = []
  for (let index = 0; index < data.length; index++) {
    const line = index + 2
    try {
      rows.push(parseQuestionRow(data[index], line))
    } catch (e) {
      issues.push({
        line,
        message: e instanceof Error ? e.message : '行解析失败',
      })
    }
  }

  if (!data.length) {
    issues.push({ line: 0, message: 'CSV 没有有效题目' })
  } else if (rows.length) {
    issues.push(...validateCaseGroups(rows))
    issues.push(...lintDuplicateExternalIds(rows))
  }

  const valid = issues.length === 0 && rows.length > 0
  return { issues, rows: valid ? finalizeRows(rows) : rows, valid }
}

export function lintQuestionCsv(file: File | string): Promise<CsvLintResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        resolve(lintQuestionCsvRows(results.data, results.errors))
      },
      error(err) {
        reject(err)
      },
    })
  })
}

export function parseQuestionCsv(file: File | string): Promise<ParsedQuestionRow[]> {
  return lintQuestionCsv(file).then((result) => {
    if (!result.valid) {
      const first = result.issues[0]
      throw new Error(first ? `第 ${first.line} 行：${first.message}` : 'CSV 无效')
    }
    return result.rows
  })
}
