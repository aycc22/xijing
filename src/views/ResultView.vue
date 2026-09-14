<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AiSessionReportPanel from '../components/AiSessionReportPanel.vue'
import { useAiSessionAnalysis } from '../composables/useAiSessionAnalysis'
import { formatExamDuration } from '../lib/examSession'
import { computePracticeSummary, computePracticeSummaryFromAnswers, verdictForRate } from '../lib/practiceResult'
import { formatErrorMessage } from '../lib/errors'
import { practiceReviewPath } from '../lib/history'
import { parseQuestionSnapshot } from '../lib/questionSnapshot'
import { supabase } from '../lib/supabase'
import type { AttemptSession } from '../lib/types'

const route = useRoute()
const router = useRouter()
const session = ref<AttemptSession | null>(null)
const bankTitle = ref('')
const error = ref('')
const loading = ref(true)
const analysis = useAiSessionAnalysis()
const answerRows = ref<{ is_correct: boolean; is_skipped: boolean }[]>([])

const summary = computed(() =>
  session.value
    ? computePracticeSummaryFromAnswers(session.value.total_count, answerRows.value)
    : computePracticeSummary({ total_count: 0, correct_count: 0 }),
)
const verdict = computed(() => verdictForRate(summary.value.rate))
const coverage = computed(() =>
  summary.value.total ? Math.round((summary.value.answered / summary.value.total) * 100) : 0,
)
const durationLabel = computed(() => {
  if (!session.value?.started_at || !session.value.finished_at) return ''
  const ms = Date.parse(session.value.finished_at) - Date.parse(session.value.started_at)
  if (!Number.isFinite(ms) || ms < 0) return ''
  return formatExamDuration(ms)
})
const encouragement = computed(() =>
  summary.value.answered < 5
    ? '刚刚起步，样本还小，继续练几题就能看清你的节奏。'
    : '稳住节奏，错的地方复盘一遍就过去了。',
)
const correctShare = computed(() =>
  summary.value.total ? (summary.value.correct / summary.value.total) * 100 : 0,
)
const wrongShare = computed(() =>
  summary.value.total ? (summary.value.wrong / summary.value.total) * 100 : 0,
)

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
  if (aErr) error.value = formatErrorMessage(aErr, '无法加载作答记录')

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
  answerRows.value = rows.map((row) => ({
    is_correct: row.isCorrect,
    is_skipped: row.isSkipped,
  }))
  void analysis.autoAnalyzeOnce('practice', sessionId, rows)
}

onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-5 py-2 md:py-6">
    <p v-if="loading" class="px-3 py-16 text-center text-muted">加载结果…</p>
    <p v-else-if="error && !session" class="alert-error">{{ error }}</p>

    <template v-else-if="session">
      <div>
        <p v-if="bankTitle" class="m-0 truncate text-sm text-muted">{{ bankTitle }} · 本次结果</p>
        <h1 class="mt-1 m-0 text-xl font-semibold tracking-wide text-ink">本次练习完成</h1>
        <p class="mt-1 m-0 text-sm leading-relaxed text-muted">{{ encouragement }}</p>
      </div>

      <section
        aria-labelledby="score-heading"
        class="rounded-2xl border border-spark/20 bg-surface p-5"
      >
        <h2 id="score-heading" class="sr-only">本次成绩</h2>
        <div class="flex items-end justify-between gap-4">
          <div>
            <p class="m-0 text-xs tracking-wide text-muted">正确率（按已作答）</p>
            <p class="mt-1 m-0 flex items-baseline gap-1 font-mono">
              <span class="text-5xl leading-none font-semibold text-spark tabular-nums">{{ summary.rate }}</span>
              <span class="text-xl text-spark/70">%</span>
            </p>
            <p class="mt-2 m-0 font-mono text-sm text-ink/80">
              正确 {{ summary.correct }} / 已作答 {{ summary.answered }}
            </p>
            <p class="mt-1 m-0 text-sm text-spark">{{ verdict }}</p>
          </div>
          <p
            v-if="durationLabel"
            class="mb-1 inline-flex items-center gap-1.5 rounded-full bg-raise px-2.5 py-1 text-xs text-muted"
          >
            <svg class="size-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.6" />
              <path d="M12 8v4.5l3 1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>
            {{ durationLabel }}
          </p>
        </div>

        <div class="mt-5 space-y-2">
          <div
            class="flex h-2 w-full overflow-hidden rounded-full bg-raise"
            role="img"
            :aria-label="`共 ${summary.total} 题，正确 ${summary.correct} 题，错误 ${summary.wrong} 题，未作答 ${summary.unanswered} 题`"
          >
            <span class="h-full bg-spark" :style="{ width: correctShare + '%' }" />
            <span class="h-full bg-bad" :style="{ width: wrongShare + '%' }" />
          </div>
          <p class="m-0 text-xs text-muted">
            本次已覆盖题库 {{ coverage }}%（{{ summary.answered }} / {{ summary.total }} 题），其余尚未作答，不计入正确率。
          </p>
        </div>

        <dl class="mt-5 grid grid-cols-3 gap-2">
          <div class="rounded-xl bg-raise/70 px-3 py-2.5 text-center">
            <dt class="text-xs text-muted">正确</dt>
            <dd class="mt-0.5 m-0 font-mono text-xl font-semibold text-spark tabular-nums">{{ summary.correct }}</dd>
          </div>
          <div class="rounded-xl bg-raise/70 px-3 py-2.5 text-center">
            <dt class="text-xs text-muted">错误</dt>
            <dd
              class="mt-0.5 m-0 font-mono text-xl font-semibold tabular-nums"
              :class="summary.wrong ? 'text-bad' : 'text-ink'"
            >
              {{ summary.wrong }}
            </dd>
          </div>
          <div class="rounded-xl bg-raise/70 px-3 py-2.5 text-center">
            <dt class="text-xs text-muted">未作答</dt>
            <dd class="mt-0.5 m-0 font-mono text-xl font-semibold text-muted tabular-nums">
              {{ summary.unanswered }}
            </dd>
          </div>
        </dl>
      </section>

      <p v-if="error" class="alert-error m-0">{{ error }}</p>

      <div class="flex flex-col gap-2.5">
        <RouterLink
          v-if="summary.answered"
          class="btn w-full"
          :to="practiceReviewPath(session.id)"
        >
          查看逐题复盘
        </RouterLink>
        <RouterLink class="btn-secondary w-full" to="/banks">返回题库</RouterLink>
        <nav class="flex items-center justify-center gap-6 pt-1" aria-label="更多去向">
          <button
            class="cursor-pointer border-0 bg-transparent p-0 text-sm text-muted transition hover:text-spark"
            type="button"
            @click="router.push(`/quiz/${session.bank_id}?new=1`)"
          >
            再刷一遍
          </button>
          <span class="size-1 rounded-full bg-line" aria-hidden="true"></span>
          <RouterLink class="text-sm text-muted transition hover:text-spark" to="/history">历史记录</RouterLink>
        </nav>
      </div>

      <AiSessionReportPanel
        :tag-stats="analysis.localTagStats.value"
        :report="analysis.report.value"
        :loading="analysis.loading.value"
        :error="analysis.error.value"
        @regenerate="analysis.regenerate('practice', session.id)"
      />

      <p class="pt-1 text-center text-xs text-muted/60">习径 · 每次一点点</p>
    </template>
  </div>
</template>
