<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  computePracticeSummary,
  formatAnswerLabel,
  resultStatusLabel,
  verdictForRate,
} from '../lib/practiceResult'
import { parseQuestionSnapshot, type QuestionSnapshot } from '../lib/questionSnapshot'
import { questionTypeLabel } from '../lib/scoring'
import { supabase } from '../lib/supabase'
import type { AttemptSession, QuestionOption } from '../lib/types'

interface ReviewRow {
  questionId: string
  snapshot: QuestionSnapshot
  selected_keys: string[]
  is_correct: boolean
  is_skipped: boolean
}

const route = useRoute()
const router = useRouter()
const session = ref<AttemptSession | null>(null)
const rows = ref<ReviewRow[]>([])
const error = ref('')
const loading = ref(true)

const summary = computed(() =>
  session.value ? computePracticeSummary(session.value) : { total: 0, correct: 0, wrong: 0, rate: 0 },
)
const verdict = computed(() => verdictForRate(summary.value.rate))

function normalizeOptions(raw: unknown): QuestionOption[] {
  if (!Array.isArray(raw)) return []
  return raw.map((o) => o as QuestionOption)
}

async function load() {
  loading.value = true
  error.value = ''
  const sessionId = String(route.params.sessionId)
  const { data: sessionData, error: sessionErr } = await supabase
    .from('attempt_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle()
  if (sessionErr || !sessionData) {
    error.value = sessionErr?.message ?? '结果不存在'
    loading.value = false
    return
  }
  session.value = sessionData as AttemptSession

  const { data: answers, error: answersErr } = await supabase
    .from('attempt_answers')
    .select('question_id, selected_keys, is_correct, is_skipped, question_snapshot, answered_at')
    .eq('session_id', sessionId)
    .order('answered_at', { ascending: true })
  if (answersErr) {
    error.value = answersErr.message
    loading.value = false
    return
  }

  const missingIds: string[] = []
  const parsed: ReviewRow[] = (answers ?? []).map((row) => {
    const snapshot = parseQuestionSnapshot(row.question_snapshot)
    if (!snapshot) missingIds.push(row.question_id)
    return {
      questionId: row.question_id,
      snapshot: snapshot as QuestionSnapshot,
      selected_keys: row.selected_keys ?? [],
      is_correct: row.is_correct,
      is_skipped: row.is_skipped ?? false,
    }
  })

  if (missingIds.length) {
    const { data: questions } = await supabase.from('questions').select('*').in('id', missingIds)
    const byId = new Map((questions ?? []).map((q) => [q.id, q]))
    for (const row of parsed) {
      if (row.snapshot) continue
      const q = byId.get(row.questionId)
      if (!q) continue
      row.snapshot = {
        stem: q.stem,
        qtype: q.qtype,
        options: normalizeOptions(q.options),
        answer_keys: q.answer_keys,
        explanation: q.explanation,
        case_material: q.case_material,
      }
    }
  }

  rows.value = parsed.filter((row) => row.snapshot)
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
        <p class="page-kicker relative">本次结果</p>
        <p
          class="font-display relative m-0 mt-3 text-[clamp(3rem,16vw,5rem)] leading-none tracking-wide text-ink tabular-nums"
        >
          {{ summary.correct }}
          <span class="text-[0.4em] text-muted"> / {{ summary.total }}</span>
        </p>
        <p class="font-display relative mt-3 text-xl tracking-wide text-spark">{{ verdict }}</p>
        <p class="relative mt-2 text-sm text-muted">
          正确率 {{ summary.rate }}% · 错误 {{ summary.wrong }} 题
        </p>
        <div class="path-track relative mx-auto mt-6 max-w-xs">
          <span class="path-fill" :style="{ width: summary.rate + '%' }" />
        </div>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="m-0 text-lg font-semibold text-ink">逐题复盘</h2>
        <details
          v-for="(row, idx) in rows"
          :key="row.questionId"
          class="surface group"
          :open="idx === 0"
        >
          <summary class="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3.5 marker:content-none">
            <div class="min-w-0 flex-1">
              <p class="m-0 text-xs text-muted">
                第 {{ idx + 1 }} 题 · {{ questionTypeLabel(row.snapshot.qtype) }}
              </p>
              <p class="m-0 mt-1 line-clamp-2 text-sm font-medium text-ink">{{ row.snapshot.stem }}</p>
            </div>
            <span
              class="chip shrink-0"
              :class="row.is_correct ? 'border-ok/40 bg-ok/10 text-ok' : row.is_skipped ? 'border-warn/40 bg-warn/10 text-warn' : 'border-bad/40 bg-bad/10 text-bad'"
            >
              {{ resultStatusLabel(row) }}
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
              {{ formatAnswerLabel(row.selected_keys, row.snapshot.qtype, row.snapshot.options) }}
            </p>
            <p class="m-0">
              <span class="font-medium text-muted">标准答案：</span>
              {{ formatAnswerLabel(row.snapshot.answer_keys, row.snapshot.qtype, row.snapshot.options) }}
            </p>
            <p v-if="row.snapshot.explanation" class="alert-info m-0">
              <span class="font-semibold">解析</span> · {{ row.snapshot.explanation }}
            </p>
          </div>
        </details>
      </section>

      <div class="flex flex-col gap-2.5 sm:mx-auto sm:w-full sm:max-w-sm sm:flex-row sm:flex-wrap">
        <button class="btn btn-block" type="button" @click="router.push(`/quiz/${session.bank_id}?new=1`)">
          再刷一遍
        </button>
        <button class="btn-secondary btn-block" type="button" @click="router.push('/history')">
          历史记录
        </button>
        <button class="btn-secondary btn-block" type="button" @click="router.push('/banks')">
          返回题库
        </button>
      </div>
    </div>
  </div>
</template>
