<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SessionReviewPlayer from '../components/SessionReviewPlayer.vue'
import AiSessionReportPanel from '../components/AiSessionReportPanel.vue'
import { useAiSessionAnalysis } from '../composables/useAiSessionAnalysis'
import { formatExamDuration, summarizeByType, type GradedExamItem } from '../lib/examSession'
import { computePracticeSummary, verdictForRate } from '../lib/practiceResult'
import { questionTypeLabel } from '../lib/scoring'
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
const paperBankId = ref<string | null>(null)
const loading = ref(true)
const error = ref('')
const analysis = useAiSessionAnalysis()

const summary = computed(() =>
  session.value
    ? computePracticeSummary({
        total_count: session.value.total_count,
        correct_count: session.value.correct_count,
      })
    : { total: 0, correct: 0, wrong: 0, rate: 0 },
)
const verdict = computed(() => verdictForRate(summary.value.rate))
const rows = computed(() => session.value?.result_items ?? [])
const byType = computed(() => summarizeByType(rows.value))

async function load() {
  loading.value = true
  error.value = ''
  const sessionId = String(route.params.sessionId)
  const { data, error: err } = await supabase
    .from('exam_sessions')
    .select('*')
    .eq('id', sessionId)
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
  const { data: paper } = await supabase
    .from('paper_instances')
    .select('bank_id')
    .eq('id', data.paper_id)
    .maybeSingle()
  paperBankId.value = paper?.bank_id ?? null
  loading.value = false

  const analysisRows = resultItems.map((item) => ({
    questionId: item.question_id,
    isCorrect: Boolean(item.is_correct),
    stem: item.snapshot?.stem ?? '',
    qtype: item.snapshot?.qtype ?? '',
  }))
  void analysis.autoAnalyzeOnce('exam', sessionId, analysisRows)
}

onMounted(load)
</script>

<template>
  <div>
    <p v-if="loading" class="px-3 py-16 text-center text-muted">加载结果…</p>
    <p v-else-if="error" class="alert-error">{{ error }}</p>

    <div v-else-if="session" class="flex flex-col gap-6 py-4 md:py-8">
      <section class="relative overflow-hidden py-6 text-center md:py-10">
        <div class="halo pointer-events-none absolute inset-0" aria-hidden="true"></div>
        <p class="page-kicker relative">答题结果</p>
        <p
          class="font-display relative m-0 mt-3 text-[clamp(3rem,16vw,5rem)] leading-none tracking-wide text-ink tabular-nums"
        >
          {{ session.score }}
          <span class="text-[0.4em] text-muted">分</span>
        </p>
        <p class="font-display relative mt-3 text-xl tracking-wide text-spark">{{ verdict }}</p>
        <p class="relative mt-2 text-sm text-muted">
          正确 {{ summary.correct }} / {{ summary.total }} · 正确率 {{ summary.rate }}% · 耗时
          {{ formatExamDuration(session.duration_ms) }}
        </p>
        <div class="path-track relative mx-auto mt-6 max-w-xs">
          <span class="path-fill" :style="{ width: summary.rate + '%' }" />
        </div>
        <ul
          v-if="byType.length"
          class="relative mx-auto mt-5 flex max-w-sm list-none flex-wrap justify-center gap-2 p-0"
        >
          <li
            v-for="row in byType"
            :key="row.qtype"
            class="rounded-xl border border-line bg-raise/50 px-3 py-2 text-xs text-muted"
          >
            {{ questionTypeLabel(row.qtype) }}
            <span class="ml-1 font-semibold tabular-nums text-ink">
              {{ row.correct }}/{{ row.total }}
            </span>
            <span class="text-muted"> · {{ row.rate }}%</span>
          </li>
        </ul>
      </section>

      <AiSessionReportPanel
        :tag-stats="analysis.localTagStats.value"
        :report="analysis.report.value"
        :loading="analysis.loading.value"
        :error="analysis.error.value"
        @regenerate="session && analysis.regenerate('exam', session.id)"
      />

      <SessionReviewPlayer v-if="rows.length" :items="rows" heading="逐题明细" />

      <div class="flex flex-col gap-2.5 sm:mx-auto sm:w-full sm:max-w-sm sm:flex-row sm:flex-wrap">
        <button
          v-if="paperBankId"
          class="btn btn-block"
          type="button"
          @click="router.push(`/banks/${paperBankId}/paper`)"
        >
          再组一卷
        </button>
        <button class="btn-secondary btn-block" type="button" @click="router.push(`/papers/${session.paper_id}`)">
          返回试卷
        </button>
        <button class="btn-secondary btn-block" type="button" @click="router.push('/wrong-book')">
          错题本
        </button>
        <button class="btn-ghost btn-block" type="button" @click="router.push('/banks')">返回题库</button>
      </div>
    </div>
  </div>
</template>
