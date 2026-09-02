import {
  lintParsedQuestionRows,
  type CsvLintResult,
  type ParsedQuestionRow,
} from './csv'
import {
  judgementOptions,
  normalizeQuestionType,
  parseAnswerKeys,
  parseJudgementAnswer,
  parseOptionsFromJson,
  validateChoiceAnswers,
} from './questionParse'

export interface JsonImportMeta {
  title?: string
  description?: string
}

function readStringField(item: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = item[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function readNullableStringField(item: Record<string, unknown>, ...keys: string[]): string | null {
  const value = readStringField(item, ...keys)
  return value || null
}

export function parseQuestionJsonItem(item: unknown, index: number): ParsedQuestionRow {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    throw new Error('题目必须是对象')
  }

  const row = item as Record<string, unknown>
  const line = index + 1
  const stem = readStringField(row, 'stem', '题干')
  if (!stem) throw new Error('缺少 stem（题干）')

  const typeRaw = row.type ?? row['题型']
  if (typeof typeRaw !== 'string' || !typeRaw.trim()) {
    throw new Error('缺少 type（题型）')
  }
  const qtype = normalizeQuestionType(typeRaw)

  let options = parseOptionsFromJson(row.options)
  let answer_keys: string[]

  if (qtype === 'judgement') {
    if (!options.length) options = judgementOptions()
    const answerRaw = row.answer ?? row['答案']
    if (typeof answerRaw === 'string') {
      answer_keys = parseJudgementAnswer(answerRaw)
    } else if (Array.isArray(answerRaw)) {
      answer_keys = parseJudgementAnswer(answerRaw.map(String).join(';'))
    } else {
      throw new Error('缺少 answer（答案）')
    }
  } else {
    answer_keys = parseAnswerKeys(row.answer ?? row['答案'])
    validateChoiceAnswers(qtype, options, answer_keys)
  }

  return {
    line,
    external_id: readNullableStringField(row, 'external_id', '外部标识'),
    qtype,
    stem,
    options,
    answer_keys,
    explanation: readStringField(row, 'explanation', '解析'),
    case_id: readNullableStringField(row, 'case_id', '案例标识'),
    case_material: readStringField(row, 'case_material', '案例材料'),
  }
}

function extractQuestionsPayload(parsed: unknown): { questions: unknown[]; meta: JsonImportMeta } {
  if (Array.isArray(parsed)) {
    return { questions: parsed, meta: {} }
  }
  if (parsed && typeof parsed === 'object') {
    const root = parsed as Record<string, unknown>
    if (Array.isArray(root.questions)) {
      return {
        questions: root.questions,
        meta: {
          title: typeof root.title === 'string' ? root.title.trim() : undefined,
          description: typeof root.description === 'string' ? root.description.trim() : undefined,
        },
      }
    }
  }
  throw new Error('根节点须为题目数组，或包含 questions 数组的对象')
}

export function lintQuestionJson(text: string): CsvLintResult & { meta?: JsonImportMeta } {
  const trimmed = text.trim()
  if (!trimmed) {
    return {
      issues: [{ line: 0, message: '请粘贴 JSON 文本' }],
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

  let questions: unknown[]
  let meta: JsonImportMeta = {}
  try {
    const extracted = extractQuestionsPayload(parsed)
    questions = extracted.questions
    meta = extracted.meta
  } catch (e) {
    return {
      issues: [{ line: 0, message: e instanceof Error ? e.message : 'JSON 结构无效' }],
      rows: [],
      valid: false,
    }
  }

  const issues = []
  const rows: ParsedQuestionRow[] = []
  for (let index = 0; index < questions.length; index++) {
    try {
      rows.push(parseQuestionJsonItem(questions[index], index))
    } catch (e) {
      issues.push({
        line: index + 1,
        message: e instanceof Error ? e.message : '题目解析失败',
      })
    }
  }

  const linted = lintParsedQuestionRows(rows, {
    emptyMessage: 'JSON 没有有效题目',
    duplicateUnit: '题',
  })

  return {
    issues: [...issues, ...linted.issues],
    rows: linted.rows,
    valid: issues.length === 0 && linted.valid,
    meta,
  }
}

export function parseQuestionJson(text: string): ParsedQuestionRow[] {
  const result = lintQuestionJson(text)
  if (!result.valid) {
    const first = result.issues[0]
    throw new Error(first ? `第 ${first.line} 题：${first.message}` : 'JSON 无效')
  }
  return result.rows
}
