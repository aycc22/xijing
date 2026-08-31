<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  detailPathForSession,
  historyResultText,
  historyStatusLabel,
  modeLabel,
  partitionHistory,
  sessionHistoryStatus,
  type HistorySession,
  type HistoryStatus,
  type SessionMode,
} from '../lib/history'
import { expireStaleSessions } from '../composables/usePracticeProgress'
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

async function load() {
  loading.value = true
  error.value = ''
  if (!auth.user.value) {
    error.value = '请先登录'
    loading.value = false
    return
  }
  await expireStaleSessions(auth.user.value.id)
  const { data, error: err } = await supabase
    .from('attempt_sessions')
    .select('id, bank_id, mode, total_count, correct_count, current_index, started_at, finished_at, expired_at, question_banks!inner(title)')
    .eq('user_id', auth.user.value.id)
    .order('started_at', { ascending: false })
  if (err) {
    error.value = err.message
    loading.value = false
    return
  }
  sessions.value = (data ?? []).map((row) => {
    const bank = row.question_banks as unknown
    const bankObj = (Array.isArray(bank) ? bank[0] : bank) as { title: string } | null
    return {
      id: row.id,
      bank_id: row.bank_id,
      bank_title: bankObj?.title ?? '未命名题库',
      mode: (row.mode as SessionMode) || 'practice',
      total_count: row.total_count,
      correct_count: row.correct_count,
      current_index: row.current_index ?? 0,
      started_at: row.started_at,
      finished_at: row.finished_at,
      expired_at: row.expired_at,
    }
  })
  if (!parts.value.inProgress.length && parts.value.finished.length) tab.value = 'finished'
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
        <p class="page-lede">区分未完成与已完成；点击可继续练习或查看结果。</p>
      </div>
      <button class="btn-secondary" type="button" :disabled="loading" @click="load">刷新</button>
    </section>

    <p v-if="loading" class="px-3 py-16 text-center text-muted">加载中…</p>
    <p v-else-if="error" class="alert-error">{{ error }}</p>

    <template v-else>
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
        <p class="mt-1.5 text-sm text-muted">去题库开始一次刷题吧。</p>
        <button class="btn mt-6" type="button" @click="router.push('/banks')">去题库</button>
      </div>

      <ul v-else class="m-0 flex list-none flex-col gap-3 p-0">
        <li v-for="session in visible" :key="session.id">
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
