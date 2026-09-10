<script setup lang="ts">
import { computed } from 'vue'
import { aiErrorUserMessage, type AiProxyError, type SessionAiReport } from '../lib/aiProxy'
import { displayTagLabel, type TagStat } from '../lib/tagStats'

const props = defineProps<{
  tagStats: TagStat[]
  report: SessionAiReport | null
  loading: boolean
  error: AiProxyError | null
}>()

const emit = defineEmits<{ regenerate: [] }>()

const readyReport = computed(() => (props.report?.status === 'ready' ? props.report : null))
const showRegenerate = computed(() => props.error?.code !== 'ai_disabled')
const errorText = computed(() => (props.error ? aiErrorUserMessage(props.error) : ''))
const rateLabel = (rate: number) => `${Math.round(rate * 100)}%`
</script>

<template>
  <section class="surface flex flex-col gap-4 md:p-6" aria-labelledby="ai-session-heading">
    <div>
      <h2 id="ai-session-heading" class="m-0 text-lg font-semibold text-ink">智能分析</h2>
      <p class="mt-1 text-sm text-muted">按当前题目考点汇总当次作答；解读由模型生成，仅供参考。</p>
    </div>

    <div v-if="tagStats.length" class="flex flex-col gap-2">
      <h3 class="m-0 text-sm font-medium text-muted">考点统计</h3>
      <ul class="m-0 flex list-none flex-col gap-2 p-0">
        <li
          v-for="stat in tagStats"
          :key="stat.tag"
          class="rounded-xl border border-line/70 bg-raise/50 px-3 py-2.5"
        >
          <div class="flex items-baseline justify-between gap-3">
            <span class="text-sm font-medium text-ink">{{ displayTagLabel(stat.tag) }}</span>
            <span class="text-sm font-semibold tabular-nums text-ink">{{ rateLabel(stat.rate) }}</span>
          </div>
          <p class="m-0 mt-1 text-xs text-muted">
            正确 {{ stat.correct }} / {{ stat.total }} · 错误 {{ stat.wrong }}
          </p>
        </li>
      </ul>
    </div>
    <p v-else class="m-0 text-sm text-muted">暂无考点统计（当次没有可汇总的作答）。</p>

    <div v-if="loading" class="rounded-xl border border-line/70 bg-raise/40 px-3.5 py-3 text-sm text-muted">
      正在生成智能解读…
    </div>
    <p v-else-if="error" class="alert-warn m-0">
      {{ error.code === 'ai_disabled' ? '智能解读暂不可用' : errorText }}
    </p>

    <template v-if="readyReport">
      <div v-if="readyReport.summary">
        <h3 class="m-0 text-sm font-medium text-muted">总结</h3>
        <p class="mt-1.5 text-sm leading-relaxed text-ink">{{ readyReport.summary }}</p>
      </div>
      <div v-if="readyReport.weak_points?.length">
        <h3 class="m-0 text-sm font-medium text-muted">薄弱点</h3>
        <ul class="mt-1.5 flex list-none flex-col gap-2 p-0">
          <li
            v-for="point in readyReport.weak_points"
            :key="point.tag"
            class="rounded-xl border border-bad/20 bg-bad/10 px-3 py-2.5"
          >
            <p class="m-0 text-sm font-medium text-ink">{{ displayTagLabel(point.tag) }}</p>
            <p v-if="point.reason" class="m-0 mt-1 text-sm leading-relaxed text-muted">{{ point.reason }}</p>
          </li>
        </ul>
      </div>
      <div v-if="readyReport.suggestions?.length">
        <h3 class="m-0 text-sm font-medium text-muted">复习建议</h3>
        <ul class="mt-1.5 m-0 flex list-disc flex-col gap-1 pl-5 text-sm leading-relaxed text-ink">
          <li v-for="(tip, index) in readyReport.suggestions" :key="index">{{ tip }}</li>
        </ul>
      </div>
    </template>

    <button
      v-if="showRegenerate"
      class="btn-secondary self-start"
      type="button"
      :disabled="loading"
      @click="emit('regenerate')"
    >
      {{ loading ? '生成中…' : '重新生成' }}
    </button>

    <p class="m-0 text-xs leading-relaxed text-muted/80">
      本次分析可能将题干、解析与作答发送至第三方模型服务（DeepSeek）进行处理。考点统计使用题目<strong>当前</strong>标签。
    </p>
  </section>
</template>
