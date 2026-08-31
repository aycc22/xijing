<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { resolveCaseMaterial, shouldShowCaseMaterial } from '../lib/case'
import { questionTypeLabel } from '../lib/scoring'
import { supabase } from '../lib/supabase'
import { useAuth } from '../composables/useAuth'
import type { Question, QuestionOption } from '../lib/types'

interface PaperInstance {
  id: string
  bank_id: string
  seed: number
  question_ids: string[]
  scores: number[]
  total_score: number
  counts: Record<string, number>
  created_at: string
}

const route = useRoute()
const router = useRouter()
const auth = useAuth()

const paper = ref<PaperInstance | null>(null)
const bankTitle = ref('')
const questions = ref<Question[]>([])
const loading = ref(true)
const error = ref('')

function normalizeOptions(raw: unknown): QuestionOption[] {
  if (!Array.isArray(raw)) return []
  return raw.map((o) => o as QuestionOption)
}

const orderedQuestions = computed(() => {
  if (!paper.value) return [] as Question[]
  const byId = new Map(questions.value.map((q) => [q.id, q]))
  return paper.value.question_ids.map((id) => byId.get(id)).filter(Boolean) as Question[]
})

function scoreAt(index: number) {
  return paper.value?.scores[index] ?? 0
}

async function load() {
  loading.value = true
  error.value = ''
  const paperId = String(route.params.paperId)
  const { data: paperData, error: paperErr } = await supabase
    .from('paper_instances')
    .select('*')
    .eq('id', paperId)
    .maybeSingle()
  if (paperErr || !paperData) {
    error.value = paperErr?.message ?? '试卷不存在'
    loading.value = false
    return
  }
  if (paperData.user_id !== auth.user.value?.id && !auth.admin.value) {
    error.value = '无权查看此试卷'
    loading.value = false
    return
  }
  paper.value = paperData as PaperInstance

  const { data: bank } = await supabase
    .from('question_banks')
    .select('title')
    .eq('id', paperData.bank_id)
    .maybeSingle()
  bankTitle.value = bank?.title ?? '题库'

  if (paperData.question_ids?.length) {
    const { data: qs, error: qErr } = await supabase
      .from('questions')
      .select(
        'id, bank_id, qtype, stem, options, answer_keys, explanation, case_id, case_material, is_active, sort_order, external_id',
      )
      .in('id', paperData.question_ids)
    if (qErr) {
      error.value = qErr.message
      loading.value = false
      return
    }
    questions.value = (qs ?? []).map((q) => ({
      ...q,
      options: normalizeOptions(q.options),
    })) as Question[]
  }
  loading.value = false
}

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <p v-if="loading" class="px-3 py-16 text-center text-muted">加载试卷…</p>
    <p v-else-if="error" class="alert-error">{{ error }}</p>

    <template v-else-if="paper">
      <section class="py-4 md:py-6">
        <p class="page-kicker">试卷实例</p>
        <h1 class="page-title">{{ bankTitle }}</h1>
        <p class="page-lede">
          {{ paper.question_ids.length }} 道小题 · 总分 {{ paper.total_score }} · 种子
          <span class="font-mono tabular-nums">{{ paper.seed }}</span>
        </p>
        <p class="mt-2 text-xs text-muted">题目顺序已固化，刷新本页不会换题。</p>
      </section>

      <div class="mb-4 flex flex-wrap gap-2">
        <button class="btn" type="button" disabled title="答题模式将在后续版本开放">
          开始答题（即将开放）
        </button>
        <button class="btn-secondary" type="button" @click="router.push(`/banks/${paper.bank_id}/paper`)">
          重新组卷
        </button>
        <button class="btn-ghost" type="button" @click="router.push('/banks')">返回题库</button>
      </div>

      <ul class="m-0 flex list-none flex-col gap-3 p-0">
        <li v-for="(q, idx) in orderedQuestions" :key="q.id">
          <article class="surface flex flex-col gap-2 px-4 py-3.5">
            <section
              v-if="shouldShowCaseMaterial(orderedQuestions, idx) && resolveCaseMaterial(orderedQuestions, idx)"
              class="rounded-xl border border-line bg-raise/60 px-3 py-3 text-sm leading-relaxed"
            >
              <p class="m-0 mb-1 text-xs font-semibold text-muted uppercase">案例材料</p>
              <p class="m-0 whitespace-pre-wrap">{{ resolveCaseMaterial(orderedQuestions, idx) }}</p>
            </section>
            <div>
              <p class="m-0 text-xs text-muted">
                第 {{ idx + 1 }} 题 · {{ questionTypeLabel(q.qtype) }} · {{ scoreAt(idx) }} 分
              </p>
              <p class="m-0 mt-1 text-sm font-medium text-ink">{{ q.stem }}</p>
            </div>
          </article>
        </li>
      </ul>
    </template>
  </div>
</template>
