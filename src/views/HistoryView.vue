<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  computeHistoryStats,
  detailPathForSession,
  historyResultText,
  historyStatusLabel,
  mergeHistorySessions,
  modeLabel,
  partitionHistory,
  sessionHistoryStatus,
  type HistorySession,
  type HistoryStatus,
  type SessionMode,
} from '../lib/history'
import { expireStaleSessions } from '../composables/usePracticeProgress'
import { formatErrorMessage } from '../lib/errors'
import { supabase } from '../lib/supabase'
import { useAuth } from '../composables/useAuth'

const auth = useAuth()
const router = useRouter()

type Tab = 'in_progress' | 'finished' | 'expired'

const sessions = ref<HistorySession[]>([])
const tab = ref<Tab>('in_progress')
const loading = ref(true)
const error = ref('')

const parts = computed(() => partitionHistory(sessions.value))
const stats = computed(() => computeHistoryStats(sessions.value))
const visible = computed(() => {
  if (tab.value === 'finished') return parts.value.finished
  if (tab.value === 'expired') return parts.value.expired
  return parts.value.inProgress
})

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusChipClass(status: HistoryStatus) {
  if (status === 'finished') return 'border-ok/40 bg-ok/10 text-ok'
  if (status === 'expired') return 'border-line bg-raise/70 text-muted'
  return 'border-spark/40 bg-spark/10 text-spark'
}

function openSession(session: HistorySession) {
  router.push(detailPathForSession(session))
}

function bankTitleFromJoin(raw: unknown): string {
  const bank = (Array.isArray(raw) ? raw[0] : raw) as { title?: string } | null
  return bank?.title ?? '未命名题库'
}

async function loadPractice(): Promise<HistorySession[]> {
  if (!auth.user.value) return []
  const { data, error: err } = await supabase
    .from('attempt_sessions')
    .select(
      'id, bank_id, mode, total_count, correct_count, current_index, started_at, finished_at, expired_at, question_banks!inner(title)',
    )
    .eq('user_id', auth.user.value.id)
    .order('started_at', { ascending: false })
  if (err) throw err
  return (data ?? []).map((row) => ({
    id: row.id,
    bank_id: row.bank_id,
    bank_title: bankTitleFromJoin(row.question_banks),
    mode: ((row.mode as SessionMode) || 'practice') as SessionMode,
    kind: 'practice' as const,
    paper_id: null,
    total_count: row.total_count,
    correct_count: row.correct_count,
    current_index: row.current_index ?? 0,
    started_at: row.started_at,
    finished_at: row.finished_at,
    expired_at: row.expired_at,
  }))
}

async function loadExams(): Promise<HistorySession[]> {
  if (!auth.user.value) return []
  const { data, error: err } = await supabase
    .from('exam_sessions')
    .select(
      'id, paper_id, total_count, correct_count, current_index, started_at, finished_at, paper_instances!inner(bank_id, question_banks!inner(title))',
    )
    .eq('user_id', auth.user.value.id)
    .order('started_at', { ascending: false })
  if (err) throw err
  return (data ?? []).map((row) => {
    const paper = (Array.isArray(row.paper_instances) ? row.paper_instances[0] : row.paper_instances) as {
      bank_id: string
      question_banks: unknown
    } | null
    return {
      id: row.id,
      bank_id: paper?.bank_id ?? '',
      bank_title: bankTitleFromJoin(paper?.question_banks),
      mode: 'exam' as const,
      kind: 'exam' as const,
      paper_id: row.paper_id,
      total_count: row.total_count,
      correct_count: row.correct_count,
      current_index: row.current_index ?? 0,
      started_at: row.started_at,
      finished_at: row.finished_at,
      expired_at: null,
    }
  })
}

async function load() {
  loading.value = true
  error.value = ''
  if (!auth.user.value) {
    error.value = '请先登录'
    loading.value = false
    return
  }
  try {
    await expireStaleSessions(auth.user.value.id)
    const [practice, exams] = await Promise.all([loadPractice(), loadExams()])
    sessions.value = mergeHistorySessions([...practice, ...exams])
    if (!parts.value.inProgress.length && parts.value.finished.length) tab.value = 'finished'
  } catch (err) {
    error.value = formatErrorMessage(err, '加载历史失败')
  }
  loading.value = false
}

