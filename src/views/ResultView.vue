<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import SessionReviewPlayer from '../components/SessionReviewPlayer.vue'
import AiSessionReportPanel from '../components/AiSessionReportPanel.vue'
import { useAiSessionAnalysis } from '../composables/useAiSessionAnalysis'
import { computePracticeSummary, toPracticeReviewItems, verdictForRate } from '../lib/practiceResult'
import { formatErrorMessage } from '../lib/errors'
import { parseQuestionSnapshot } from '../lib/questionSnapshot'
import { supabase } from '../lib/supabase'
import type { AttemptSession } from '../lib/types'

const route = useRoute()
const router = useRouter()
const session = ref<AttemptSession | null>(null)
const bankTitle = ref('')
const reviews = ref(toPracticeReviewItems([]))
const error = ref('')
const loading = ref(true)
const analysis = useAiSessionAnalysis()

const summary = computed(() =>
  session.value
    ? computePracticeSummary(session.value)
    : { total: 0, correct: 0, wrong: 0, rate: 0 },
)
const verdict = computed(() => verdictForRate(summary.value.rate))

async function load() {
  loading.value = true
  error.value = ''
  const sessionId = String(route.params.sessionId)
  const { data, error: err } = await supabase
    .from('attempt_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle()
  if (err || !data) {
    error.value = formatErrorMessage(err, '结果不存在')
    loading.value = false
    return
  }
  session.value = data as AttemptSession

  const { data: answers, error: aErr } = await supabase
    .from('attempt_answers')
    .select('question_id, selected_keys, is_correct, is_skipped, question_snapshot, answered_at')
    .eq('session_id', sessionId)
    .order('answered_at', { ascending: true })
  if (aErr) error.value = formatErrorMessage(aErr, '无法加载逐题明细')
  else reviews.value = toPracticeReviewItems(answers ?? [])

  const { data: bank } = await supabase
    .from('question_banks')
    .select('title')
    .eq('id', data.bank_id)
    .maybeSingle()
  bankTitle.value = bank?.title ?? ''
  loading.value = false

  const rows = (answers ?? []).map((row) => {
    const snapshot = parseQuestionSnapshot(row.question_snapshot)
    return {
      questionId: row.question_id as string,
      isCorrect: Boolean(row.is_correct),
      isSkipped: Boolean(row.is_skipped),
      stem: snapshot?.stem ?? '',
      qtype: snapshot?.qtype ?? '',
    }
  })
  void analysis.autoAnalyzeOnce('practice', sessionId, rows)
}

onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-6 py-4 md:py-8">
    <p v-if="loading" class="px-3 py-16 text-center text-muted">加载结果…</p>
    <p v-else-if="error && !session" class="alert-error">{{ error }}</p>

    <template v-else-if="session">
      <section class="relative overflow-hidden py-6 text-center md:py-10">
        <div class="halo pointer-events-none absolute inset-0" aria-hidden="true"></div>
        <p class="page-kicker relative m-0 max-w-[80vw] truncate">
          本次结果<template v-if="bankTitle"> · {{ bankTitle }}</template>
        </p>
        <p
          class="font-display relative m-0 mt-4 text-[clamp(3.5rem,18vw,5.5rem)] leading-none tracking-wide text-ink tabular-nums"
        >
          {{ summary.correct }}<span class="text-[0.38em] text-muted"> / {{ summary.total }}</span>
        </p>
        <p class="font-display relative m-0 mt-3 text-xl tracking-wide text-spark">{{ verdict }}</p>
        <div class="path-track relative mx-auto mt-6 w-full max-w-2xs">
          <span class="path-fill" :style="{ width: summary.rate + '%' }" />
        </div>
        <dl class="relative m-0 mt-8 flex justify-center divide-x divide-line/70">
          <div class="flex flex-col items-center gap-1 px-5 pl-0 sm:px-7">
            <dd class="m-0 text-2xl font-semibold text-ok tabular-nums">{{ summary.correct }}</dd>
            <dt class="text-xs tracking-widest text-muted">正确</dt>
          </div>
          <div class="flex flex-col items-center gap-1 px-5 sm:px-7">
            <dd
              class="m-0 text-2xl font-semibold tabular-nums"
              :class="summary.wrong ? 'text-bad' : 'text-ink'"
            >
              {{ summary.wrong }}
            </dd>
            <dt class="text-xs tracking-widest text-muted">错误</dt>
          </div>
          <div class="flex flex-col items-center gap-1 px-5 pr-0 sm:px-7">
            <dd class="m-0 text-2xl font-semibold text-ink tabular-nums">{{ summary.rate }}%</dd>
            <dt class="text-xs tracking-widest text-muted">正确率</dt>
          </div>
        </dl>
      </section>

      <p v-if="error" class="alert-error m-0">{{ error }}</p>
      <AiSessionReportPanel
        :tag-stats="analysis.localTagStats.value"
        :report="analysis.report.value"
        :loading="analysis.loading.value"
        :error="analysis.error.value"
        @regenerate="analysis.regenerate('practice', session.id)"
      />
      <SessionReviewPlayer v-if="reviews.length" :items="reviews" heading="逐题复盘" />

      <div class="relative mt-2 flex w-full max-w-2xs flex-col items-center gap-5 self-center">
        <button
          class="btn w-full"
          type="button"
          @click="router.push(`/quiz/${session.bank_id}?new=1`)"
        >
          再刷一遍
        </button>
        <nav class="flex items-center gap-6" aria-label="更多去向">
          <RouterLink class="flex items-center gap-1.5 text-sm text-muted transition hover:text-spark" to="/history">
            历史记录
          </RouterLink>
          <span class="size-1 rounded-full bg-line" aria-hidden="true"></span>
          <RouterLink class="flex items-center gap-1.5 text-sm text-muted transition hover:text-spark" to="/banks">
            返回题库
          </RouterLink>
        </nav>
      </div>
    </template>
  </div>
</template>
