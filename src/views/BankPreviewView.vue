<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { resolveCaseMaterial } from '../lib/case'
import { useScoring } from '../composables/useScoring'
import { supabase } from '../lib/supabase'
import type { Question, QuestionBank, QuestionOption } from '../lib/types'

const route = useRoute()
const router = useRouter()
const { questionTypeLabel } = useScoring()

const bankId = computed(() => String(route.params.bankId))
const bank = ref<QuestionBank | null>(null)
const questions = ref<Question[]>([])
const loading = ref(true)
const error = ref('')

function normalizeOptions(raw: unknown): QuestionOption[] {
  if (!Array.isArray(raw)) return []
  return raw.map((o) => o as QuestionOption)
}

async function load() {
  loading.value = true
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
  const { data, error: qErr } = await supabase
    .from('questions')
    .select('*')
    .eq('bank_id', bankId.value)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  if (qErr) error.value = qErr.message
  else questions.value = (data ?? []).map((q) => ({ ...q, options: normalizeOptions(q.options) })) as Question[]
  loading.value = false
}

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <section class="flex flex-wrap items-end justify-between gap-3 py-4 md:py-6">
      <div>
        <p class="page-kicker">预览</p>
        <h1 class="page-title">{{ bank?.title ?? '学习者视角' }}</h1>
        <p class="page-lede">发布前预览：不展示答案与解析。</p>
      </div>
      <button class="btn-secondary" type="button" @click="router.push(`/banks/${bankId}/manage`)">返回管理</button>
    </section>

    <p v-if="loading" class="px-3 py-16 text-center text-muted">加载中…</p>
    <p v-else-if="error" class="alert-error">{{ error }}</p>

    <div v-else class="flex flex-col gap-4">
      <p class="surface m-0 px-4 py-3 text-sm text-muted">{{ bank?.description || '暂无简介' }}</p>

      <article
        v-for="(q, idx) in questions"
        :key="q.id"
        class="surface flex flex-col gap-3 px-4 py-4"
      >
        <section
          v-if="resolveCaseMaterial(questions, idx)"
          class="rounded-xl border border-line bg-raise/60 px-3 py-3 text-sm leading-relaxed"
        >
          <p class="m-0 mb-1 text-xs font-semibold text-muted uppercase">案例材料</p>
          <p class="m-0 whitespace-pre-wrap">{{ resolveCaseMaterial(questions, idx) }}</p>
        </section>
        <p class="m-0 text-xs text-muted">{{ idx + 1 }}. {{ questionTypeLabel(q.qtype) }}</p>
        <h2 class="m-0 text-base font-semibold text-ink">{{ q.stem }}</h2>
        <ul class="m-0 flex list-none flex-col gap-2 p-0">
          <li
            v-for="opt in q.options"
            :key="opt.key"
            class="rounded-xl border border-line bg-raise/40 px-3 py-2.5 text-sm"
          >
            <span v-if="q.qtype !== 'judgement'" class="mr-2 font-semibold text-spark">{{ opt.key }}.</span>
            {{ opt.text }}
          </li>
        </ul>
      </article>

      <p v-if="!questions.length" class="surface py-12 text-center text-muted">没有有效题目可预览。</p>
    </div>
  </div>
</template>
