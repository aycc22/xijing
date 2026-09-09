<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { expireStaleSessions } from '../composables/usePracticeProgress'
import { formatErrorMessage } from '../lib/errors'
import { pageRange, totalPages } from '../lib/pagination'
import { canPublishBank } from '../lib/practiceOrder'
import { isResumableSession } from '../lib/practiceResume'
import { supabase } from '../lib/supabase'
import { useAuth } from '../composables/useAuth'
import type { QuestionBank } from '../lib/types'

const auth = useAuth()
const route = useRoute()
const router = useRouter()

const banks = ref<QuestionBank[]>([])
const total = ref(0)
const page = ref(1)
const keyword = ref('')
const activeBankIds = ref<Set<string>>(new Set())
const error = ref('')
const loading = ref(true)
const PAGE_SIZE = 20

const pages = computed(() => totalPages(total.value, PAGE_SIZE))

async function loadActiveSessions() {
  activeBankIds.value = new Set()
  if (!auth.user.value) return
  await expireStaleSessions(auth.user.value.id)
  const { data } = await supabase
    .from('attempt_sessions')
    .select('bank_id, started_at, finished_at, expired_at')
    .eq('user_id', auth.user.value.id)
    .is('finished_at', null)
    .is('expired_at', null)
  for (const session of data ?? []) {
    if (isResumableSession(session)) activeBankIds.value.add(session.bank_id)
  }
}

function hasActiveSession(bankId: string) {
  return activeBankIds.value.has(bankId)
}

function canManage(bank: QuestionBank) {
  return bank.owner_id === auth.user.value?.id || auth.admin.value
}

function canStart(bank: QuestionBank) {
  if (bank.question_count === 0) return false
  if (bank.is_published) return true
  return canManage(bank)
}

function sanitizeKeyword(raw: string): string {
  return raw.trim().replace(/[%_,()]/g, ' ').replace(/\s+/g, ' ')
}

async function load() {
  loading.value = true
  error.value = ''
  const { from, to, page: safePage } = pageRange(page.value, PAGE_SIZE)
  page.value = safePage
  const q = sanitizeKeyword(keyword.value)
  let query = supabase
    .from('question_banks')
    .select('*', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(from, to)
  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)
  }
  const { data, error: err, count } = await query
  if (err) error.value = formatErrorMessage(err, '加载题库失败')
  else {
    banks.value = (data ?? []) as QuestionBank[]
    total.value = count ?? 0
  }
  await loadActiveSessions()
  loading.value = false
}

async function togglePublish(bank: QuestionBank) {
  error.value = ''
  if (!bank.is_published && !canPublishBank(bank.question_count)) {
    error.value = '空题库不能发布，请先导入或新增有效题目'
    return
  }
  const { error: err } = await supabase
    .from('question_banks')
    .update({ is_published: !bank.is_published, updated_at: new Date().toISOString() })
    .eq('id', bank.id)
  if (err) {
    error.value = formatErrorMessage(err, '更新发布状态失败')
    return
  }
  await load()
}

async function removeBank(bank: QuestionBank) {
  error.value = ''
  const { data: hasRecords, error: checkErr } = await supabase.rpc('bank_has_learning_records', {
    p_bank_id: bank.id,
  })
  if (checkErr) {
    error.value = formatErrorMessage(checkErr, '无法检查题库使用记录')
    return
  }
  if (hasRecords) {
    error.value = '该题库已有练习、错题或收藏等学习记录，不能删除。请改为下架。'
    return
  }
  if (!confirm(`删除题库「${bank.title}」？题目会一并删除。`)) return
  const { error: err } = await supabase.from('question_banks').delete().eq('id', bank.id)
  if (err) error.value = formatErrorMessage(err, '删除失败')
  else await load()
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(keyword, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    void load()
  }, 280)
})

onMounted(load)
</script>

