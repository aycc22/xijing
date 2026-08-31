<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { expireStaleSessions } from '../composables/usePracticeProgress'
import { isResumableSession } from '../lib/practiceResume'
import { supabase } from '../lib/supabase'
import { useAuth } from '../composables/useAuth'
import type { QuestionBank } from '../lib/types'

const auth = useAuth()
const route = useRoute()
const router = useRouter()

const banks = ref<QuestionBank[]>([])
const activeBankIds = ref<Set<string>>(new Set())
const expandedId = ref<string | null>(null)
const error = ref('')
const loading = ref(true)

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

function toggleExpand(bankId: string) {
  expandedId.value = expandedId.value === bankId ? null : bankId
}

function isExpanded(bankId: string) {
  return expandedId.value === bankId
}

function canManage(bank: QuestionBank) {
  return bank.owner_id === auth.user.value?.id || auth.admin.value
}

async function load() {
  loading.value = true
  error.value = ''
  const { data, error: err } = await supabase
    .from('question_banks')
    .select('*')
    .order('updated_at', { ascending: false })
  if (err) error.value = err.message
  else banks.value = (data ?? []) as QuestionBank[]
  await loadActiveSessions()
  loading.value = false
}

async function togglePublish(bank: QuestionBank) {
  const { error: err } = await supabase
    .from('question_banks')
    .update({ is_published: !bank.is_published, updated_at: new Date().toISOString() })
    .eq('id', bank.id)
  if (err) {
    error.value = err.message
    return
  }
  await load()
}

async function removeBank(bank: QuestionBank) {
  if (!confirm(`删除题库「${bank.title}」？题目会一并删除。`)) return
  const { error: err } = await supabase.from('question_banks').delete().eq('id', bank.id)
  if (err) error.value = err.message
  else {
    if (expandedId.value === bank.id) expandedId.value = null
    await load()
  }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

onMounted(load)
</script>

<template>
  <div>
    <section class="flex flex-wrap items-end justify-between gap-3 py-4 md:py-6">
      <div>
        <p class="page-kicker">练习</p>
        <h1 class="page-title">题库</h1>
        <p class="page-lede">已发布对所有人可见；未发布仅自己可见。</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          v-if="auth.hasUpload.value"
          class="btn hidden sm:inline-flex"
          type="button"
          @click="router.push('/upload')"
        >
          上传 CSV
        </button>
        <button class="btn-secondary" type="button" :disabled="loading" @click="load">刷新</button>
      </div>
    </section>

    <p v-if="route.query.need === 'upload'" class="alert-warn mb-4">
      你还没有上传权限。请联系管理员在「权限」页把你升为上传者。
    </p>

    <p v-if="error" class="alert-error mb-4">{{ error }}</p>

    <div v-if="loading" class="px-3 py-16 text-center text-muted">加载中…</div>
    <div v-else-if="!banks.length" class="surface py-14 text-center">
      <svg class="mx-auto size-8 text-spark/70" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10v16H5.5A1.5 1.5 0 0 1 4 18.5v-13ZM14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14V4Z"
          stroke="currentColor"
          stroke-width="1.4"
        />
      </svg>
      <p class="m-0 mt-3 font-medium text-ink">还没有题库</p>
      <p class="mt-1.5 text-sm text-muted">有上传权限的用户可以先导入 CSV。</p>
      <button
        v-if="auth.hasUpload.value"
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
        <article
          class="surface card-link flex h-full flex-col"
          :class="isExpanded(bank.id) ? 'border-spark/35' : ''"
        >
          <div class="flex flex-col gap-3">
            <div class="cursor-pointer" @click="toggleExpand(bank.id)">
              <div class="flex items-start justify-between gap-3">
                <h2 class="m-0 text-lg font-semibold leading-snug text-ink">{{ bank.title }}</h2>
                <div class="flex shrink-0 items-center gap-2">
                  <span v-if="bank.is_published" class="chip-lit">已发布</span>
                  <span v-else class="chip">未发布</span>
                  <button
                    class="icon-btn"
                    type="button"
                    :aria-expanded="isExpanded(bank.id)"
                    :aria-label="isExpanded(bank.id) ? '收起操作' : '展开操作'"
                    @click.stop="toggleExpand(bank.id)"
                  >
                    <svg
                      class="size-4 transition-transform duration-300 ease-out motion-reduce:transition-none"
                      :class="isExpanded(bank.id) ? 'rotate-180' : ''"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M6 9l6 6 6-6"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <p class="m-0 mt-3 line-clamp-2 text-sm leading-relaxed text-muted">
                {{ bank.description || '暂无简介' }}
              </p>
              <p class="m-0 mt-3 text-xs tracking-wide text-muted">
                <span class="font-semibold text-spark tabular-nums">{{ bank.question_count }}</span>
                题 · 更新于 {{ fmtDate(bank.updated_at) }}
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2 border-t border-line/60 pt-3">
              <button
                v-if="hasActiveSession(bank.id)"
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
                :disabled="bank.question_count === 0"
                @click="router.push(`/quiz/${bank.id}?new=1`)"
              >
                开始刷题
              </button>
            </div>
          </div>

          <div
            class="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
            :class="isExpanded(bank.id) ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
          >
            <div class="overflow-hidden">
              <div class="mt-3 flex flex-wrap items-center gap-2 border-t border-line/60 pt-3">
                <button
                  v-if="hasActiveSession(bank.id)"
                  class="btn-secondary"
                  type="button"
                  @click="router.push(`/quiz/${bank.id}?new=1`)"
                >
                  重新开始
                </button>
                <button
                  class="btn-secondary"
                  type="button"
                  :disabled="bank.question_count === 0"
                  @click="router.push(`/banks/${bank.id}/paper`)"
                >
                  随机组卷
                </button>
                <template v-if="canManage(bank)">
                  <span class="mx-0.5 hidden h-5 w-px bg-line/70 sm:inline-block" aria-hidden="true" />
                  <button
                    class="btn-secondary"
                    type="button"
                    @click="router.push(`/banks/${bank.id}/manage`)"
                  >
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
            </div>
          </div>
        </article>
      </li>
    </ul>
  </div>
</template>
