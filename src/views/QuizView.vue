<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useScoring } from '../composables/useScoring'
import { ensureQuestionOptions } from '../lib/scoring'
import { supabase } from '../lib/supabase'
import { useAuth } from '../composables/useAuth'
import type { Question, QuestionOption } from '../lib/types'

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const { isAnswerCorrect, optionRevealClass, questionTypeLabel, toggleSelection } = useScoring()

const questions = ref<Question[]>([])
const index = ref(0)
const selected = ref<string[]>([])
const revealed = ref(false)
const sessionId = ref<string | null>(null)
const correctCount = ref(0)
const error = ref('')
const loading = ref(true)

const current = computed(() => questions.value[index.value] ?? null)
const progress = computed(() =>
  questions.value.length ? ((index.value + (revealed.value ? 1 : 0)) / questions.value.length) * 100 : 0,
)

function normalizeOptions(raw: unknown): QuestionOption[] {
  if (!Array.isArray(raw)) return []
  return raw.map((o) => o as QuestionOption)
}

function toggle(key: string) {
  if (revealed.value || !current.value) return
  selected.value = toggleSelection(selected.value, key, current.value.qtype)
}

function optionClass(key: string) {
  if (!current.value) return ''
  return optionRevealClass(key, selected.value, current.value.answer_keys, revealed.value)
}

async function start() {
  loading.value = true
  error.value = ''
  const bankId = String(route.params.bankId)
  const { data, error: err } = await supabase
    .from('questions')
    .select('*')
    .eq('bank_id', bankId)
    .order('sort_order', { ascending: true })
  if (err) {
    error.value = err.message
    loading.value = false
    return
  }
  questions.value = (data ?? []).map((q) => ({
    ...q,
    options: ensureQuestionOptions(q.qtype, normalizeOptions(q.options)),
  })) as Question[]

  if (!questions.value.length) {
    error.value = '该题库没有题目'
    loading.value = false
    return
  }

  if (!auth.user.value) {
    error.value = '请先登录'
    loading.value = false
    return
  }

  const { data: session, error: sErr } = await supabase
    .from('attempt_sessions')
    .insert({
      user_id: auth.user.value.id,
      bank_id: bankId,
      total_count: questions.value.length,
    })
    .select('id')
    .single()
  if (sErr) {
    error.value = sErr.message
    loading.value = false
    return
  }
  sessionId.value = session.id
  loading.value = false
}

async function submitAnswer() {
  if (!current.value || !sessionId.value || revealed.value) return
  if (!selected.value.length) {
    error.value = '请先选择答案'
    return
  }
  error.value = ''
  const ok = isAnswerCorrect(selected.value, current.value.answer_keys)
  if (ok) correctCount.value += 1
  revealed.value = true

  const { error: aErr } = await supabase.from('attempt_answers').insert({
    session_id: sessionId.value,
    question_id: current.value.id,
    selected_keys: selected.value.map((k) => k.toUpperCase()),
    is_correct: ok,
  })
  if (aErr) error.value = aErr.message
}

async function next() {
  if (index.value + 1 >= questions.value.length) {
    if (sessionId.value) {
      await supabase
        .from('attempt_sessions')
        .update({
          correct_count: correctCount.value,
          finished_at: new Date().toISOString(),
        })
        .eq('id', sessionId.value)
      await router.push(`/result/${sessionId.value}`)
    }
    return
  }
  index.value += 1
  selected.value = []
  revealed.value = false
}

onMounted(start)
</script>

<template>
  <div>
    <p v-if="loading" class="px-3 py-16 text-center text-muted">准备题目…</p>
    <p v-else-if="error && !current" class="alert-error">{{ error }}</p>

    <div v-else-if="current" class="relative flex flex-col gap-4 pb-2">
      <span class="ink-mark -top-3 right-0" aria-hidden="true">{{ index + 1 }}</span>

      <div class="relative z-10 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <span class="font-semibold text-ink tabular-nums">
          {{ index + 1 }}
          <span class="font-normal text-muted"> / {{ questions.length }}</span>
        </span>
        <span class="chip">{{ questionTypeLabel(current.qtype) }}</span>
      </div>

      <div
        class="path-track relative z-10 mx-1"
        role="progressbar"
        :aria-valuenow="Math.round(progress)"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <span class="path-fill" :style="{ width: progress + '%' }" />
      </div>

      <article class="surface relative z-10 flex flex-col gap-3.5 md:p-6">
        <h1 class="m-0 text-[1.125rem] leading-snug font-semibold text-ink md:text-xl">
          {{ current.stem }}
        </h1>

        <div class="flex flex-col gap-2.5">
          <button
            v-for="opt in current.options"
            :key="opt.key"
            type="button"
            class="option"
            :class="optionClass(opt.key)"
            @click="toggle(opt.key)"
          >
            <span v-if="current.qtype !== 'judgement'" class="option-key">{{ opt.key }}</span>
            <span class="pt-0.5 leading-relaxed">{{ opt.text }}</span>
          </button>
        </div>

        <p v-if="revealed && current.explanation" class="alert-info">
          <span class="font-semibold">解析</span> · {{ current.explanation }}
        </p>
        <p v-if="error" class="alert-error">{{ error }}</p>
      </article>

      <div class="sticky-action relative z-10 md:mt-1">
        <button v-if="!revealed" class="btn btn-block" type="button" @click="submitAnswer">
          提交答案
        </button>
        <button v-else class="btn btn-block" type="button" @click="next">
          {{ index + 1 >= questions.length ? '查看结果' : '下一题' }}
        </button>
      </div>
    </div>
  </div>
</template>
