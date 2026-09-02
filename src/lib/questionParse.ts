import { JUDGEMENT_OPTIONS } from './scoring'
import type { QuestionOption, QuestionType } from './types'

const JUDGEMENT_ANSWERS = new Set(['TRUE', 'FALSE'])
const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const

export function normalizeQuestionType(raw: string): QuestionType {
  const t = raw.trim().toLowerCase()
  if (t === 'single' || t === '单选') return 'single'
  if (t === 'multiple' || t === '多选') return 'multiple'
  if (t === 'judgement' || t === '判断') return 'judgement'
  if (t === 'case' || t === 'case_analysis' || t === '案例分析') {
    throw new Error('案例小题请使用 single / multiple / judgement，并填写 case_id')
  }
  throw new Error(`未知题型: ${raw}`)
}

export function parseAnswerKeysFromString(raw: string): string[] {
  return raw
    .split(/[;；,，|/\s]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
}

export function parseJudgementAnswer(raw: string): string[] {
  const normalized = raw.trim().toUpperCase()
  if (normalized === '正确') return ['TRUE']
  if (normalized === '错误') return ['FALSE']
  const answer_keys = parseAnswerKeysFromString(raw)
  if (answer_keys.length !== 1 || !JUDGEMENT_ANSWERS.has(answer_keys[0])) {
    throw new Error('判断题答案须为 TRUE 或 FALSE')
  }
  return answer_keys
}

export function parseAnswerKeys(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    const answer_keys = raw.map((item) => String(item).trim().toUpperCase()).filter(Boolean)
    if (!answer_keys.length) throw new Error('缺少 answer（答案）')
    return answer_keys
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) throw new Error('缺少 answer（答案）')
    return parseAnswerKeysFromString(trimmed)
  }
  throw new Error('缺少 answer（答案）')
}

export function validateChoiceAnswers(
  qtype: QuestionType,
  options: QuestionOption[],
  answer_keys: string[],
): void {
  if (options.length < 2) throw new Error('至少需要 2 个选项')
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

export function parseOptionsFromJson(raw: unknown): QuestionOption[] {
  if (raw === undefined || raw === null) return []
  if (Array.isArray(raw)) {
    if (!raw.length) return []
    const first = raw[0]
    if (typeof first === 'string') {
      return raw
        .map((text, index) => ({ key: OPTION_KEYS[index], text: String(text).trim() }))
        .filter((option) => option.text)
    }
    if (typeof first === 'object' && first !== null && 'key' in first && 'text' in first) {
      return raw
        .map((item) => {
          const option = item as { key: string; text: string }
          return { key: String(option.key).trim().toUpperCase(), text: String(option.text).trim() }
        })
        .filter((option) => option.key && option.text)
    }
    throw new Error('options 数组格式无效')
  }
  if (typeof raw === 'object') {
    return Object.entries(raw as Record<string, unknown>)
      .map(([key, text]) => ({ key: key.trim().toUpperCase(), text: String(text).trim() }))
      .filter((option) => option.key && option.text)
      .sort((a, b) => a.key.localeCompare(b.key))
  }
  throw new Error('options 格式无效')
}

export function judgementOptions(): QuestionOption[] {
  return [...JUDGEMENT_OPTIONS]
}

/** 解析导入序号：「序号」为 1 起算的用户题号，sort_order 为 0 起算的数据库排序值 */
export function parseImportSortOrder(raw: unknown, mode: '序号' | 'sort_order'): number {
  if (raw === undefined || raw === null || raw === '') {
    throw new Error(mode === '序号' ? '序号不能为空' : 'sort_order 不能为空')
  }
  const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw).trim(), 10)
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    throw new Error(mode === '序号' ? '序号须为正整数' : 'sort_order 须为非负整数')
  }
  if (mode === '序号') {
    if (n < 1) throw new Error('序号须从 1 开始')
    return n - 1
  }
  if (n < 0) throw new Error('sort_order 须为非负整数')
  return n
}

export function readImportSortOrder(
  record: Record<string, unknown>,
): number | null {
  const seq = record['序号']
  if (seq !== undefined && seq !== null && String(seq).trim() !== '') {
    return parseImportSortOrder(seq, '序号')
  }
  for (const key of ['sort_order', '排序', 'order', 'no']) {
    const raw = record[key]
    if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
      return parseImportSortOrder(raw, 'sort_order')
    }
  }
  return null
}
