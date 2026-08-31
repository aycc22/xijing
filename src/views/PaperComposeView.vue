<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  checkInventory,
  composePaper,
  countByType,
  createSeed,
  formatShortages,
  totalRequested,
  type TypeCounts,
} from '../lib/paperCompose'
import { supabase } from '../lib/supabase'
import { useAuth } from '../composables/useAuth'
import type { QuestionBank } from '../lib/types'

const route = useRoute()
const router = useRouter()
const auth = useAuth()

const bankId = computed(() => String(route.params.bankId))
const bank = ref<QuestionBank | null>(null)
const inventory = ref<TypeCounts>({ single: 0, multiple: 0, judgement: 0 })
const counts = ref<TypeCounts>({ single: 5, multiple: 0, judgement: 0 })
const pool = ref<{ id: string; qtype: string; case_id: string | null; is_active: boolean }[]>([])
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const shortagesText = ref('')

const requestedTotal = computed(() => totalRequested(counts.value))
const canGenerate = computed(() => requestedTotal.value > 0 && !shortagesText.value)

watch(
  counts,
  () => {
    const shortages = checkInventory(pool.value as never, counts.value)
    shortagesText.value = shortages.length ? formatShortages(shortages) : ''
  },
  { deep: true },
)

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

  const { data: questions, error: qErr } = await supabase
    .from('questions')
    .select('id, qtype, case_id, is_active')
    .eq('bank_id', bankId.value)
    .eq('is_active', true)
  if (qErr) {
    error.value = qErr.message
    loading.value = false
    return
  }
  pool.value = (questions ?? []) as typeof pool.value
  inventory.value = countByType(pool.value as never)

  const defaults: TypeCounts = {
    single: Math.min(5, inventory.value.single),
    multiple: Math.min(2, inventory.value.multiple),
    judgement: Math.min(2, inventory.value.judgement),
  }
  if (totalRequested(defaults) === 0) {
    defaults.single = inventory.value.single
    defaults.multiple = inventory.value.multiple
    defaults.judgement = inventory.value.judgement
  }
  counts.value = defaults
  loading.value = false
}

async function generate() {
  error.value = ''
  if (!auth.user.value) {
    error.value = '请先登录'
    return
  }
  if (!canGenerate.value) {
    error.value = shortagesText.value || '请至少指定 1 道题'
    return
  }
  busy.value = true
  try {
    const seed = createSeed()
    const result = composePaper(pool.value as never, { counts: counts.value, seed })
    if (!result.ok) {
      shortagesText.value = formatShortages(result.shortages)
      error.value = shortagesText.value
      return
    }
    const { data: paper, error: pErr } = await supabase
      .from('paper_instances')
      .insert({
        bank_id: bankId.value,
        user_id: auth.user.value.id,
        seed: result.seed,
        question_ids: result.questionIds,
        scores: result.scores,
        total_score: result.totalScore,
        counts: counts.value,
      })
      .select('id')
      .single()
    if (pErr) throw pErr
    await router.push(`/papers/${paper.id}`)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '组卷失败'
  } finally {
    busy.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-xl">
    <section class="py-4 md:py-6">
      <p class="page-kicker">组卷</p>
      <h1 class="page-title">随机组卷</h1>
      <p class="page-lede">
        {{ bank?.title ?? '题库' }} · 按题型抽题；库存不足不会生成残缺试卷。
      </p>
    </section>

    <p v-if="loading" class="px-3 py-16 text-center text-muted">加载题库…</p>
    <p v-else-if="error && !bank" class="alert-error">{{ error }}</p>

    <form v-else class="surface flex flex-col gap-4 md:p-6" @submit.prevent="generate">
      <p class="m-0 text-sm text-muted">
        库存：单选 {{ inventory.single }} · 多选 {{ inventory.multiple }} · 判断 {{ inventory.judgement }}
      </p>

      <div class="grid gap-3 sm:grid-cols-3">
        <div class="field">
          <label for="count-single">单选题量</label>
          <input
            id="count-single"
            v-model.number="counts.single"
            type="number"
            min="0"
            :max="inventory.single"
          />
        </div>
        <div class="field">
          <label for="count-multiple">多选题量</label>
          <input
            id="count-multiple"
            v-model.number="counts.multiple"
            type="number"
            min="0"
            :max="inventory.multiple"
          />
        </div>
        <div class="field">
          <label for="count-judgement">判断题量</label>
          <input
            id="count-judgement"
            v-model.number="counts.judgement"
            type="number"
            min="0"
            :max="inventory.judgement"
          />
        </div>
      </div>

      <p class="m-0 text-sm text-ink">
        合计约
        <span class="font-semibold tabular-nums text-spark">{{ requestedTotal }}</span>
        道小题 · 默认总分 100（平均分配）
      </p>
      <p class="m-0 text-xs text-muted">若抽中案例小题，将自动带入该案例全部有效小题，实际题量可能多于上方指定。</p>

      <p v-if="shortagesText" class="alert-error m-0">{{ shortagesText }}</p>
      <p v-if="error && bank" class="alert-error m-0">{{ error }}</p>

      <div class="flex flex-wrap gap-2">
        <button class="btn flex-1" type="submit" :disabled="busy || !canGenerate">
          {{ busy ? '生成中…' : '生成试卷' }}
        </button>
        <button class="btn-secondary" type="button" @click="router.push('/banks')">返回</button>
      </div>
    </form>
  </div>
</template>
