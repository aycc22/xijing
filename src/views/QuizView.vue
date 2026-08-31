<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { resolveCaseMaterial } from '../lib/case'
import {
  expireStaleSessions,
  findResumableSession,
  loadSessionProgress,
  saveSessionProgress,
  shouldForceNewSession,
  usePracticeAutosave,
} from '../composables/usePracticeProgress'
import {
  canGoNext,
  canGoPrev,
  canSubmitAnswer,
  createPracticeState,
  markAnswered,
  markSkipped,
  sheetStatus,
  syncAttemptSelection,
  type QuestionAttempt,
} from '../lib/practiceSession'
import { useScoring } from '../composables/useScoring'
import { ensureQuestionOptions } from '../lib/scoring'
import { supabase } from '../lib/supabase'
import { recordWrongQuestion, loadWrongQuestionIds } from '../lib/wrongBook'
import { buildQuestionSnapshot } from '../lib/questionSnapshot'
import { loadFavoriteIds, loadNotes, saveNote, toggleFavorite } from '../lib/userLearning'
import { useAuth } from '../composables/useAuth'
import AnswerActionBar from '../components/AnswerActionBar.vue'
import AnswerSheetDrawer, { type SheetCellState } from '../components/AnswerSheetDrawer.vue'
import type { Question, QuestionOption, QuestionType } from '../lib/types'

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const { isAnswerCorrect, optionRevealClass, questionTypeLabel, toggleSelection } = useScoring()

const questions = ref<Question[]>([])
const attempts = ref<QuestionAttempt[]>([])
const index = ref(0)
const selected = ref<string[]>([])
const revealed = ref(false)
const sessionId = ref<string | null>(null)
const correctCount = ref(0)
const error = ref('')
const loading = ref(true)
const resuming = ref(false)
const sheetOpen = ref(false)
const favoritedIds = ref<Set<string>>(new Set())
const noteDraft = ref('')
const noteSaving = ref(false)

async function saveProgress() {
  if (!sessionId.value) return
  await saveSessionProgress({
    sessionId: sessionId.value,
    index: index.value,
    correctCount: correctCount.value,
    totalCount: questions.value.length,
    draftQuestionId: current.value?.id ?? null,
    draftSelectedKeys: selected.value,
    revealed: revealed.value,
  })
}

usePracticeAutosave(saveProgress)

const current = computed(() => questions.value[index.value] ?? null)
const currentAttempt = computed(() => attempts.value[index.value])
const caseMaterial = computed(() => resolveCaseMaterial(questions.value, index.value))
const progress = computed(() =>
  questions.value.length ? ((index.value + (revealed.value ? 1 : 0)) / questions.value.length) * 100 : 0,
)
const submitEnabled = computed(() => canSubmitAnswer(currentAttempt.value))
const wrongOnly = computed(() => route.query.wrong === '1')

const sheetStatuses = computed<SheetCellState[]>(() =>
  attempts.value.map((attempt) => {
    const status = sheetStatus(attempt)
    if (status === 'answered' && attempt.isCorrect) return 'correct'
    if (status === 'answered' && attempt.isCorrect === false) return 'wrong'
    if (status === 'skipped') return 'skipped'
    return 'unanswered'
  }),
)

function qtypeDotClass(qtype: QuestionType) {
  switch (qtype) {
    case 'single':
      return 'bg-spark'
    case 'multiple':
      return 'bg-path'
    case 'judgement':
      return 'bg-ok'
    case 'case_analysis':
      return 'bg-warn'
  }
}

function normalizeOptions(raw: unknown): QuestionOption[] {
  if (!Array.isArray(raw)) return []
  return raw.map((o) => o as QuestionOption)
}

function applyAttemptState(attempt: QuestionAttempt) {
  selected.value = [...attempt.selected]
  revealed.value = attempt.revealed
}

function persistAttemptAt(i: number, attempt: QuestionAttempt) {
  attempts.value[i] = attempt
}

watch(selected, (keys) => {
  const i = index.value
  const next = syncAttemptSelection(attempts.value[i], keys)
  if (next !== attempts.value[i]) persistAttemptAt(i, next)
})

function toggle(key: string) {
  if (revealed.value || !current.value) return
  selected.value = toggleSelection(selected.value, key, current.value.qtype)
}

function optionClass(key: string) {
  if (!current.value) return ''
  return optionRevealClass(key, selected.value, current.value.answer_keys, revealed.value)
}

function goTo(i: number) {
  if (i < 0 || i >= questions.value.length) return
  void saveProgress()
  index.value = i
  applyAttemptState(attempts.value[i])
  error.value = ''
  sheetOpen.value = false
}

function prev() {
  if (!canGoPrev(index.value)) return
  goTo(index.value - 1)
}

function next() {
  if (!canGoNext(index.value, questions.value.length, attempts.value[index.value])) return
  goTo(index.value + 1)
}

