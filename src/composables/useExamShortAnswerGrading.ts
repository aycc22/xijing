import { computed, onUnmounted, ref, type Ref } from 'vue'
import { mergeAiGradeIntoItems, needsAiGrade } from '../lib/aiGrade'
import { invokeAiProxy } from '../lib/aiProxy'
import type { GradedExamItem } from '../lib/examSession'

export interface ExamGradeSession {
  id: string
  result_items: GradedExamItem[]
}

export function useExamShortAnswerGrading<T extends ExamGradeSession>(session: Ref<T | null>) {
  const gradingBusy = ref(false)
  const gradingError = ref('')
  let generation = 0

  onUnmounted(() => {
    generation += 1
  })

  const hasFailedGrades = computed(() =>
    Boolean(
      session.value?.result_items.some(
        (item) => item.snapshot?.qtype === 'short_answer' && item.grading_status === 'failed',
      ),
    ),
  )

  async function applyGradeToSession(questionId: string, force = false) {
    const current = session.value
    if (!current) return
    const gen = generation
    const result = await invokeAiProxy({
      action: 'grade_short_answer',
      session_id: current.id,
      question_id: questionId,
      force,
    })
    if (gen !== generation) return
    if (!result.ok) {
      gradingError.value = result.error.message
      return
    }
    gradingError.value = ''
    if (session.value) {
      session.value = {
        ...session.value,
        result_items: mergeAiGradeIntoItems(session.value.result_items, questionId, {
          grading_status: result.data.grade.grading_status,
          ai_score: result.data.grade.ai_score,
          ai_feedback: result.data.grade.ai_feedback,
        }),
      }
    }
  }

  async function gradePendingShortAnswers(items: GradedExamItem[]) {
    const pending = items.filter((item) =>
      needsAiGrade({ qtype: item.snapshot?.qtype, grading_status: item.grading_status }),
    )
    if (!pending.length) return
    const gen = generation
    gradingBusy.value = true
    gradingError.value = ''
    const started = Date.now()
    for (const item of pending) {
      if (gen !== generation) break
      if (Date.now() - started > 60_000) break
      await applyGradeToSession(item.question_id)
    }
    if (gen === generation) gradingBusy.value = false
  }

  async function retryFailedGrades() {
    const current = session.value
    if (!current) return
    const failed = current.result_items.filter(
      (item) => item.snapshot?.qtype === 'short_answer' && item.grading_status === 'failed',
    )
    const gen = generation
    gradingBusy.value = true
    for (const item of failed) {
      if (gen !== generation) break
      await applyGradeToSession(item.question_id, true)
    }
    if (gen === generation) gradingBusy.value = false
  }

  return {
    gradingBusy,
    gradingError,
    hasFailedGrades,
    gradePendingShortAnswers,
    retryFailedGrades,
  }
}
