<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  buildFixedPaperItems,
  buildFixedPaperPlan,
  listFixedPaperSections,
  sectionLabelsFromBundle,
} from '../lib/examPaperCompose'
import type { ExamPaperBundle } from '../lib/examPaperImport'
import { splitPaperForStorage } from '../lib/examSession'
import { ensureQuestionOptions } from '../lib/scoring'
import { formatErrorMessage } from '../lib/errors'
import { supabase } from '../lib/supabase'
import { useAuth } from '../composables/useAuth'
import type { Question, QuestionBank, QuestionOption } from '../lib/types'

const route = useRoute()
const router = useRouter()
const auth = useAuth()

const bankId = computed(() => String(route.params.bankId))
const bank = ref<QuestionBank | null>(null)
const questions = ref<Question[]>([])
const selectedSection = ref<string | null>(null)
const loading = ref(true)
const busy = ref(false)
const error = ref('')

const examBundle = computed(() => {
  const meta = bank.value?.exam_meta
  if (!meta || typeof meta !== 'object') return null
  return {
    schema_version: '1.0',
    format: 'xijing-exam-paper' as const,
    exam: (meta as { exam?: ExamPaperBundle['exam'] }).exam ?? { title: bank.value?.title ?? '' },
    papers: ((meta as { papers?: ExamPaperBundle['papers'] }).papers ?? []) as ExamPaperBundle['papers'],
  }
})

const sections = computed(() => listFixedPaperSections(examBundle.value))
const sectionLabels = computed(() => sectionLabelsFromBundle(examBundle.value))

const plan = computed(() =>
  buildFixedPaperPlan(questions.value, selectedSection.value, sectionLabels.value),
)

function normalizeOptions(raw: unknown): QuestionOption[] {
  if (!Array.isArray(raw)) return []
  return raw.map((o) => o as QuestionOption)
}

async function load() {
  loading.value = true
  error.value = ''
  const { data: bankData, error: bankErr } = await supabase
    .from('question_banks')
    .select('*')
    .eq('id', bankId.value)
    .maybeSingle()
  if (bankErr || !bankData) {
    error.value = bankErr?.message ?? '题库不存在'
    loading.value = false
    return
  }
  bank.value = bankData as QuestionBank
  if (bank.value.bank_kind !== 'exam') {
    error.value = '此题库不是真题试卷，请使用随机组卷'
    loading.value = false
    return
  }

  const { data, error: qErr } = await supabase
    .from('questions')
    .select('*')
    .eq('bank_id', bankId.value)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  if (qErr) {
    error.value = qErr.message
    loading.value = false
    return
  }

  questions.value = (data ?? []).map((q) => ({
    ...q,
    options: normalizeOptions(q.options),
    is_active: q.is_active ?? true,
    score: q.score ?? null,
    section: q.section ?? null,
    attachments: q.attachments ?? null,
    reference_answer: q.reference_answer ?? '',
  })) as Question[]

  selectedSection.value = sections.value[0]?.sectionId ?? null
  loading.value = false
}

async function startExam() {
  error.value = ''
  if (!auth.user.value) {
    error.value = '请先登录'
    return
  }
  if (!plan.value.questionIds.length) {
    error.value = '当前分卷没有可用题目'
    return
  }

  busy.value = true
  try {
    const questionsById = new Map(
      questions.value.map((q) => [
        q.id,
        {
          id: q.id,
          qtype: q.qtype,
          stem: q.stem,
          options: ensureQuestionOptions(q.qtype, q.options),
          answer_keys: q.answer_keys ?? [],
          explanation: q.explanation ?? '',
          case_id: q.case_id,
          case_material: q.case_material,
          attachments: q.attachments ?? null,
          reference_answer: q.reference_answer ?? '',
        },
      ]),
    )

    const seed = Math.floor(Math.random() * 0xffffffff)
    const items = buildFixedPaperItems({
      questionIds: plan.value.questionIds,
      scores: plan.value.scores,
      seed,
      questionsById,
    })
    const { publicItems, grading } = splitPaperForStorage(items)

    const { data: paper, error: paperErr } = await supabase
      .from('paper_instances')
      .insert({
        bank_id: bankId.value,
        user_id: auth.user.value.id,
        seed,
        question_ids: plan.value.questionIds,
        scores: plan.value.scores,
        total_score: plan.value.totalScore,
        counts: plan.value.counts,
        items: publicItems,
        compose_mode: 'fixed',
        section_labels: plan.value.sectionLabels,
      })
      .select('id')
      .single()
    if (paperErr) throw paperErr

    const { error: gradeErr } = await supabase.from('paper_grading').insert({
      paper_id: paper.id,
      grading,
    })
    if (gradeErr) throw gradeErr

    await router.push(`/exam/${paper.id}`)
  } catch (err) {
    error.value = formatErrorMessage(err, '无法生成试卷')
  } finally {
    busy.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-xl">
    <section class="py-4 md:py-6">
      <p class="page-kicker">真题模考</p>
      <h1 class="page-title">{{ bank?.title ?? '试卷' }}</h1>
      <p class="page-lede">按真题卷面顺序与分值生成固定试卷，交卷后自动判分（简答题采用参考答案模糊匹配）。</p>
    </section>

    <p v-if="loading" class="px-3 py-16 text-center text-muted">加载中…</p>
    <p v-else-if="error && !bank" class="alert-error">{{ error }}</p>

    <div v-else class="surface flex flex-col gap-4 md:p-6">
      <div class="field">
        <span class="field-caption">选择分卷</span>
        <div class="flex flex-col gap-2">
          <label
            v-for="section in sections"
            :key="section.sectionId ?? 'all'"
            class="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-raise/40 px-3.5 py-3 text-sm transition hover:border-spark/40"
          >
            <input
              v-model="selectedSection"
              class="size-4 accent-spark"
              type="radio"
              :value="section.sectionId"
            />
            <span class="font-medium text-ink">{{ section.label }}</span>
          </label>
        </div>
      </div>

      <div class="rounded-xl border border-line bg-raise/40 px-3.5 py-3 text-sm text-muted">
        <p class="m-0">
          题量
          <span class="font-semibold text-ink tabular-nums">{{ plan.questionIds.length }}</span>
          道 · 总分
          <span class="font-semibold text-ink tabular-nums">{{ plan.totalScore }}</span>
          分
        </p>
      </div>

      <p v-if="error" class="alert-error m-0">{{ error }}</p>

      <button class="btn btn-block" type="button" :disabled="busy || !plan.questionIds.length" @click="startExam">
        {{ busy ? '生成中…' : `开始${plan.label}` }}
      </button>
      <button class="btn-secondary btn-block" type="button" @click="router.push('/banks')">返回题库</button>
    </div>
  </div>
</template>