async function persistAnswer(question: Question, keys: string[], ok: boolean, skipped = false) {
  if (!sessionId.value) return
  const { error: aErr } = await supabase.from('attempt_answers').upsert(
    {
      session_id: sessionId.value,
      question_id: question.id,
      selected_keys: keys.map((k) => k.toUpperCase()),
      is_correct: ok,
      is_skipped: skipped,
      question_snapshot: buildQuestionSnapshot(question),
    },
    { onConflict: 'session_id,question_id' },
  )
  if (aErr) error.value = aErr.message
}

async function handleWrong(questionId: string, keys: string[]) {
  if (!auth.user.value) return
  await recordWrongQuestion(supabase, auth.user.value.id, questionId, keys)
}

async function submitAnswer() {
  if (!current.value || !sessionId.value || revealed.value) return
  if (!submitEnabled.value) {
    error.value = '请先选择答案'
    return
  }
  error.value = ''
  const ok = isAnswerCorrect(selected.value, current.value.answer_keys)
  if (ok) correctCount.value += 1
  const attempt = markAnswered(attempts.value[index.value], ok)
  persistAttemptAt(index.value, attempt)
  revealed.value = true
  await persistAnswer(current.value, selected.value, ok)
  if (!ok) await handleWrong(current.value.id, selected.value)
  await loadNoteDraft()
  await saveProgress()
}

async function skipQuestion() {
  if (!current.value || !sessionId.value || revealed.value) return
  error.value = ''
  const attempt = markSkipped(attempts.value[index.value])
  persistAttemptAt(index.value, attempt)
  selected.value = []
  revealed.value = true
  await persistAnswer(current.value, [], false, true)
  await handleWrong(current.value.id, [])
  await loadNoteDraft()
  await saveProgress()
}

async function finish() {
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
}

async function loadNoteDraft() {
  if (!current.value || !auth.user.value) return
  const notes = await loadNotes(supabase, auth.user.value.id, [current.value.id])
  noteDraft.value = notes.get(current.value.id) ?? ''
}

async function onToggleFavorite() {
  if (!current.value || !auth.user.value) return
  const isFav = favoritedIds.value.has(current.value.id)
  const next = await toggleFavorite(supabase, auth.user.value.id, current.value.id, isFav)
  const ids = new Set(favoritedIds.value)
  if (next) ids.add(current.value.id)
  else ids.delete(current.value.id)
  favoritedIds.value = ids
}

async function onSaveNote() {
  if (!current.value || !auth.user.value) return
  noteSaving.value = true
  await saveNote(supabase, auth.user.value.id, current.value.id, noteDraft.value)
  noteSaving.value = false
}

watch(index, () => {
  if (revealed.value) void loadNoteDraft()
})

