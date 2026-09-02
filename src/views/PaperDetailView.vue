<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { resolveCaseAttachments, resolveCaseMaterial, shouldShowCaseMaterial } from '../lib/case'
import CaseMaterialPanel from '../components/CaseMaterialPanel.vue'
import { toPublicPaperItems } from '../lib/examSession'
import { paperItemsAsCaseRows, parsePaperItems, type PaperItem } from '../lib/paperSnapshot'
import { questionTypeLabel } from '../lib/scoring'
import { supabase } from '../lib/supabase'
import { useAuth } from '../composables/useAuth'
import type { PaperInstance } from '../lib/types'

const route = useRoute()
const router = useRouter()
const auth = useAuth()

const paper = ref<PaperInstance | null>(null)
const bankTitle = ref('')
const items = ref<PaperItem[]>([])
const examSessionId = ref<string | null>(null)
const examFinished = ref(false)
const loading = ref(true)
const error = ref('')

const caseRows = computed(() => paperItemsAsCaseRows(items.value))
const startLabel = computed(() => {
  if (examFinished.value) return '查看成绩'
  if (examSessionId.value) return '继续答题'
  return '开始答题'
})

function goExam() {
  if (!paper.value) return
  if (examFinished.value && examSessionId.value) {
    void router.push(`/exam-result/${examSessionId.value}`)
    return
  }
  void router.push(`/exam/${paper.value.id}`)
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
  items.value = toPublicPaperItems(parsePaperItems(paperData.items))

  // Legacy papers without items: fall back to live questions (stem/options only)
  if (!items.value.length && paperData.question_ids?.length) {
    const { data: qs } = await supabase
      .from('questions')
      .select('id, qtype, stem, options, case_id, case_material, attachments')
      .in('id', paperData.question_ids)
    const byId = new Map((qs ?? []).map((q) => [q.id, q]))
    items.value = (paperData.question_ids as string[])
      .map((id: string, index: number) => {
        const q = byId.get(id)
        if (!q) return null
        return {
          question_id: id,
          score: Number(paperData.scores?.[index] ?? 0),
          snapshot: {
            stem: q.stem,
            qtype: q.qtype,
            options: Array.isArray(q.options) ? q.options : [],
            answer_keys: [],
            explanation: '',
            case_id: q.case_id,
            case_material: q.case_material,
            attachments: q.attachments ?? null,
          },
        }
      })
      .filter(Boolean) as PaperItem[]
  }

  if (auth.user.value) {
    const { data: exam } = await supabase
      .from('exam_sessions')
      .select('id, finished_at')
      .eq('paper_id', paperId)
      .eq('user_id', auth.user.value.id)
      .maybeSingle()
    examSessionId.value = exam?.id ?? null
    examFinished.value = Boolean(exam?.finished_at)
  }

  const { data: bank } = await supabase
    .from('question_banks')
    .select('title')
    .eq('id', paperData.bank_id)
    .maybeSingle()
  bankTitle.value = bank?.title ?? '题库'
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
          {{ items.length || paper.question_ids.length }} 道小题 · 总分 {{ paper.total_score }} · 种子
          <span class="font-mono tabular-nums">{{ paper.seed }}</span>
        </p>
        <p class="mt-2 text-xs text-muted">
          题目内容、顺序与选项顺序已固化；刷新或换设备打开仍保持一致，不受题库后续改题影响。
        </p>
      </section>

      <div class="mb-4 flex flex-wrap gap-2">
        <button class="btn" type="button" :disabled="!items.length" @click="goExam">
          {{ startLabel }}
        </button>
        <button class="btn-secondary" type="button" @click="router.push(`/banks/${paper.bank_id}/paper`)">
          重新组卷
        </button>
        <button class="btn-ghost" type="button" @click="router.push('/banks')">返回题库</button>
      </div>

      <ul class="m-0 flex list-none flex-col gap-3 p-0">
        <li v-for="(item, idx) in items" :key="item.question_id">
          <article class="surface flex flex-col gap-2.5 px-4 py-3.5">
            <CaseMaterialPanel
              v-if="shouldShowCaseMaterial(caseRows, idx)"
              :material="resolveCaseMaterial(caseRows, idx)"
              :attachments="resolveCaseAttachments(caseRows, idx)"
            />
            <div>
              <p class="m-0 text-xs text-muted">
                第 {{ idx + 1 }} 题 · {{ questionTypeLabel(item.snapshot.qtype) }} · {{ item.score }} 分
              </p>
              <p class="m-0 mt-1 text-sm font-medium text-ink">{{ item.snapshot.stem }}</p>
            </div>
            <ul class="m-0 flex list-none flex-col gap-1.5 p-0">
              <li
                v-for="opt in item.snapshot.options"
                :key="opt.key"
                class="rounded-lg border border-line/70 bg-raise/40 px-3 py-2 text-sm text-muted"
              >
                <span v-if="item.snapshot.qtype !== 'judgement'" class="mr-1.5 font-semibold text-spark">
                  {{ opt.key }}.
                </span>
                {{ opt.text }}
              </li>
            </ul>
          </article>
        </li>
      </ul>
    </template>
  </div>
</template>
