<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { resolveCaseAttachments, resolveCaseMaterial, shouldShowCaseMaterial } from '../lib/case'
import CaseMaterialPanel from '../components/CaseMaterialPanel.vue'
import {
  countUnanswered,
  createExamState,
  examSheetStatus,
  toggleFlag,
  toPublicPaperItems,
  updateExamSelection,
  updateExamTextAnswer,
  type ExamAnswerMap,
} from '../lib/examSession'
import { paperItemsAsCaseRows, parsePaperItems, type PaperItem } from '../lib/paperSnapshot'
import { questionTypeLabel, toggleSelection } from '../lib/scoring'
import { supabase } from '../lib/supabase'
import { useAuth } from '../composables/useAuth'
import AnswerActionBar from '../components/AnswerActionBar.vue'
import AnswerSheetDrawer, { type SheetCellState } from '../components/AnswerSheetDrawer.vue'
import type { QuestionType } from '../lib/types'

const route = useRoute()
const router = useRouter()
const auth = useAuth()

const paperId = computed(() => String(route.params.paperId))
const sessionId = ref<string | null>(null)
const items = ref<PaperItem[]>([])
const answers = ref<ExamAnswerMap>({})
const index = ref(0)
const bankTitle = ref('')
const totalScore = ref(100)
const started = ref(false)
const sheetOpen = ref(false)
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const saveTimer = ref<ReturnType<typeof setTimeout> | null>(null)

const questionIds = computed(() => items.value.map((i) => i.question_id))
const qtypeById = computed(() =>
  Object.fromEntries(items.value.map((i) => [i.question_id, i.snapshot.qtype])),
)
const current = computed(() => items.value[index.value] ?? null)
const caseRows = computed(() => paperItemsAsCaseRows(items.value))
const unanswered = computed(() => countUnanswered(answers.value, questionIds.value, qtypeById.value))
const selected = computed({
  get: () => answers.value[current.value?.question_id ?? '']?.selected ?? [],
  set: (keys: string[]) => {
    if (!current.value) return
    answers.value = updateExamSelection(answers.value, current.value.question_id, keys)
    scheduleSave()
  },
})
const textAnswer = computed({
  get: () => selected.value[0] ?? '',
  set: (text: string) => {
    if (!current.value) return
    answers.value = updateExamTextAnswer(answers.value, current.value.question_id, text)
    scheduleSave()
  },
})

const sheetStatuses = computed<SheetCellState[]>(() =>
  items.value.map((item) => examSheetStatus(answers.value[item.question_id])),
)

const currentFlagged = computed(() =>
  Boolean(current.value && answers.value[current.value.question_id]?.flagged),
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
    case 'short_answer':
      return 'bg-warn'
  }
}

function scheduleSave() {
  if (saveTimer.value) clearTimeout(saveTimer.value)
  saveTimer.value = setTimeout(() => {
    void saveProgress()
  }, 400)
}

async function saveProgress() {
  if (!sessionId.value || !started.value) return
  await supabase
    .from('exam_sessions')
    .update({
      answers: answers.value,
      current_index: index.value,
    })
    .eq('id', sessionId.value)
    .is('finished_at', null)
}

function toggle(key: string) {
  if (!current.value) return
  selected.value = toggleSelection(selected.value, key, current.value.snapshot.qtype)
}

function onToggleFlag() {
  if (!current.value) return
  answers.value = toggleFlag(answers.value, current.value.question_id)
  scheduleSave()
}

function goTo(i: number) {
  if (i < 0 || i >= items.value.length) return
  index.value = i
  sheetOpen.value = false
  scheduleSave()
}

