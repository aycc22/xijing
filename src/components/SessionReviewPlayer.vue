<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import CaseMaterialPanel from './CaseMaterialPanel.vue'
import AiQuestionExplainPanel from './AiQuestionExplainPanel.vue'
import { resultStatusLabel, resultStatusSymbol } from '../lib/practiceResult'
import { questionTypeLabel } from '../lib/scoring'
import {
  canGoReviewNext,
  canGoReviewPrev,
  clampReviewIndex,
  markReviewOption,
  resolveReviewOptions,
  reviewOptionClass,
  reviewOptionLabels,
  reviewOptionSymbol,
  reviewSheetStatus,
  reviewStandardAnswerText,
  reviewUserAnswerText,
  type ReviewPlayerItem,
} from '../lib/sessionReview'
import type { QuestionType } from '../lib/types'

const props = withDefaults(
  defineProps<{
    items: ReviewPlayerItem[]
    heading?: string
    sessionId?: string
    sessionType?: 'practice' | 'exam'
  }>(),
  { heading: '逐题复盘' },
)

const index = ref(0)
const stageRef = ref<HTMLElement | null>(null)

const total = computed(() => props.items.length)
const current = computed(() => props.items[index.value] ?? null)
const snapshot = computed(() => current.value?.snapshot ?? null)
const resolvedOptions = computed(() => resolveReviewOptions(snapshot.value))
const markedOptions = computed(() =>
  resolvedOptions.value.options.map((opt) => {
    const mark = markReviewOption(
      opt.key,
      current.value?.selected_keys ?? [],
      snapshot.value?.answer_keys ?? [],
    )
    return {
      ...opt,
      mark,
      symbol: reviewOptionSymbol(mark),
      labels: reviewOptionLabels(mark),
      className: reviewOptionClass(mark),
    }
  }),
)
const standardAnswer = computed(() => reviewStandardAnswerText(snapshot.value))
const userAnswer = computed(() => (current.value ? reviewUserAnswerText(current.value) : '未作答'))
const progress = computed(() => (total.value ? ((index.value + 1) / total.value) * 100 : 0))
const status = computed(() =>
  current.value
    ? { is_correct: current.value.is_correct, is_skipped: Boolean(current.value.is_skipped) }
    : { is_correct: false, is_skipped: false },
)
const showScore = computed(
  () => typeof current.value?.earned === 'number' && typeof current.value?.score === 'number',
)

watch(
  () => props.items.length,
  () => {
    index.value = clampReviewIndex(index.value, props.items.length)
  },
)

function qtypeDotClass(qtype: QuestionType) {
  switch (qtype) {
    case 'single':
      return 'bg-spark'
    case 'multiple':
      return 'bg-path'
    case 'judgement':
      return 'bg-ok'
    case 'case_analysis':
      return 'bg-warn'
    case 'short_answer':
      return 'bg-muted'
  }
}

function statusChipClass() {
  if (status.value.is_skipped) return 'border-warn/40 bg-warn/10 text-warn'
  if (status.value.is_correct) return 'border-ok/40 bg-ok/10 text-ok'
  return 'border-bad/40 bg-bad/10 text-bad'
}

function jumperClass(i: number) {
  const base = 'min-h-11 min-w-11 rounded-xl border text-sm font-semibold tabular-nums'
  if (i === index.value) return `${base} border-spark bg-spark/15 text-spark`
  const sheet = reviewSheetStatus(props.items[i]!)
  if (sheet === 'correct') return `${base} border-ok/40 bg-ok/10 text-ok`
  if (sheet === 'skipped') return `${base} border-warn/40 bg-warn/10 text-warn`
  return `${base} border-bad/40 bg-bad/10 text-bad`
}

