<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { resolveCaseMaterial, shouldShowCaseMaterial } from '../lib/case'
import {
  countUnanswered,
  createExamState,
  examSheetStatus,
  toggleFlag,
  toPublicPaperItems,
  updateExamSelection,
  type ExamAnswerMap,
} from '../lib/examSession'
import { paperItemsAsCaseRows, parsePaperItems, type PaperItem } from '../lib/paperSnapshot'
import { questionTypeLabel, toggleSelection } from '../lib/scoring'
import { supabase } from '../lib/supabase'
import { useAuth } from '../composables/useAuth'

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
const current = computed(() => items.value[index.value] ?? null)
const caseRows = computed(() => paperItemsAsCaseRows(items.value))
const unanswered = computed(() => countUnanswered(answers.value, questionIds.value))
const selected = computed({
  get: () => answers.value[current.value?.question_id ?? '']?.selected ?? [],
  set: (keys: string[]) => {
    if (!current.value) return
    answers.value = updateExamSelection(answers.value, current.value.question_id, keys)
    scheduleSave()
  },
})

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

function sheetClass(questionId: string, i: number) {
  const base = 'min-h-11 min-w-11 rounded-xl border text-sm font-semibold tabular-nums'
  if (i === index.value) return `${base} border-spark bg-spark/15 text-spark`
  const status = examSheetStatus(answers.value[questionId])
  if (status === 'flagged') return `${base} border-warn/40 bg-warn/10 text-warn`
  if (status === 'answered') return `${base} border-path/40 bg-path/10 text-path`
  return `${base} border-line bg-raise/50 text-muted`
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

    <div v-else-if="current" class="relative flex flex-col gap-4 pb-2">
      <div class="relative z-10 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <span class="font-semibold text-ink tabular-nums">
          {{ index + 1 }}
          <span class="font-normal text-muted"> / {{ items.length }}</span>
        </span>
        <div class="flex items-center gap-2">
          <span class="chip">答题</span>
          <button class="btn-ghost !min-h-11 !px-3 text-sm" type="button" @click="sheetOpen = !sheetOpen">
            答题卡
          </button>
        </div>
      </div>

      <div
        v-if="sheetOpen"
        class="surface relative z-10 flex flex-col gap-3 p-3"
        role="navigation"
        aria-label="答题卡"
      >
        <div class="grid grid-cols-5 gap-2 sm:grid-cols-6">
          <button
            v-for="(item, i) in items"
            :key="item.question_id"
            type="button"
            :class="sheetClass(item.question_id, i)"
            :aria-label="`第 ${i + 1} 题`"
            :aria-current="i === index ? 'true' : undefined"
            @click="goTo(i)"
          >
            {{ i + 1 }}
          </button>
        </div>
        <p class="m-0 text-xs text-muted">未答 {{ unanswered }} 道</p>
        <button class="btn btn-block min-h-11" type="button" :disabled="busy" @click="submitExam">
          {{ busy ? '交卷中…' : '交卷' }}
        </button>
      </div>

      <article class="surface relative z-10 flex flex-col gap-3.5 md:p-6">
        <section
          v-if="shouldShowCaseMaterial(caseRows, index) && resolveCaseMaterial(caseRows, index)"
          class="rounded-xl border border-line bg-raise/60 px-3.5 py-3 text-sm leading-relaxed"
        >
          <p class="m-0 mb-1 text-xs font-semibold text-muted uppercase">案例材料</p>
          <p class="m-0 whitespace-pre-wrap">{{ resolveCaseMaterial(caseRows, index) }}</p>
        </section>

        <p class="m-0 text-xs text-muted">
          {{ questionTypeLabel(current.snapshot.qtype) }} · {{ current.score }} 分
        </p>
        <h1 class="m-0 text-[1.125rem] leading-snug font-semibold text-ink md:text-xl">
          {{ current.snapshot.stem }}
        </h1>

        <div class="flex flex-col gap-2.5">
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

      <div class="sticky-action relative z-10 flex flex-col gap-2">
        <div class="grid grid-cols-2 gap-2">
          <button class="btn-secondary min-h-11" type="button" :disabled="index === 0" @click="goTo(index - 1)">
            上一题
          </button>
          <button class="btn-secondary min-h-11" type="button" @click="onToggleFlag">
            {{ answers[current.question_id]?.flagged ? '取消标记' : '标记待检查' }}
          </button>
        </div>
        <button
          v-if="index + 1 < items.length"
          class="btn btn-block min-h-11"
          type="button"
          @click="goTo(index + 1)"
        >
          下一题
        </button>
        <button
          v-else
          class="btn btn-block min-h-11"
          type="button"
          :disabled="busy"
          @click="submitExam"
        >
          {{ busy ? '交卷中…' : '交卷' }}
        </button>
      </div>
    </div>
  </div>
</template>
