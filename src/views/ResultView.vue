<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import type { AttemptSession } from '../lib/types'

const route = useRoute()
const router = useRouter()
const session = ref<AttemptSession | null>(null)
const error = ref('')

onMounted(async () => {
  const { data, error: err } = await supabase
    .from('attempt_sessions')
    .select('*')
    .eq('id', String(route.params.sessionId))
    .maybeSingle()
  if (err) error.value = err.message
  else session.value = data as AttemptSession | null
})

const rate = computed(() => {
  if (!session.value?.total_count) return 0
  return Math.round((session.value.correct_count / session.value.total_count) * 100)
})

const verdict = computed(() => {
  if (rate.value >= 90) return '路径清晰'
  if (rate.value >= 70) return '稳步向前'
  if (rate.value >= 50) return '还需巩固'
  return '再走一程'
})
</script>

<template>
  <div>
    <p v-if="error" class="alert-error">{{ error }}</p>

    <div v-else-if="session" class="flex flex-col items-stretch gap-6 py-4 md:py-8">
      <section class="relative overflow-hidden py-8 text-center md:py-12">
        <div class="halo pointer-events-none absolute inset-0" aria-hidden="true"></div>

        <p class="page-kicker relative">本次结果</p>
        <p
          class="font-display relative m-0 mt-3 text-[clamp(3.4rem,18vw,5.5rem)] leading-none tracking-wide text-ink tabular-nums"
        >
          {{ session.correct_count }}
          <span class="text-[0.4em] text-muted"> / {{ session.total_count }}</span>
        </p>
        <p class="font-display relative mt-4 text-xl tracking-wide text-spark">{{ verdict }}</p>
        <p class="relative mt-1.5 text-sm text-muted">正确率 {{ rate }}%</p>

        <div class="path-track relative mx-auto mt-7 max-w-xs">
          <span class="path-fill" :style="{ width: rate + '%' }" />
        </div>
      </section>

      <div class="flex flex-col gap-2.5 sm:mx-auto sm:w-full sm:max-w-sm sm:flex-row">
        <button class="btn btn-block" type="button" @click="router.push(`/quiz/${session.bank_id}`)">
          再刷一遍
        </button>
        <button class="btn-secondary btn-block" type="button" @click="router.push('/banks')">
          返回题库
        </button>
      </div>
    </div>

    <p v-else class="px-3 py-16 text-center text-muted">加载中…</p>
  </div>
</template>
