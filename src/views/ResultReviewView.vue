<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import SessionReviewPlayer from '../components/SessionReviewPlayer.vue'
import { formatErrorMessage } from '../lib/errors'
import { practiceResultPath } from '../lib/history'
import { toPracticeReviewItems } from '../lib/practiceResult'
import { supabase } from '../lib/supabase'
import type { AttemptSession } from '../lib/types'

const route = useRoute()
const session = ref<AttemptSession | null>(null)
const bankTitle = ref('')
const reviews = ref(toPracticeReviewItems([]))
const error = ref('')
const loading = ref(true)

const sessionId = computed(() => String(route.params.sessionId))
const backPath = computed(() => practiceResultPath(sessionId.value))

async function load() {
  loading.value = true
  error.value = ''
  const id = sessionId.value
  const { data, error: err } = await supabase
    .from('attempt_sessions')
    .select('*')
    .eq('id', id)
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
    .eq('session_id', id)
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
  <div class="flex flex-col gap-5 py-4 md:py-8">
    <div>
      <RouterLink
        class="inline-flex items-center gap-1 text-sm text-muted transition hover:text-spark"
        :to="backPath"
      >
        ← 返回本次结果
      </RouterLink>
      <p class="page-kicker mt-4">复盘</p>
      <h1 class="page-title">逐题复盘</h1>
      <p v-if="bankTitle" class="page-lede">{{ bankTitle }}</p>
    </div>

    <p v-if="loading" class="px-3 py-16 text-center text-muted">加载复盘…</p>
    <p v-else-if="error && !session" class="alert-error">{{ error }}</p>
    <template v-else-if="session">
      <p v-if="error" class="alert-error m-0">{{ error }}</p>
      <SessionReviewPlayer
        v-if="reviews.length"
        :items="reviews"
        heading="题目"
        :session-id="session.id"
        session-type="practice"
      />
      <div v-else class="surface py-14 text-center">
        <p class="m-0 font-medium text-ink">没有可复盘的题目</p>
        <p class="mt-1.5 text-sm text-muted">返回结果页可再刷一遍或查看历史。</p>
        <RouterLink class="btn mt-6 inline-flex" :to="backPath">返回结果</RouterLink>
      </div>
    </template>
  </div>
</template>
