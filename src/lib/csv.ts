import Papa from 'papaparse'
import { JUDGEMENT_OPTIONS } from './scoring'
import type { QuestionOption, QuestionType } from './types'

export interface ParsedQuestionRow {
  qtype: QuestionType
  stem: string
  options: QuestionOption[]
  answer_keys: string[]
  explanation: string
}

const OPTION_COLS = ['option_a', 'option_b', 'option_c', 'option_d', 'option_e', 'option_f'] as const
const KEYS = ['A', 'B', 'C', 'D', 'E', 'F'] as const
const JUDGEMENT_ANSWERS = new Set(['TRUE', 'FALSE'])

function normalizeType(raw: string): QuestionType {
  const t = raw.trim().toLowerCase()
  if (t === 'single' || t === '单选') return 'single'
  if (t === 'multiple' || t === '多选') return 'multiple'
  if (t === 'judgement' || t === '判断') return 'judgement'
  if (t === 'case_analysis' || t === '案例分析') {
    throw new Error('案例分析题暂未开放导入，请先使用 single / multiple / judgement')
  }
  throw new Error(`未知题型: ${raw}`)
}

function parseAnswers(raw: string): string[] {
  return raw
    .split(/[;；,，|/\s]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
}

function parseJudgementAnswer(raw: string, line: number): string[] {
  const normalized = raw.trim().toUpperCase()
  if (normalized === '正确') return ['TRUE']
  if (normalized === '错误') return ['FALSE']
  const answer_keys = parseAnswers(raw)
  if (answer_keys.length !== 1 || !JUDGEMENT_ANSWERS.has(answer_keys[0])) {
    throw new Error(`第 ${line} 行判断题答案须为 TRUE 或 FALSE`)
  }
  return answer_keys
}

export function parseQuestionCsv(file: File | string): Promise<ParsedQuestionRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        try {
          if (results.errors.length) {
            reject(new Error(results.errors[0]?.message ?? 'CSV 解析失败'))
            return
          }
          const rows: ParsedQuestionRow[] = results.data.map((row, index) => {
            const line = index + 2
            const stem = (row.stem ?? row['题干'] ?? '').trim()
            if (!stem) throw new Error(`第 ${line} 行缺少 stem（题干）`)

            const qtype = normalizeType(row.type ?? row['题型'] ?? 'single')
            const answerRaw = (row.answer ?? row['答案'] ?? '').trim()
            if (!answerRaw) throw new Error(`第 ${line} 行缺少 answer（答案）`)

            let options: QuestionOption[]
            let answer_keys: string[]

            if (qtype === 'judgement') {
              options = [...JUDGEMENT_OPTIONS]
              answer_keys = parseJudgementAnswer(answerRaw, line)
            } else {
              options = []
              OPTION_COLS.forEach((col, i) => {
                const text = (row[col] ?? '').trim()
                if (text) options.push({ key: KEYS[i], text })
              })
              if (options.length < 2) {
                throw new Error(`第 ${line} 行至少需要 2 个选项`)
              }
              answer_keys = parseAnswers(answerRaw)
              const valid = new Set(options.map((o) => o.key))
              for (const k of answer_keys) {
                if (!valid.has(k)) throw new Error(`第 ${line} 行答案 ${k} 不在选项中`)
              }
              if (qtype === 'single' && answer_keys.length !== 1) {
                throw new Error(`第 ${line} 行单选题答案只能有 1 个`)
              }
              if (qtype === 'multiple' && answer_keys.length < 2) {
                throw new Error(`第 ${line} 行多选题至少 2 个答案`)
              }
            }

            return {
              qtype,
              stem,
              options,
              answer_keys,
              explanation: (row.explanation ?? row['解析'] ?? '').trim(),
            }
          })
          if (!rows.length) reject(new Error('CSV 没有有效题目'))
          else resolve(rows)
        } catch (e) {
          reject(e)
        }
      },
      error(err) {
        reject(err)
      },
    })
  })
}