async function goTo(i: number) {
  index.value = clampReviewIndex(i, props.items.length)
  await nextTick()
  stageRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function prev() {
  if (!canGoReviewPrev(index.value)) return
  void goTo(index.value - 1)
}

function next() {
  if (!canGoReviewNext(index.value, total.value)) return
  void goTo(index.value + 1)
}
</script>

<template>
  <section v-if="current" class="flex flex-col gap-3">
    <div class="flex items-end justify-between gap-3">
      <h2 class="m-0 text-lg font-semibold text-ink">{{ heading }}</h2>
      <p class="m-0 text-xs text-muted tabular-nums">{{ index + 1 }} / {{ total }}</p>
    </div>

    <article ref="stageRef" class="surface relative flex scroll-mt-20 flex-col gap-3.5 md:p-6">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div class="min-w-0 flex-1">
          <p class="m-0 text-xs text-muted">
            第 {{ index + 1 }} / {{ total }} 题
            <template v-if="snapshot"> · {{ questionTypeLabel(snapshot.qtype) }}</template>
            <template v-if="showScore"> · {{ current.earned }}/{{ current.score }} 分</template>
          </p>
          <div v-if="snapshot" class="mt-1.5 flex flex-wrap items-center gap-2">
            <span class="chip">
              <span class="size-1.5 rounded-full" :class="qtypeDotClass(snapshot.qtype)" aria-hidden="true" />
              {{ questionTypeLabel(snapshot.qtype) }}
            </span>
          </div>
        </div>
        <span class="chip shrink-0" :class="statusChipClass()">
          {{ resultStatusSymbol(status) }} {{ resultStatusLabel(status) }}
        </span>
      </div>

      <div
        class="path-track"
        role="progressbar"
        :aria-valuenow="index + 1"
        aria-valuemin="1"
        :aria-valuemax="total"
      >
        <span class="path-fill" :style="{ width: progress + '%' }" />
      </div>

      <CaseMaterialPanel
        v-if="snapshot?.case_material || snapshot?.attachments?.length"
        :material="snapshot.case_material"
        :attachments="snapshot.attachments"
      />

      <h3 class="m-0 text-[1.125rem] leading-snug font-semibold break-words text-ink md:text-xl">
        {{ snapshot?.stem || '（题目快照不可用）' }}
      </h3>

      <p v-if="resolvedOptions.missing" class="alert-warn m-0">
        {{ snapshot ? '本题快照未保存选项，无法展示全部选项。' : '当时题目快照缺失，无法展示题干与选项。' }}
      </p>

      <div v-else-if="markedOptions.length" class="flex flex-col gap-2.5">
        <div
          v-for="opt in markedOptions"
          :key="opt.key"
          class="option pointer-events-none cursor-default hover:border-line hover:bg-raise/50 active:scale-100"
          :class="opt.className"
        >
          <span v-if="snapshot && snapshot.qtype !== 'judgement'" class="option-key">{{ opt.key }}</span>
          <div class="min-w-0 flex-1">
            <p class="m-0 pt-0.5 leading-relaxed break-words text-ink">
              <span v-if="opt.symbol" class="mr-1.5 font-semibold">{{ opt.symbol }}</span>
              {{ opt.text }}
            </p>
            <p v-if="opt.labels.length" class="m-0 mt-1.5 flex flex-wrap gap-1.5">
              <span
                v-for="label in opt.labels"
                :key="label"
                class="chip"
                :class="
                  label === '正确答案'
                    ? 'border-ok/40 bg-ok/10 text-ok'
                    : opt.mark === 'wrong'
                      ? 'border-bad/40 bg-bad/10 text-bad'
                      : 'border-spark/40 bg-spark/10 text-spark'
                "
              >
                {{ label }}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-2 text-sm">
        <p class="m-0">
          <span class="font-medium text-muted">你的答案：</span>
          {{ userAnswer }}
        </p>
        <p v-if="standardAnswer !== null" class="m-0">
          <span class="font-medium text-muted">标准答案：</span>
          {{ standardAnswer }}
        </p>
      </div>

      <p v-if="snapshot?.explanation" class="alert-info m-0 break-words">
        <span class="font-semibold">解析</span> · {{ snapshot.explanation }}
      </p>

      <div
        v-if="snapshot?.qtype === 'short_answer' && current"
        class="rounded-xl border border-line/70 bg-raise/40 px-3.5 py-3 text-sm"
      >
        <p v-if="typeof current.ai_score === 'number'" class="m-0 text-ink">
          AI 建议分 {{ current.ai_score }}/{{ current.score }}
          <span class="text-muted">（仅供参考，不计入总分）</span>
        </p>
        <p v-else-if="current.grading_status === 'pending'" class="m-0 text-muted">AI 评分中…</p>
        <p v-else-if="current.grading_status === 'failed'" class="m-0 text-warn">AI 评分失败，可稍后重试</p>
        <p v-if="current.ai_feedback?.text" class="m-0 mt-1.5 leading-relaxed text-ink">
          {{ current.ai_feedback.text }}
        </p>
      </div>

      <AiQuestionExplainPanel
        v-if="sessionId && sessionType && current"
        :question-id="current.question_id"
        :session-id="sessionId"
        :session-type="sessionType"
        :is-correct="current.is_correct"
        :is-skipped="Boolean(current.is_skipped)"
      />

      <div class="flex items-center gap-2.5 border-t border-line/60 pt-3">
        <button
          class="btn-secondary min-h-11 flex-1"
          type="button"
          :disabled="!canGoReviewPrev(index)"
          @click="prev"
        >
          上一题
        </button>
        <button
          class="btn min-h-11 flex-1"
          type="button"
          :disabled="!canGoReviewNext(index, total)"
          @click="next"
        >
          下一题
        </button>
      </div>
    </article>

    <nav v-if="total > 1" class="flex flex-col gap-2" aria-label="跳转到题目">
      <p class="m-0 text-xs text-muted">答题卡</p>
      <div class="grid grid-cols-5 gap-2 sm:grid-cols-6">
        <button
          v-for="(_, i) in items"
          :key="items[i].question_id + i"
          type="button"
          :class="jumperClass(i)"
          :aria-label="`第 ${i + 1} 题`"
          :aria-current="i === index ? 'true' : undefined"
          @click="goTo(i)"
        >
          {{ i + 1 }}
        </button>
      </div>
    </nav>
  </section>
</template>
