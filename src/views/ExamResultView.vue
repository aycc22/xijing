<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { formatExamDuration, summarizeByType, type GradedExamItem } from '../lib/examSession'
import {
  computePracticeSummary,
  formatAnswerLabel,
  verdictForRate,
} from '../lib/practiceResult'
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
  session.value = {
    ...data,
    result_items: Array.isArray(data.result_items) ? (data.result_items as GradedExamItem[]) : [],
  }
  const { data: paper } = await supabase
    .from('paper_instances')
    .select('bank_id')
    .eq('id', data.paper_id)
    .maybeSingle()
  paperBankId.value = paper?.bank_id ?? null
  loading.value = false
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

      <section class="flex flex-col gap-3">
        <h2 class="m-0 text-lg font-semibold text-ink">逐题明细</h2>
        <details
          v-for="(row, idx) in rows"
          :key="row.question_id"
          class="surface group"
          :open="idx === 0"
        >
          <summary
            class="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3.5 marker:content-none"
          >
            <div class="min-w-0 flex-1">
              <p class="m-0 text-xs text-muted">
                第 {{ idx + 1 }} 题 · {{ questionTypeLabel(row.snapshot.qtype) }} ·
                {{ row.earned }}/{{ row.score }} 分
              </p>
              <p class="m-0 mt-1 line-clamp-2 text-sm font-medium text-ink">{{ row.snapshot.stem }}</p>
            </div>
            <span
              class="chip shrink-0"
              :class="row.is_correct ? 'border-ok/40 bg-ok/10 text-ok' : 'border-bad/40 bg-bad/10 text-bad'"
            >
              {{ row.is_correct ? '正确' : '错误' }}
            </span>
          </summary>
          <div class="flex flex-col gap-3 border-t border-line/60 px-4 py-3.5 text-sm">
            <section
              v-if="row.snapshot.case_material"
              class="rounded-xl border border-line bg-raise/60 px-3 py-3 leading-relaxed"
            >
              <p class="m-0 mb-1 text-xs font-semibold text-muted uppercase">案例材料</p>
              <p class="m-0 whitespace-pre-wrap">{{ row.snapshot.case_material }}</p>
            </section>
            <p class="m-0">
              <span class="font-medium text-muted">你的答案：</span>
              {{
                row.snapshot.qtype === 'short_answer'
                  ? row.selected_keys[0] || '（未作答）'
                  : formatAnswerLabel(row.selected_keys, row.snapshot.qtype, row.snapshot.options)
              }}
            </p>
            <p class="m-0">
              <span class="font-medium text-muted">标准答案：</span>
              {{
                row.snapshot.qtype === 'short_answer'
                  ? row.snapshot.reference_answer || '（无参考答案）'
                  : formatAnswerLabel(row.snapshot.answer_keys, row.snapshot.qtype, row.snapshot.options)
              }}
            </p>
            <p v-if="row.snapshot.explanation" class="alert-info m-0">
              <span class="font-semibold">解析</span> · {{ row.snapshot.explanation }}
            </p>
          </div>
        </details>
      </section>

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
