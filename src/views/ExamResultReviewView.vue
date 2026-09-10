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
  <div class="flex flex-col gap-5 py-4 md:py-8">
    <div>
      <RouterLink
        class="inline-flex items-center gap-1 text-sm text-muted transition hover:text-spark"
        :to="backPath"
      >
        ← 返回本次结果
      </RouterLink>
      <p class="page-kicker mt-4">复盘</p>
      <h1 class="page-title">逐题明细</h1>
      <p v-if="session" class="page-lede">
        得分 {{ session.score }} · 正确 {{ session.correct_count }} / {{ session.total_count }}
      </p>
    </div>

    <p v-if="loading" class="px-3 py-16 text-center text-muted">加载复盘…</p>
    <p v-else-if="error" class="alert-error">{{ error }}</p>

    <template v-else-if="session">
      <p v-if="gradingBusy" class="m-0 text-center text-sm text-muted">
        正在生成简答 AI 评分（仅供参考）…
      </p>
      <p v-if="gradingError" class="alert-warn m-0">{{ gradingError }}</p>
      <button
        v-if="hasFailedGrades"
        class="btn-secondary mx-auto min-h-11"
        type="button"
        :disabled="gradingBusy"
        @click="retryFailedGrades"
      >
        重试失败的 AI 评分
      </button>

      <SessionReviewPlayer
        v-if="rows.length"
        :items="rows"
        heading="题目"
        :session-id="session.id"
        session-type="exam"
      />
      <div v-else class="surface py-14 text-center">
        <p class="m-0 font-medium text-ink">没有可复盘的题目</p>
        <RouterLink class="btn mt-6 inline-flex" :to="backPath">返回结果</RouterLink>
      </div>
    </template>
  </div>
</template>
