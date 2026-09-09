<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import CaseMaterialPanel from '../components/CaseMaterialPanel.vue'
import {
  computePracticeSummary,
  formatAnswerLabel,
  resultStatusLabel,
  resultStatusSymbol,
  toPracticeReviewItems,
  verdictForRate,
} from '../lib/practiceResult'
import { formatErrorMessage } from '../lib/errors'
import { questionTypeLabel } from '../lib/scoring'
import { supabase } from '../lib/supabase'
import type { AttemptSession } from '../lib/types'

const route = useRoute()
const router = useRouter()
const session = ref<AttemptSession | null>(null)
const bankTitle = ref('')
const reviews = ref(toPracticeReviewItems([]))
const error = ref('')
const loading = ref(true)

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

      <section v-if="reviews.length" class="flex flex-col gap-3">
        <h2 class="m-0 text-lg font-semibold text-ink">逐题复盘</h2>
        <p v-if="error" class="alert-error m-0">{{ error }}</p>
        <details
          v-for="(row, idx) in reviews"
          :key="row.question_id + idx"
          class="surface group"
          :open="idx === 0"
        >
          <summary
            class="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3.5 marker:content-none"
          >
            <div class="min-w-0 flex-1">
              <p class="m-0 text-xs text-muted">
                第 {{ idx + 1 }} 题
                <template v-if="row.snapshot"> · {{ questionTypeLabel(row.snapshot.qtype) }}</template>
              </p>
              <p class="m-0 mt-1 line-clamp-2 text-sm font-medium text-ink">
                {{ row.snapshot?.stem || '（题目快照不可用）' }}
              </p>
            </div>
            <span
              class="chip shrink-0"
              :class="
                row.is_skipped
                  ? 'border-warn/40 bg-warn/10 text-warn'
                  : row.is_correct
                    ? 'border-ok/40 bg-ok/10 text-ok'
                    : 'border-bad/40 bg-bad/10 text-bad'
              "
            >
              {{ resultStatusSymbol(row) }} {{ resultStatusLabel(row) }}
            </span>
          </summary>
          <div class="flex flex-col gap-3 border-t border-line/60 px-4 py-3.5 text-sm">
            <CaseMaterialPanel v-if="row.snapshot?.case_material" :material="row.snapshot.case_material" />
            <ul v-if="row.snapshot?.options?.length" class="m-0 list-none space-y-1 p-0 text-muted">
              <li v-for="opt in row.snapshot.options" :key="opt.key">
                <span class="font-medium text-ink">{{ opt.key }}.</span> {{ opt.text }}
              </li>
            </ul>
            <p class="m-0">
              <span class="font-medium text-muted">你的答案：</span>
              {{
                row.snapshot
                  ? formatAnswerLabel(row.selected_keys, row.snapshot.qtype, row.snapshot.options)
                  : row.selected_keys.join('、') || '未作答'
              }}
            </p>
            <p v-if="row.snapshot" class="m-0">
              <span class="font-medium text-muted">标准答案：</span>
              {{ formatAnswerLabel(row.snapshot.answer_keys, row.snapshot.qtype, row.snapshot.options) }}
            </p>
            <p v-if="row.snapshot?.explanation" class="alert-info m-0">
              <span class="font-semibold">解析</span> · {{ row.snapshot.explanation }}
            </p>
          </div>
        </details>
      </section>

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
