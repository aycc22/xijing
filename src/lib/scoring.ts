import { sameAnswerSet, type QuestionOption, type QuestionType } from './types'

export const JUDGEMENT_OPTIONS: QuestionOption[] = [
  { key: 'TRUE', text: '正确' },
  { key: 'FALSE', text: '错误' },
]

export function isSingleChoice(qtype: QuestionType): boolean {
  return qtype === 'single' || qtype === 'judgement'
}

export function isTextAnswer(qtype: QuestionType): boolean {
  return qtype === 'short_answer'
}

export function isAnswerCorrect(selected: string[], answerKeys: string[]): boolean {
  return sameAnswerSet(selected, answerKeys)
}

export function questionTypeLabel(qtype: QuestionType): string {
  switch (qtype) {
    case 'single':
      return '单选'
    case 'multiple':
      return '多选'
    case 'judgement':
      return '判断'
    case 'case_analysis':
      return '案例'
    case 'short_answer':
      return '简答'
  }
}

export function toggleSelection(selected: string[], key: string, qtype: QuestionType): string[] {
  if (isSingleChoice(qtype)) return [key]
  if (selected.includes(key)) return selected.filter((k) => k !== key)
  return [...selected, key]
}

export function ensureQuestionOptions(qtype: QuestionType, options: QuestionOption[]): QuestionOption[] {
  if (qtype === 'judgement' && options.length === 0) return [...JUDGEMENT_OPTIONS]
  return options
}

export function optionRevealClass(
  key: string,
  selected: string[],
  answerKeys: string[],
  revealed: boolean,
): '' | 'option-selected' | 'option-correct' | 'option-wrong' {
  if (!revealed) {
    return selected.map((k) => k.toUpperCase()).includes(key.toUpperCase()) ? 'option-selected' : ''
  }
  const isAnswer = answerKeys.map((k) => k.toUpperCase()).includes(key.toUpperCase())
  const picked = selected.map((k) => k.toUpperCase()).includes(key.toUpperCase())
  if (isAnswer) return 'option-correct'
  if (picked) return 'option-wrong'
  return ''
}