<template>
  <div>
    <section class="flex flex-wrap items-end justify-between gap-3 py-4 md:py-6">
      <div>
        <p class="page-kicker">练习</p>
        <h1 class="page-title">题库</h1>
        <p class="page-lede">已发布对所有人可见；未发布仅自己可见。点进详情选择刷题方式。</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          v-if="auth.hasUpload.value"
          class="btn hidden sm:inline-flex"
          type="button"
          @click="router.push('/upload')"
        >
          上传题库
        </button>
        <button class="btn-secondary" type="button" :disabled="loading" @click="load">刷新</button>
      </div>
    </section>

    <p v-if="route.query.need === 'upload'" class="alert-warn mb-4">
      你还没有上传权限。请联系管理员在「权限」页把你升为上传者。
    </p>

    <div class="field mb-4">
      <label class="sr-only" for="bank-search">搜索题库</label>
      <input
        id="bank-search"
        v-model="keyword"
        type="search"
        placeholder="按名称或简介搜索"
        autocomplete="off"
      />
    </div>

    <p v-if="error" class="alert-error mb-4">{{ error }}</p>

    <div v-if="loading" class="px-3 py-16 text-center text-muted">加载中…</div>
    <div v-else-if="!banks.length" class="surface py-14 text-center">
      <p class="m-0 font-medium text-ink">{{ keyword.trim() ? '没有匹配的题库' : '还没有题库' }}</p>
      <p class="mt-1.5 text-sm text-muted">
        {{ keyword.trim() ? '换个关键词试试。' : '有上传权限的用户可以先导入题目。' }}
      </p>
      <button
        v-if="auth.hasUpload.value && !keyword.trim()"
        class="btn mt-6"
        type="button"
        @click="router.push('/upload')"
      >
        去上传
      </button>
    </div>

    <ul
      v-else
      class="m-0 flex list-none flex-col gap-3 p-0 md:grid md:grid-cols-2 md:items-start md:gap-4"
    >
      <li v-for="bank in banks" :key="bank.id">
        <article class="surface flex h-full flex-col">
          <button
            type="button"
            class="cursor-pointer border-0 bg-transparent p-0 text-left"
            @click="router.push(`/banks/${bank.id}`)"
          >
            <div class="flex items-start justify-between gap-3">
              <h2 class="m-0 text-lg font-semibold leading-snug text-ink">{{ bank.title }}</h2>
              <div class="flex shrink-0 items-center gap-2">
                <span v-if="bank.bank_kind === 'exam'" class="chip">真题卷</span>
                <span v-if="bank.is_published" class="chip-lit">已发布</span>
                <span v-else class="chip">未发布</span>
              </div>
            </div>
            <p class="m-0 mt-3 line-clamp-2 text-sm leading-relaxed text-muted">
              {{ bank.description || '暂无简介' }}
            </p>
            <p class="m-0 mt-3 text-xs tracking-wide text-muted">
              <span class="font-semibold text-spark tabular-nums">{{ bank.question_count }}</span>
              题 · 更新于 {{ fmtDate(bank.updated_at) }}
            </p>
          </button>

          <div class="mt-3 flex flex-wrap items-center gap-2 border-t border-line/60 pt-3">
            <button
              v-if="bank.bank_kind === 'exam'"
              class="btn flex-1 sm:flex-none"
              type="button"
              :disabled="!canStart(bank)"
              @click="router.push(`/banks/${bank.id}/exam`)"
            >
              真题模考
            </button>
            <button
              v-else-if="hasActiveSession(bank.id)"
              class="btn flex-1 sm:flex-none"
              type="button"
              @click="router.push(`/quiz/${bank.id}`)"
            >
              继续练习
            </button>
            <button
              v-else
              class="btn flex-1 sm:flex-none"
              type="button"
              :disabled="!canStart(bank)"
              @click="router.push(`/banks/${bank.id}`)"
            >
              开始学习
            </button>
            <template v-if="canManage(bank)">
              <button class="btn-secondary" type="button" @click="router.push(`/banks/${bank.id}/manage`)">
                管理
              </button>
              <button class="btn-secondary" type="button" @click="togglePublish(bank)">
                {{ bank.is_published ? '下架' : '发布' }}
              </button>
              <button class="btn-ghost text-bad hover:text-bad" type="button" @click="removeBank(bank)">
                删除
              </button>
            </template>
          </div>
        </article>
      </li>
    </ul>

    <div v-if="pages > 1" class="mt-5 flex items-center justify-center gap-3">
      <button class="btn-secondary" type="button" :disabled="page <= 1" @click="page -= 1; load()">
        上一页
      </button>
      <span class="text-sm text-muted tabular-nums">{{ page }} / {{ pages }}</span>
      <button
        class="btn-secondary"
        type="button"
        :disabled="page >= pages"
        @click="page += 1; load()"
      >
        下一页
      </button>
    </div>
  </div>
</template>