onMounted(load)
</script>

<template>
  <div>
    <section class="flex flex-wrap items-end justify-between gap-3 py-4 md:py-6">
      <div>
        <p class="page-kicker">回顾</p>
        <h1 class="page-title">历史记录</h1>
        <p class="page-lede">刷题与答题都在这里。点击可继续练习或查看当时结果。</p>
      </div>
      <button class="btn-secondary" type="button" :disabled="loading" @click="load">刷新</button>
    </section>

    <p v-if="loading" class="px-3 py-16 text-center text-muted">加载中…</p>
    <p v-else-if="error" class="alert-error">{{ error }}</p>

    <template v-else>
      <div class="mb-4 grid grid-cols-3 gap-2">
        <div class="surface px-3 py-3 text-center">
          <p class="m-0 text-lg font-semibold tabular-nums text-ink">{{ stats.sessionCount }}</p>
          <p class="m-0 mt-0.5 text-xs text-muted">已完成次数</p>
        </div>
        <div class="surface px-3 py-3 text-center">
          <p class="m-0 text-lg font-semibold tabular-nums text-ink">{{ stats.total }}</p>
          <p class="m-0 mt-0.5 text-xs text-muted">累计题数</p>
        </div>
        <div class="surface px-3 py-3 text-center">
          <p class="m-0 text-lg font-semibold tabular-nums text-ink">{{ stats.rate }}%</p>
          <p class="m-0 mt-0.5 text-xs text-muted">正确率</p>
        </div>
      </div>

      <div class="seg mb-4" role="tablist" aria-label="历史分栏">
        <button
          type="button"
          role="tab"
          class="seg-btn"
          :class="tab === 'in_progress' ? 'seg-btn-on' : ''"
          :aria-selected="tab === 'in_progress'"
          @click="tab = 'in_progress'"
        >
          未完成（{{ parts.inProgress.length }}）
        </button>
        <button
          type="button"
          role="tab"
          class="seg-btn"
          :class="tab === 'finished' ? 'seg-btn-on' : ''"
          :aria-selected="tab === 'finished'"
          @click="tab = 'finished'"
        >
          已完成（{{ parts.finished.length }}）
        </button>
        <button
          type="button"
          role="tab"
          class="seg-btn"
          :class="tab === 'expired' ? 'seg-btn-on' : ''"
          :aria-selected="tab === 'expired'"
          @click="tab = 'expired'"
        >
          已过期（{{ parts.expired.length }}）
        </button>
      </div>

      <div v-if="!visible.length" class="surface py-14 text-center">
        <p class="m-0 font-medium text-ink">这一栏还没有记录</p>
        <p class="mt-1.5 text-sm text-muted">去题库开始一次刷题或答题吧。</p>
        <button class="btn mt-6" type="button" @click="router.push('/banks')">去题库</button>
      </div>

      <ul v-else class="m-0 flex list-none flex-col gap-3 p-0">
        <li v-for="session in visible" :key="`${session.kind}-${session.id}`">
          <button
            type="button"
            class="surface card-link flex w-full flex-col gap-2 px-4 py-3.5 text-left"
            @click="openSession(session)"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <p class="m-0 text-xs text-muted">
                  {{ modeLabel(session.mode) }} · {{ fmtDateTime(session.started_at) }}
                </p>
                <p class="m-0 mt-1 text-base font-semibold text-ink">{{ session.bank_title }}</p>
              </div>
              <span class="chip shrink-0" :class="statusChipClass(sessionHistoryStatus(session))">
                {{ historyStatusLabel(sessionHistoryStatus(session)) }}
              </span>
            </div>
            <p class="m-0 text-sm text-muted">
              {{ historyResultText(session) }}
              <span v-if="session.finished_at"> · 结束于 {{ fmtDateTime(session.finished_at) }}</span>
            </p>
          </button>
        </li>
      </ul>
    </template>
  </div>
</template>