async function begin() {
  if (!auth.user.value || !items.value.length) return
  busy.value = true
  error.value = ''
  try {
    const next = Object.keys(answers.value).length
      ? answers.value
      : createExamState(items.value.map((i) => i.question_id))
    const { data: created, error: cErr } = await supabase
      .from('exam_sessions')
      .insert({
        paper_id: paperId.value,
        user_id: auth.user.value.id,
        answers: next,
        total_count: items.value.length,
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    if (cErr) throw cErr
    sessionId.value = created.id
    answers.value = next
    started.value = true
  } catch (err) {
    error.value = err instanceof Error ? err.message : '无法开始答题'
  } finally {
    busy.value = false
  }
}

async function submitExam() {
  if (!sessionId.value) return
  if (unanswered.value > 0) {
    const ok = confirm(`还有 ${unanswered.value} 道未答题，确定交卷吗？`)
    if (!ok) return
  }
  busy.value = true
  error.value = ''
  try {
    await saveProgress()
    const { data, error: err } = await supabase.rpc('finish_exam_session', {
      p_session_id: sessionId.value,
    })
    if (err) throw err
    const id = (data as { id?: string })?.id ?? sessionId.value
    await router.push(`/exam-result/${id}`)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '交卷失败，请重试'
  } finally {
    busy.value = false
  }
}

async function load() {
  loading.value = true
  error.value = ''
  if (!auth.user.value) {
    error.value = '请先登录'
    loading.value = false
    return
  }

  const { data: paper, error: paperErr } = await supabase
    .from('paper_instances')
    .select('id, bank_id, items, total_score, question_banks(title)')
    .eq('id', paperId.value)
    .maybeSingle()
  if (paperErr || !paper) {
    error.value = paperErr?.message ?? '试卷不存在'
    loading.value = false
    return
  }

  const bank = paper.question_banks as unknown
  const bankObj = (Array.isArray(bank) ? bank[0] : bank) as { title: string } | null
  bankTitle.value = bankObj?.title ?? '试卷'
  totalScore.value = Number(paper.total_score) || 100
  items.value = toPublicPaperItems(parsePaperItems(paper.items))

  if (!items.value.length) {
    error.value = '试卷没有题目'
    loading.value = false
    return
  }

  const { data: existing } = await supabase
    .from('exam_sessions')
    .select('*')
    .eq('paper_id', paperId.value)
    .eq('user_id', auth.user.value.id)
    .maybeSingle()

  if (existing?.finished_at) {
    await router.replace(`/exam-result/${existing.id}`)
    return
  }

  if (existing) {
    sessionId.value = existing.id
    answers.value =
      (existing.answers as ExamAnswerMap) || createExamState(items.value.map((i) => i.question_id))
    index.value = existing.current_index ?? 0
    started.value = true
  } else {
    answers.value = createExamState(items.value.map((i) => i.question_id))
  }

  loading.value = false
}

watch(index, () => scheduleSave())
onBeforeUnmount(() => {
  if (saveTimer.value) clearTimeout(saveTimer.value)
  void saveProgress()
})
onMounted(load)
</script>

<template>
  <div>
    <p v-if="loading" class="px-3 py-16 text-center text-muted">准备答题…</p>
    <p v-else-if="error && !items.length" class="alert-error">{{ error }}</p>

    <div v-else-if="!started" class="mx-auto max-w-xl py-6">
      <p class="page-kicker">答题模式</p>
      <h1 class="page-title">{{ bankTitle }}</h1>
      <div class="surface mt-4 flex flex-col gap-3 md:p-6">
        <p class="m-0 text-sm text-ink">题量 {{ items.length }} 道 · 总分 {{ totalScore }}</p>
        <p class="m-0 text-sm text-muted">首期无限时。作答过程中不显示答案、解析与单题正误；交卷后统一判分。</p>
        <p class="m-0 text-sm text-muted">支持答题卡跳转与「标记待检查」。有未答题时交卷需二次确认。</p>
        <p v-if="error" class="alert-error m-0">{{ error }}</p>
        <button class="btn btn-block" type="button" :disabled="busy" @click="begin">
          {{ busy ? '准备中…' : '开始答题' }}
        </button>
        <button class="btn-secondary btn-block" type="button" @click="router.push(`/papers/${paperId}`)">
          返回试卷
        </button>
      </div>
    </div>

    <div v-else-if="current" class="relative flex flex-col gap-4 pb-28">
      <div class="relative z-10 flex flex-wrap items-center justify-between gap-2">
        <div class="flex flex-wrap items-center gap-2">
          <span class="chip">
            <span
              class="size-1.5 rounded-full"
              :class="qtypeDotClass(current.snapshot.qtype)"
              aria-hidden="true"
            />
            {{ questionTypeLabel(current.snapshot.qtype) }} · {{ current.score }} 分
          </span>
        </div>
        <span class="font-display text-lg font-semibold text-ink tabular-nums leading-none">
          {{ index + 1 }}
          <span class="text-sm font-normal text-muted"> / {{ items.length }}</span>
        </span>
      </div>

      <article class="surface relative z-10 flex flex-col gap-3.5 md:p-6">
        <CaseMaterialPanel
          v-if="shouldShowCaseMaterial(caseRows, index)"
          :material="resolveCaseMaterial(caseRows, index)"
          :attachments="resolveCaseAttachments(caseRows, index)"
        />

        <h1 class="m-0 text-[1.125rem] leading-snug font-semibold text-ink md:text-xl">
          {{ current.snapshot.stem }}
        </h1>

        <div v-if="current.snapshot.qtype === 'short_answer'" class="flex flex-col gap-2">
          <label class="text-sm font-medium text-muted" :for="`answer-${current.question_id}`">你的作答</label>
          <textarea
            :id="`answer-${current.question_id}`"
            v-model="textAnswer"
            class="min-h-36 font-mono text-sm"
            placeholder="请输入答案（支持多行）"
            spellcheck="false"
          />
        </div>
        <div v-else class="flex flex-col gap-2.5">
          <button
            v-for="opt in current.snapshot.options"
            :key="opt.key"
            type="button"
            class="option"
            :class="selected.map((k) => k.toUpperCase()).includes(opt.key.toUpperCase()) ? 'option-selected' : ''"
            @click="toggle(opt.key)"
          >
            <span v-if="current.snapshot.qtype !== 'judgement'" class="option-key">{{ opt.key }}</span>
            <span class="pt-0.5 leading-relaxed">{{ opt.text }}</span>
          </button>
        </div>
        <p v-if="error" class="alert-error m-0">{{ error }}</p>
      </article>

      <AnswerActionBar @open-sheet="sheetOpen = true">
        <button
          type="button"
          class="icon-btn !size-11 shrink-0"
          :disabled="index === 0"
          aria-label="上一题"
          @click="goTo(index - 1)"
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

        <button
          type="button"
          class="btn-secondary !px-3 min-h-11 shrink-0"
          :class="currentFlagged ? '!border-warn/50 !bg-warn/15 !text-warn' : ''"
          @click="onToggleFlag"
        >
          {{ currentFlagged ? '取消标记' : '标记' }}
        </button>

        <button
          v-if="index + 1 < items.length"
          class="btn min-h-11 flex-1"
          type="button"
          @click="goTo(index + 1)"
        >
          下一题
        </button>
        <button
          v-else
          class="btn min-h-11 flex-1"
          type="button"
          :disabled="busy"
          @click="submitExam"
        >
          {{ busy ? '交卷中…' : '交卷' }}
        </button>
      </AnswerActionBar>

      <AnswerSheetDrawer
        :open="sheetOpen"
        :total="items.length"
        :statuses="sheetStatuses"
        :current="index"
        variant="exam"
        :unanswered="unanswered"
        :submit-busy="busy"
        @close="sheetOpen = false"
        @go-to="goTo"
        @submit="submitExam"
      />
    </div>
  </div>
</template>