async function start() {
  loading.value = true
  error.value = ''
  const bankId = String(route.params.bankId)
  const { data, error: err } = await supabase
    .from('questions')
    .select('*')
    .eq('bank_id', bankId)
    .eq('is_active', true)
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

  if (!auth.user.value) {
    error.value = '请先登录'
    loading.value = false
    return
  }

  if (wrongOnly.value) {
    const wrongIds = await loadWrongQuestionIds(supabase, auth.user.value.id, bankId)
    questions.value = questions.value.filter((q) => wrongIds.has(q.id))
    if (!questions.value.length) {
      error.value = '该题库暂无错题，先去刷题吧'
      loading.value = false
      return
    }
  }

  if (!questions.value.length) {
    error.value = '该题库没有题目'
    loading.value = false
    return
  }

  attempts.value = createPracticeState(questions.value.length)
  index.value = 0
  applyAttemptState(attempts.value[0])

  await expireStaleSessions(auth.user.value.id)

  const forceNew = shouldForceNewSession(route)
  if (forceNew) {
    await supabase
      .from('attempt_sessions')
      .update({ expired_at: new Date().toISOString() })
      .eq('user_id', auth.user.value.id)
      .eq('bank_id', bankId)
      .is('finished_at', null)
      .is('expired_at', null)
  }

  const existing = forceNew || wrongOnly.value ? null : await findResumableSession(auth.user.value.id, bankId)

  if (existing) {
    resuming.value = true
    sessionId.value = existing.id
    const progress = await loadSessionProgress(existing.id, questions.value)
    attempts.value = progress.attempts
    correctCount.value = progress.correctCount
    index.value = progress.index
    applyAttemptState(attempts.value[index.value])
    if (auth.user.value) {
      favoritedIds.value = await loadFavoriteIds(
        supabase,
        auth.user.value.id,
        questions.value.map((q) => q.id),
      )
    }
    if (revealed.value) await loadNoteDraft()
    loading.value = false
    return
  }

  const { data: session, error: sErr } = await supabase
    .from('attempt_sessions')
    .insert({
      user_id: auth.user.value.id,
      bank_id: bankId,
      mode: 'practice',
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
  if (auth.user.value) {
    favoritedIds.value = await loadFavoriteIds(
      supabase,
      auth.user.value.id,
      questions.value.map((q) => q.id),
    )
  }
  loading.value = false
}

onMounted(start)
</script>

<template>
  <div>
    <p v-if="loading" class="px-3 py-16 text-center text-muted">准备题目…</p>
    <p v-else-if="error && !current" class="alert-error">{{ error }}</p>

    <div v-else-if="current" class="relative flex flex-col gap-4 pb-28">
      <span class="ink-mark -top-3 right-0" aria-hidden="true">{{ index + 1 }}</span>

      <div class="relative z-10 flex flex-col gap-2.5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-2">
            <span class="chip">
              <span class="size-1.5 rounded-full" :class="qtypeDotClass(current.qtype)" aria-hidden="true" />
              {{ questionTypeLabel(current.qtype) }}
            </span>
            <span v-if="wrongOnly" class="chip-lit">错题练习</span>
            <span v-if="resuming" class="chip-lit">续做中</span>
          </div>
          <span class="font-display text-lg font-semibold text-ink tabular-nums leading-none">
            {{ index + 1 }}
            <span class="text-sm font-normal text-muted"> / {{ questions.length }}</span>
          </span>
        </div>

        <div
          class="path-track relative z-10"
          role="progressbar"
          :aria-valuenow="Math.round(progress)"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <span class="path-fill" :style="{ width: progress + '%' }" />
        </div>
      </div>

      <article class="surface relative z-10 flex flex-col gap-3.5 md:p-6">
        <section
          v-if="caseMaterial"
          class="rounded-xl border border-line bg-raise/60 px-3.5 py-3 text-sm leading-relaxed text-ink"
        >
          <p class="m-0 mb-1 text-xs font-semibold tracking-wide text-muted uppercase">案例材料</p>
          <p class="m-0 whitespace-pre-wrap">{{ caseMaterial }}</p>
        </section>

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
            :disabled="revealed"
            @click="toggle(opt.key)"
          >
            <span v-if="current.qtype !== 'judgement'" class="option-key">{{ opt.key }}</span>
            <span class="pt-0.5 leading-relaxed">{{ opt.text }}</span>
          </button>
        </div>

        <p v-if="revealed && currentAttempt?.status === 'skipped'" class="alert-warn m-0">
          已标记为暂不会，不计入正确。
        </p>
        <p v-if="revealed && current.explanation" class="alert-info">
          <span class="font-semibold">解析</span> · {{ current.explanation }}
        </p>

        <div v-if="revealed" class="flex flex-col gap-3 border-t border-line/60 pt-3">
          <div class="flex flex-wrap gap-2">
            <button class="btn-secondary min-h-11" type="button" @click="onToggleFavorite">
              {{ favoritedIds.has(current.id) ? '已收藏' : '收藏题目' }}
            </button>
          </div>
          <div class="field">
            <label :for="`note-${current.id}`">私人笔记</label>
            <textarea
              :id="`note-${current.id}`"
              v-model="noteDraft"
              rows="2"
              maxlength="1000"
              placeholder="记录你的思路…"
            />
            <button class="btn-secondary mt-2 min-h-11" type="button" :disabled="noteSaving" @click="onSaveNote">
              {{ noteSaving ? '保存中…' : '保存笔记' }}
            </button>
          </div>
        </div>

        <p v-if="error" class="alert-error">{{ error }}</p>
      </article>

      <AnswerActionBar @open-sheet="sheetOpen = true">
        <button
          type="button"
          class="icon-btn !size-11 shrink-0"
          :disabled="!canGoPrev(index)"
          aria-label="上一题"
          @click="prev"
        >
          <svg class="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M15 6 9 12l6 6"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>

        <template v-if="!revealed">
          <button class="btn-secondary !px-3 min-h-11 shrink-0" type="button" @click="skipQuestion">
            暂不会
          </button>
          <button
            class="btn min-h-11 flex-1"
            type="button"
            :disabled="!submitEnabled"
            @click="submitAnswer"
          >
            提交答案
          </button>
        </template>

        <template v-else>
          <button
            v-if="index + 1 < questions.length"
            class="btn min-h-11 flex-1"
            type="button"
            @click="next"
          >
            下一题
          </button>
          <button v-else class="btn min-h-11 flex-1" type="button" @click="finish">查看结果</button>
        </template>
      </AnswerActionBar>

      <AnswerSheetDrawer
        :open="sheetOpen"
        :total="questions.length"
        :statuses="sheetStatuses"
        :current="index"
        variant="practice"
        @close="sheetOpen = false"
        @go-to="goTo"
      />
    </div>
  </div>
</template>
