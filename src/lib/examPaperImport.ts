import type { ParsedQuestionRow } from './csv'
import {
  normalizeExamQuestionType,
  parseAnswerKeys,
  parseJudgementAnswer,
  parseOptionsFromJson,
  validateChoiceAnswers,
} from './questionParse'
import type { QuestionOption } from './types'

export interface ExamMeta {
  title: string
  year?: number
  session?: string
  exam_date?: string
  qualification?: string
  level?: string
  sources?: string[]
  notes?: string
}

export interface ExamPaperBundle {
  schema_version: string
  format: 'xijing-exam-paper'
  exam: ExamMeta
  papers: ExamPaperSection[]
}

export interface ExamPaperSection {
  id: string
  title: string
  subject?: string
  paper_type: 'choice' | 'case'
  duration_minutes: number
  total_score: number
  pass_score: number
  questions?: ExamChoiceQuestion[]
  cases?: ExamCaseBlock[]
}

export interface ExamChoiceQuestion {
  external_id: string
  number: number
  type: 'single' | 'multiple' | 'judgement' | 'cloze'
  score?: number
  stem: string
  passage?: string
  options?: Record<string, string> | string[] | QuestionOption[]
  blanks?: ExamClozeBlank[]
  answer: string
  explanation?: string
}

export interface ExamClozeBlank {
  external_id: string
  number: number
  stem: string
  options: Record<string, string>
  answer: string
}

export interface ExamCaseBlock {
  external_id: string
  number: number
  title: string
  score: number
  material: string
  attachments?: { type?: string; id?: string; description?: string; url?: string }[]
  sub_questions: ExamSubQuestion[]
}

export interface ExamSubQuestion {
  external_id: string
  number: string
  type: 'short_answer' | 'single' | 'multiple' | 'judgement'
  score: number
  stem: string
  options?: Record<string, string>
  answer?: string
  explanation?: string
}

export interface ParsedExamQuestionRow extends ParsedQuestionRow {
  score: number | null
  section: string | null
  attachments: unknown[] | null
  reference_answer: string
}

function buildCaseMaterial(
  material: string,
  attachments?: ExamCaseBlock['attachments'],
): string {
  const parts = [material.trim()]
  if (attachments?.length) {
    const desc = attachments
      .map((a) => (a.description ? `【配图 ${a.id ?? ''}】${a.description}` : ''))
      .filter(Boolean)
      .join('\n')
    if (desc) parts.push(desc)
  }
  return parts.filter(Boolean).join('\n\n')
}

function parseChoiceQuestion(
  q: ExamChoiceQuestion,
  section: string,
  line: number,
): ParsedExamQuestionRow[] {
  if (q.type === 'cloze') {
    const passage = q.passage?.trim() || ''
    const blanks = q.blanks ?? []
    if (!blanks.length) throw new Error(`第 ${q.number} 题 cloze 缺少 blanks`)
    const caseId = q.external_id
    const material = passage || q.stem
    return blanks.map((blank, index) => {
      const options = parseOptionsFromJson(blank.options)
      const answer_keys = parseAnswerKeys(blank.answer)
      validateChoiceAnswers('single', options, answer_keys)
      return {
        line: line + index,
        external_id: blank.external_id,
        qtype: 'single',
        stem: `${q.stem}\n\n${blank.stem}`,
        options,
        answer_keys,
        explanation: q.explanation ?? '',
        case_id: caseId,
        case_material: material,
        score: 1,
        section,
        attachments: null,
        reference_answer: '',
      }
    })
  }

  const qtype = normalizeExamQuestionType(q.type)
  const options = parseOptionsFromJson(q.options)
  let answer_keys: string[]
  if (qtype === 'judgement') {
    answer_keys = parseJudgementAnswer(q.answer)
  } else {
    answer_keys = parseAnswerKeys(q.answer)
    validateChoiceAnswers(qtype, options, answer_keys)
  }

  return [
    {
      line,
      external_id: q.external_id,
      qtype,
      stem: q.stem,
      options,
      answer_keys,
      explanation: q.explanation ?? '',
      case_id: null,
      case_material: '',
      score: q.score ?? 1,
      section,
      attachments: null,
      reference_answer: '',
    },
  ]
}

