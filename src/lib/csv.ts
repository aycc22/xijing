import Papa from 'papaparse'
import { validateCaseGroups, type CsvRowIssue } from './case'
import {
  normalizeQuestionType,
  parseAnswerKeys,
  parseJudgementAnswer,
  validateChoiceAnswers,
} from './questionParse'
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

export interface LintParsedOptions {
  emptyMessage?: string
  duplicateUnit?: '行' | '题'
}

const OPTION_COLS = ['option_a', 'option_b', 'option_c', 'option_d', 'option_e', 'option_f'] as const
const KEYS = ['A', 'B', 'C', 'D', 'E', 'F'] as const

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

  const qtype = normalizeQuestionType(row.type ?? row['题型'] ?? 'single')
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
    answer_keys = parseAnswerKeys(answerRaw)
    validateChoiceAnswers(qtype, options, answer_keys)
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

function lintDuplicateExternalIds(
  rows: ParsedQuestionRow[],
  unit: '行' | '题' = '行',
): CsvRowIssue[] {
  const seen = new Map<string, number>()
  const issues: CsvRowIssue[] = []
  for (const row of rows) {
    if (!row.external_id) continue
    const prev = seen.get(row.external_id)
    if (prev !== undefined) {
      issues.push({
        line: row.line,
        message: `external_id「${row.external_id}」与第 ${prev} ${unit}重复`,
      })
    } else {
      seen.set(row.external_id, row.line)
    }
  }
  return issues
}

export function lintParsedQuestionRows(
  rows: ParsedQuestionRow[],
  options: LintParsedOptions = {},
): CsvLintResult {
  const issues: CsvRowIssue[] = []
  const duplicateUnit = options.duplicateUnit ?? '行'
  const emptyMessage = options.emptyMessage ?? '没有有效题目'

  if (!rows.length) {
    issues.push({ line: 0, message: emptyMessage })
  } else {
    issues.push(...validateCaseGroups(rows))
    issues.push(...lintDuplicateExternalIds(rows, duplicateUnit))
  }

  const valid = issues.length === 0 && rows.length > 0
  return { issues, rows: valid ? finalizeRows(rows) : rows, valid }
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
    return { issues, rows, valid: false }
  }

  if (rows.length) {
    const parsed = lintParsedQuestionRows(rows, { duplicateUnit: '行' })
    issues.push(...parsed.issues)
    const valid = issues.length === 0
    return { issues, rows: valid ? parsed.rows : rows, valid }
  }

  return { issues, rows, valid: false }
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
