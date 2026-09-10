<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import SessionReviewPlayer from '../components/SessionReviewPlayer.vue'
import { useExamShortAnswerGrading } from '../composables/useExamShortAnswerGrading'
import type { GradedExamItem } from '../lib/examSession'
import { examResultPath } from '../lib/history'
import { supabase } from '../lib/supabase'

interface ExamSessionRow {
  id: string
  paper_id: string
  score: number
  correct_count: number
  total_count: number
  duration_ms: number
  finished_at: string | null
  result_items: GradedExamItem[]
}

const route = useRoute()
const router = useRouter()
const session = ref<ExamSessionRow | null>(null)
const loading = ref(true)
const error = ref('')
const {
  gradingBusy,
  gradingError,
  hasFailedGrades,
  gradePendingShortAnswers,
  retryFailedGrades,
} = useExamShortAnswerGrading(session)

const sessionId = computed(() => String(route.params.sessionId))
const backPath = computed(() => examResultPath(sessionId.value))
const rows = computed(() => session.value?.result_items ?? [])

async function load() {
  loading.value = true
  error.value = ''
  const id = sessionId.value
  const { data, error: err } = await supabase
    .from('exam_sessions')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (err || !data) {
    error.value = err?.message ?? '结果不存在'
    loading.value = false
    return
  }
  if (!data.finished_at) {
    await router.replace(`/exam/${data.paper_id}`)
    return
  }
  const resultItems = Array.isArray(data.result_items) ? (data.result_items as GradedExamItem[]) : []
  session.value = {
    ...data,
    result_items: resultItems,
  }
  loading.value = false
  void gradePendingShortAnswers(resultItems)
}

onMounted(load)
</script>

<template>
  <div>
    <p v-if="loading" class="px-3 py-16 text-center text-muted">加载复盘…</p>
    <p v-else-if="error" class="alert-error">{{ error }}</p>

    <template v-else-if="session">
      <p v-if="gradingBusy" class="m-0 mb-2 text-center text-xs text-muted">
        正在生成简答 AI 评分（仅供参考）…
      </p>
      <p v-if="gradingError" class="alert-warn m-0 mb-2">{{ gradingError }}</p>
      <button
        v-if="hasFailedGrades"
        class="btn-secondary mx-auto mb-2 min-h-9 px-3 text-sm"
        type="button"
        :disabled="gradingBusy"
        @click="retryFailedGrades"
      >
        重试失败的 AI 评分
      </button>

      <SessionReviewPlayer
        v-if="rows.length"
        :items="rows"
        :session-id="session.id"
        session-type="exam"
        :finish-to="backPath"
      />
      <div v-else class="surface py-14 text-center">
        <p class="m-0 font-medium text-ink">没有可复盘的题目</p>
        <RouterLink class="btn mt-6 inline-flex" :to="backPath">返回结果</RouterLink>
      </div>
    </template>
  </div>
</template>