function parseSubQuestion(
  sq: ExamSubQuestion,
  section: string,
  caseId: string,
  caseMaterial: string,
  line: number,
): ParsedExamQuestionRow {
  const qtype = normalizeExamQuestionType(sq.type)
  const stemPrefix = `【${sq.number}】`
  const stem = sq.stem.startsWith('【') ? sq.stem : `${stemPrefix}${sq.stem}`

  if (qtype === 'short_answer') {
    const reference = (sq.answer ?? '').trim()
    if (!reference) throw new Error(`简答题 ${sq.external_id} 缺少参考答案`)
    return {
      line,
      external_id: sq.external_id,
      qtype: 'short_answer',
      stem,
      options: [],
      answer_keys: [],
      explanation: sq.explanation ?? '',
      case_id: caseId,
      case_material: caseMaterial,
      score: sq.score,
      section,
      attachments: null,
      reference_answer: reference,
    }
  }

  const options = parseOptionsFromJson(sq.options)
  let answer_keys: string[]
  if (qtype === 'judgement') {
    answer_keys = parseJudgementAnswer(sq.answer ?? '')
  } else {
    answer_keys = parseAnswerKeys(sq.answer)
    validateChoiceAnswers(qtype, options, answer_keys)
  }

  return {
    line,
    external_id: sq.external_id,
    qtype,
    stem,
    options,
    answer_keys,
    explanation: sq.explanation ?? '',
    case_id: caseId,
    case_material: caseMaterial,
    score: sq.score,
    section,
    attachments: null,
    reference_answer: '',
  }
}

export function flattenExamPaperBundle(bundle: ExamPaperBundle): ParsedExamQuestionRow[] {
  const rows: ParsedExamQuestionRow[] = []
  let line = 1

  for (const paper of bundle.papers) {
    const section = paper.id
    if (paper.paper_type === 'choice') {
      for (const q of paper.questions ?? []) {
        const parsed = parseChoiceQuestion(q, section, line)
        rows.push(...parsed)
        line += parsed.length
      }
      continue
    }

    for (const block of paper.cases ?? []) {
      const caseMaterial = buildCaseMaterial(block.material, block.attachments)
      for (const sq of block.sub_questions) {
        rows.push(parseSubQuestion(sq, section, block.external_id, caseMaterial, line))
        line += 1
      }
    }
  }

  return rows
}

export function examBankTitle(bundle: ExamPaperBundle): string {
  return bundle.exam.title
}

export function examBankDescription(bundle: ExamPaperBundle): string {
  const parts: string[] = []
  if (bundle.exam.qualification) parts.push(bundle.exam.qualification)
  if (bundle.exam.session) parts.push(bundle.exam.session)
  if (bundle.exam.exam_date) parts.push(bundle.exam.exam_date)
  const paperSummary = bundle.papers
    .map((p) => `${p.title}（${p.paper_type === 'choice' ? '选择题' : '案例'} ${p.total_score} 分）`)
    .join('；')
  if (paperSummary) parts.push(paperSummary)
  if (bundle.exam.notes) parts.push(bundle.exam.notes)
  return parts.join(' · ')
}

export function examMetaPayload(bundle: ExamPaperBundle) {
  return {
    schema_version: bundle.schema_version,
    exam: bundle.exam,
    papers: bundle.papers.map((p) => ({
      id: p.id,
      title: p.title,
      subject: p.subject,
      paper_type: p.paper_type,
      duration_minutes: p.duration_minutes,
      total_score: p.total_score,
      pass_score: p.pass_score,
    })),
  }
}
