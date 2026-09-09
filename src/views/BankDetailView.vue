<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { expireStaleSessions } from '../composables/usePracticeProgress'
import { useAuth } from '../composables/useAuth'
import { formatErrorMessage } from '../lib/errors'
import { canPublishBank } from '../lib/practiceOrder'
import { isResumableSession } from '../lib/practiceResume'
import { supabase } from '../lib/supabase'
import type { QuestionBank } from '../lib/types'

const route = useRoute()
const router = useRouter()
const auth = useAuth()

const bankId = computed(() => String(route.params.bankId))
const bank = ref<QuestionBank | null>(null)
const ownerName = ref('')
const hasResume = ref(false)
const loading = ref(true)
const error = ref('')
const actionError = ref('')

const canManage = computed(() => {
  if (!bank.value || !auth.user.value) return false
  return bank.value.owner_id === auth.user.value.id || auth.admin.value
})

const canStart = computed(() => {
  if (!bank.value) return false
  if (bank.value.question_count === 0) return false
  if (bank.value.is_published) return true
  return canManage.value
})

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function quizPath(extra: Record<string, string> = {}) {
  const params = new URLSearchParams({ new: '1', ...extra })
  return `/quiz/${bankId.value}?${params.toString()}`
}

async function load() {
  loading.value = true
  error.value = ''
  const { data, error: err } = await supabase
    .from('question_banks')
    .select('*')
    .eq('id', bankId.value)
    .maybeSingle()
  if (err || !data) {
    error.value = formatErrorMessage(err, '题库不存在或未发布')
    loading.value = false
    return
  }
  bank.value = data as QuestionBank

  const { data: owner } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', data.owner_id)
    .maybeSingle()
  ownerName.value = owner?.display_name || '上传者'

  if (auth.user.value) {
    await expireStaleSessions(auth.user.value.id)
    const { data: sessions } = await supabase
      .from('attempt_sessions')
      .select('started_at, finished_at, expired_at')
      .eq('user_id', auth.user.value.id)
      .eq('bank_id', bankId.value)
      .is('finished_at', null)
      .is('expired_at', null)
      .limit(1)
    hasResume.value = Boolean(sessions?.some((s) => isResumableSession(s)))
  }
  loading.value = false
}

async function togglePublish() {
  if (!bank.value) return
  actionError.value = ''
  if (!bank.value.is_published && !canPublishBank(bank.value.question_count)) {
    actionError.value = '空题库不能发布，请先导入或新增有效题目'
    return
  }
  const { error: err } = await supabase
    .from('question_banks')
    .update({ is_published: !bank.value.is_published, updated_at: new Date().toISOString() })
    .eq('id', bank.value.id)
  if (err) actionError.value = formatErrorMessage(err, '更新发布状态失败')
  else await load()
}

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <section class="flex flex-wrap items-end justify-between gap-3 py-4 md:py-6">
      <div>
        <p class="page-kicker">题库详情</p>
        <h1 class="page-title">{{ bank?.title ?? '题库' }}</h1>
        <p class="page-lede">选择顺序、随机、错题或未做题开始；也可组卷进入答题模式。</p>
      </div>
      <button class="btn-secondary" type="button" @click="router.push('/banks')">返回列表</button>
    </section>

    <p v-if="loading" class="px-3 py-16 text-center text-muted">加载中…</p>
    <p v-else-if="error" class="alert-error">{{ error }}</p>

    <template v-else-if="bank">
      <p v-if="actionError" class="alert-error mb-4">{{ actionError }}</p>
      <article class="surface flex flex-col gap-3 md:p-6">
        <div class="flex flex-wrap gap-2">
          <span v-if="bank.bank_kind === 'exam'" class="chip">真题卷</span>
          <span v-if="bank.is_published" class="chip-lit">已发布</span>
          <span v-else class="chip">未发布 · 仅自己可见</span>
        </div>
        <p class="m-0 text-sm leading-relaxed text-muted">{{ bank.description || '暂无简介' }}</p>
        <p class="m-0 text-sm text-muted">
          {{ bank.question_count }} 题 · 更新于 {{ fmtDate(bank.updated_at) }} · 发布者 {{ ownerName }}
        </p>
      </article>

      <p v-if="!canStart" class="alert-warn mt-4">
        {{
          bank.question_count === 0
            ? '空题库不能开始刷题或组卷。'
            : '未发布题库不对学习者开放新会话。'
        }}
      </p>

      <div class="mt-5 grid gap-2 sm:grid-cols-2">
        <button
          v-if="hasResume && bank.bank_kind !== 'exam'"
          class="btn"
          type="button"
          @click="router.push(`/quiz/${bank.id}`)"
        >
          继续上次练习
        </button>
        <button
          v-if="bank.bank_kind === 'exam'"
          class="btn"
          type="button"
          :disabled="!canStart"
          @click="router.push(`/banks/${bank.id}/exam`)"
        >
          真题模考
        </button>
        <button
          v-else
          class="btn"
          type="button"
          :disabled="!canStart"
          @click="router.push(quizPath({ order: 'seq' }))"
        >
          顺序刷题
        </button>
        <button
          v-if="bank.bank_kind !== 'exam'"
          class="btn-secondary"
          type="button"
          :disabled="!canStart"
          @click="router.push(quizPath({ order: 'random' }))"
        >
          随机刷题
        </button>
        <button
          v-if="bank.bank_kind !== 'exam'"
          class="btn-secondary"
          type="button"
          :disabled="!canStart"
          @click="router.push(quizPath({ unanswered: '1' }))"
        >
          仅未做
        </button>
        <button
          class="btn-secondary"
          type="button"
          :disabled="!canStart"
          @click="router.push(quizPath({ wrong: '1' }))"
        >
          仅错题
        </button>
        <button
          v-if="bank.bank_kind !== 'exam'"
          class="btn-secondary"
          type="button"
          :disabled="!canStart"
          @click="router.push(`/banks/${bank.id}/paper`)"
        >
          随机组卷 / 答题
        </button>
      </div>

      <div v-if="canManage" class="mt-6 flex flex-wrap gap-2">
        <button class="btn-secondary" type="button" @click="router.push(`/banks/${bank.id}/manage`)">
          管理题目
        </button>
        <button class="btn-secondary" type="button" @click="togglePublish">
          {{ bank.is_published ? '下架' : '发布' }}
        </button>
      </div>
    </template>
  </div>
</template>
