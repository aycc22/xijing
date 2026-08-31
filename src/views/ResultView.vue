<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { computePracticeSummary, verdictForRate } from '../lib/practiceResult'
import { supabase } from '../lib/supabase'
import type { AttemptSession } from '../lib/types'

const route = useRoute()
const router = useRouter()
const session = ref<AttemptSession | null>(null)
const bankTitle = ref('')
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
    error.value = err?.message ?? '结果不存在'
    loading.value = false
    return
  }
  session.value = data as AttemptSession
  loading.value = false

  const { data: bank } = await supabase
    .from('question_banks')
    .select('title')
    .eq('id', data.bank_id)
    .maybeSingle()
  bankTitle.value = bank?.title ?? ''
}

onMounted(load)
</script>

<template>
  <div
    class="relative flex min-h-[calc(100dvh-8.5rem)] flex-col items-center justify-center overflow-hidden py-6 text-center"
  >
    <p v-if="loading" class="m-0 text-muted">加载结果…</p>
    <p v-else-if="error" class="alert-error m-0">{{ error }}</p>

    <div v-else-if="session" class="relative flex w-full flex-col items-center">
      <div class="halo pointer-events-none absolute -inset-10" aria-hidden="true"></div>

      <p class="page-kicker relative m-0 max-w-[80vw] truncate">
        本次结果<template v-if="bankTitle"> · {{ bankTitle }}</template>
      </p>

      <p
        class="font-display relative m-0 mt-4 text-[clamp(3.5rem,18vw,5.5rem)] leading-none tracking-wide text-ink tabular-nums"
      >
        {{ summary.correct }}<span class="text-[0.38em] text-muted"> / {{ summary.total }}</span>
      </p>

      <p class="font-display relative m-0 mt-3 text-xl tracking-wide text-spark">{{ verdict }}</p>

      <div class="path-track relative mt-6 w-full max-w-2xs">
        <span class="path-fill" :style="{ width: summary.rate + '%' }" />
      </div>

      <dl class="relative m-0 mt-8 flex divide-x divide-line/70">
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

      <div class="relative mt-10 flex w-full max-w-2xs flex-col items-center gap-5">
        <button
          class="btn w-full"
          type="button"
          @click="router.push(`/quiz/${session.bank_id}?new=1`)"
        >
          <svg
            class="size-4.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
            <path d="M19.5 3.5v3.4h-3.4" />
          </svg>
          再刷一遍
        </button>

        <nav class="flex items-center gap-6" aria-label="更多去向">
          <RouterLink
            class="flex items-center gap-1.5 text-sm text-muted transition hover:text-spark"
            to="/history"
          >
            <svg
              class="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="8" />
              <path d="M12 8v4.5l3 1.5" />
            </svg>
            历史记录
          </RouterLink>
          <span class="size-1 rounded-full bg-line" aria-hidden="true"></span>
          <RouterLink
            class="flex items-center gap-1.5 text-sm text-muted transition hover:text-spark"
            to="/banks"
          >
            <svg
              class="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path
                d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10v16H5.5A1.5 1.5 0 0 1 4 18.5v-13ZM14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14V4Z"
              />
            </svg>
            返回题库
          </RouterLink>
        </nav>
      </div>
    </div>
  </div>
</template>
