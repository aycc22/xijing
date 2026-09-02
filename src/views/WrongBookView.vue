<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { formatAnswerLabel } from '../lib/practiceResult'
import {
  bankFilterOptions,
  filterEntriesByBank,
  loadWrongBookEntries,
  type WrongBookEntry,
} from '../lib/wrongBook'
import { supabase } from '../lib/supabase'
import { useAuth } from '../composables/useAuth'

const auth = useAuth()
const router = useRouter()

const entries = ref<WrongBookEntry[]>([])
const bankFilter = ref('all')
const loading = ref(true)
const error = ref('')

const bankOptions = computed(() => bankFilterOptions(entries.value))
const visibleEntries = computed(() => filterEntriesByBank(entries.value, bankFilter.value))

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

function startWrongPractice(bankId: string) {
  router.push(`/quiz/${bankId}?wrong=1&new=1`)
}

function loadErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : ''
  if (msg.includes('wrong_question_items') || msg.includes('schema cache')) {
    return '错题本服务未就绪，请稍后再试'
  }
  return msg || '加载失败'
}

async function load() {
  loading.value = true
  error.value = ''
  await auth.init()
  if (!auth.user.value) {
    error.value = '请先登录'
    loading.value = false
    return
  }
  try {
    entries.value = await loadWrongBookEntries(supabase, auth.user.value.id)
  } catch (err) {
    error.value = loadErrorMessage(err)
  }
  loading.value = false
}

onMounted(load)
</script>

<template>
  <div>
    <section class="flex flex-wrap items-end justify-between gap-3 py-4 md:py-6">
      <div>
        <p class="page-kicker">复习</p>
        <h1 class="page-title">错题本</h1>
        <p class="page-lede">答错或「暂不会」的题目会自动收录；答对不会自动移除。</p>
      </div>
      <button class="btn-secondary" type="button" :disabled="loading" @click="load">刷新</button>
    </section>

    <p v-if="loading" class="px-3 py-16 text-center text-muted">加载中…</p>
    <p v-else-if="error" class="alert-error">{{ error }}</p>

    <div v-else-if="!entries.length" class="surface py-14 text-center">
      <p class="m-0 font-medium text-ink">还没有错题</p>
      <p class="mt-1.5 text-sm text-muted">刷题答错后会自动出现在这里。</p>
      <button class="btn mt-6" type="button" @click="router.push('/banks')">去刷题</button>
    </div>

    <template v-else>
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <label class="sr-only" for="bank-filter">按题库筛选</label>
        <select id="bank-filter" v-model="bankFilter" class="field min-h-11 rounded-xl border border-line bg-raise/60 px-3 py-2 text-sm">
          <option value="all">全部题库（{{ entries.length }}）</option>
          <option v-for="bank in bankOptions" :key="bank.id" :value="bank.id">
            {{ bank.title }}（{{ bank.count }}）
          </option>
        </select>
        <button
          v-if="bankFilter !== 'all'"
          class="btn min-h-11"
          type="button"
          @click="startWrongPractice(bankFilter)"
        >
          刷本库错题
        </button>
      </div>

      <ul class="m-0 flex list-none flex-col gap-3 p-0">
        <li v-for="entry in visibleEntries" :key="entry.id">
          <article class="surface flex flex-col gap-2 px-4 py-3.5">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <p class="m-0 text-xs text-muted">{{ entry.bank_title }}</p>
                <p class="m-0 mt-1 line-clamp-2 text-sm font-medium text-ink">{{ entry.stem }}</p>
              </div>
              <span class="chip shrink-0 tabular-nums">×{{ entry.wrong_count }}</span>
            </div>
            <p class="m-0 text-xs text-muted">
              最近答错 {{ fmtDate(entry.last_wrong_at) }} ·
              上次答案 {{ formatAnswerLabel(entry.last_wrong_keys, entry.qtype, []) || '未作答' }}
            </p>
          </article>
        </li>
      </ul>
    </template>
  </div>
</template>
