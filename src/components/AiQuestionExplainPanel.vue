<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  aiErrorUserMessage,
  invokeAiProxy,
  type AiProxyError,
  type ExplainQuestionResponse,
} from '../lib/aiProxy'
import { userResultCaption } from '../lib/aiExplain'

const props = defineProps<{
  questionId: string
  sessionId: string
  sessionType: 'practice' | 'exam'
  isCorrect?: boolean | null
  isSkipped?: boolean
}>()

const loading = ref(false)
const error = ref<AiProxyError | null>(null)
const payload = ref<ExplainQuestionResponse | null>(null)

const caption = computed(() => {
  const result = payload.value?.user_result
  if (result) return userResultCaption(result)
  if (props.isSkipped) return userResultCaption({ is_correct: false, is_skipped: true })
  if (typeof props.isCorrect === 'boolean') {
    return userResultCaption({ is_correct: props.isCorrect, is_skipped: false })
  }
  return ''
})

watch(
  () => [props.questionId, props.sessionId],
  () => {
    payload.value = null
    error.value = null
    loading.value = false
  },
)

async function load(force = false) {
  loading.value = true
  error.value = null
  const result = await invokeAiProxy({
    action: 'explain_question',
    question_id: props.questionId,
    session_type: props.sessionType,
    session_id: props.sessionId,
    force,
  })
  loading.value = false
  if (!result.ok) {
    error.value = result.error
    return
  }
  payload.value = result.data
}

const explain = computed(() => payload.value?.explain ?? null)
const errorText = computed(() => (error.value ? aiErrorUserMessage(error.value) : ''))
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex flex-wrap gap-2">
      <button
        class="btn-secondary min-h-11"
        type="button"
        :disabled="loading"
        @click="load(false)"
      >
        {{ loading ? '点评生成中…' : explain ? '查看 AI 点评' : 'AI 点评' }}
      </button>
      <button
        v-if="explain && error?.code !== 'ai_disabled'"
        class="btn-ghost min-h-11"
        type="button"
        :disabled="loading"
        @click="load(true)"
      >
        重新生成
      </button>
    </div>

    <p v-if="error" class="alert-warn m-0 text-sm">
      {{ error.code === 'ai_disabled' ? '智能点评暂未开通' : errorText }}
    </p>

    <div
      v-if="explain"
      class="flex flex-col gap-2 rounded-xl border border-line/70 bg-raise/40 px-3.5 py-3"
    >
      <p v-if="caption" class="m-0 text-xs text-muted">{{ caption }}</p>
      <p v-if="explain.intent" class="m-0 text-sm leading-relaxed text-ink">
        <span class="font-semibold">考查意图</span> · {{ explain.intent }}
      </p>
      <div v-if="explain.exam_points?.length" class="flex flex-col gap-1">
        <p class="m-0 text-xs font-medium text-muted">考点</p>
        <div class="flex flex-wrap gap-1">
          <span v-for="point in explain.exam_points" :key="point" class="chip">{{ point }}</span>
        </div>
      </div>
      <ul v-if="explain.pitfalls?.length" class="m-0 flex list-disc flex-col gap-1 pl-5 text-sm text-ink">
        <li v-for="item in explain.pitfalls" :key="item">{{ item }}</li>
      </ul>
      <p v-if="explain.commentary" class="m-0 text-sm leading-relaxed text-ink">
        {{ explain.commentary }}
      </p>
      <div v-if="explain.related_tags?.length" class="flex flex-wrap gap-1">
        <span v-for="tag in explain.related_tags" :key="tag" class="chip text-muted">{{ tag }}</span>
      </div>
      <p class="m-0 text-[11px] leading-relaxed text-muted">
        题干、选项、解析与参考答案可能发送至 DeepSeek 进行处理。建议标签仅展示，不会写回题库。
      </p>
    </div>
  </div>
</template>
