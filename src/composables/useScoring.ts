import {
  isAnswerCorrect,
  isSingleChoice,
  JUDGEMENT_OPTIONS,
  optionRevealClass,
  questionTypeLabel,
  toggleSelection,
} from '../lib/scoring'

export function useScoring() {
  return {
    isAnswerCorrect,
    isSingleChoice,
    JUDGEMENT_OPTIONS,
    optionRevealClass,
    questionTypeLabel,
    toggleSelection,
  }
}
