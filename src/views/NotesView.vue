<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { formatErrorMessage } from '../lib/errors'
import { loadNoteList, type LearningListItem } from '../lib/userLearning'
import { supabase } from '../lib/supabase'

const auth = useAuth()
const router = useRouter()
const items = ref<LearningListItem[]>([])
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  if (!auth.user.value) {
    error.value = '请先登录'
    loading.value = false
    return
  }
  try {
    items.value = await loadNoteList(supabase, auth.user.value.id)
  } catch (err) {
    error.value = formatErrorMessage(err, '加载笔记失败')
  }
  loading.value = false
}

onMounted(load)
</script>

<template>
  <div>
    <section class="flex flex-wrap items-end justify-between gap-3 py-4 md:py-6">
      <div>
        <p class="page-kicker">学习</p>
        <h1 class="page-title">笔记</h1>
        <p class="page-lede">你写下的私人笔记。点击题目可回到刷题页继续修改。</p>
      </div>
      <button class="btn-secondary" type="button" :disabled="loading" @click="load">刷新</button>
    </section>
    <p v-if="loading" class="px-3 py-16 text-center text-muted">加载中…</p>
    <p v-else-if="error" class="alert-error">{{ error }}</p>
    <div v-else-if="!items.length" class="surface py-14 text-center">
      <p class="m-0 font-medium text-ink">还没有笔记</p>
      <p class="mt-1.5 text-sm text-muted">提交答案后可以为题目记录思路。</p>
      <button class="btn mt-6" type="button" @click="router.push('/banks')">去题库</button>
    </div>
    <ul v-else class="m-0 flex list-none flex-col gap-3 p-0">
      <li v-for="item in items" :key="item.question_id">
        <button
          type="button"
          class="surface card-link flex w-full flex-col gap-1 px-4 py-3.5 text-left"
          @click="router.push(`/quiz/${item.bank_id}?new=1&qid=${item.question_id}`)"
        >
          <p class="m-0 text-xs text-muted">{{ item.bank_title }}</p>
          <p class="m-0 line-clamp-2 text-sm font-medium text-ink">{{ item.stem }}</p>
          <p class="m-0 mt-1 line-clamp-3 text-sm text-muted">{{ item.extra }}</p>
        </button>
      </li>
    </ul>
  </div>
</template>
