<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'

export type SheetCellState =
  | 'unanswered'
  | 'correct'
  | 'wrong'
  | 'skipped'
  | 'answered'
  | 'flagged'

const props = withDefaults(
  defineProps<{
    open: boolean
    total: number
    statuses: SheetCellState[]
    current: number
    variant?: 'practice' | 'exam'
    unanswered?: number
    submitBusy?: boolean
  }>(),
  {
    variant: 'practice',
    unanswered: 0,
    submitBusy: false,
  },
)

const emit = defineEmits<{
  close: []
  'go-to': [index: number]
  submit: []
}>()

const answeredCount = computed(() => {
  if (props.variant === 'exam') {
    return props.statuses.filter((s) => s === 'answered' || s === 'flagged').length
  }
  return props.statuses.filter((s) => s === 'correct' || s === 'wrong' || s === 'skipped').length
})

watch(
  () => props.open,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
  },
)

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})

function cellClass(status: SheetCellState, i: number) {
  const base =
    'relative min-h-11 min-w-11 rounded-xl border text-sm font-semibold tabular-nums transition'
  if (i === props.current) return `${base} border-spark bg-spark/15 text-spark`
  switch (status) {
    case 'correct':
      return `${base} border-ok/40 bg-ok/10 text-ok`
    case 'wrong':
      return `${base} border-bad/40 bg-bad/10 text-bad`
    case 'skipped':
    case 'flagged':
      return `${base} border-warn/40 bg-warn/10 text-warn`
    case 'answered':
      return `${base} border-path/40 bg-path/10 text-path`
    default:
      return `${base} border-line bg-raise/50 text-muted`
  }
}

function onGoTo(i: number) {
  emit('go-to', i)
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet-fade">
      <div
        v-if="open"
        class="fixed inset-0 z-40 bg-night/70 backdrop-blur-sm"
        aria-hidden="true"
        @click="emit('close')"
      />
    </Transition>

    <Transition name="sheet-slide">
      <div
        v-if="open"
        class="fixed inset-x-0 bottom-0 z-50 flex max-h-[70vh] flex-col rounded-t-3xl border-t border-line bg-surface shadow-lift md:mx-auto md:max-w-lg"
        style="padding-bottom: env(safe-area-inset-bottom)"
        role="dialog"
        aria-modal="true"
        aria-label="答题卡"
      >
        <div class="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line" aria-hidden="true" />

        <div class="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
          <div class="flex items-baseline gap-2">
            <h2 class="m-0 text-base font-semibold text-ink">答题卡</h2>
            <span class="text-xs text-muted tabular-nums">
              已答 {{ answeredCount }} / {{ total }}
            </span>
          </div>
          <button
            type="button"
            class="icon-btn"
            aria-label="关闭答题卡"
            @click="emit('close')"
          >
            <svg class="size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6 6 18"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
          <div class="grid grid-cols-5 gap-2 sm:grid-cols-6" role="navigation" aria-label="题目序号">
            <button
              v-for="i in total"
              :key="i"
              type="button"
              :class="cellClass(statuses[i - 1] ?? 'unanswered', i - 1)"
              :aria-label="`第 ${i} 题`"
              :aria-current="i - 1 === current ? 'true' : undefined"
              @click="onGoTo(i - 1)"
            >
              {{ i }}
              <span
                v-if="i - 1 === current"
                class="absolute top-1 right-1 size-1.5 rounded-full bg-spark shadow-[0_0_4px_var(--lantern-halo)]"
                aria-hidden="true"
              />
            </button>
          </div>

          <div class="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-[0.65rem] text-muted">
            <span class="inline-flex items-center gap-1.5">
              <span class="size-2 rounded-full bg-spark" aria-hidden="true" />
              当前
            </span>
            <template v-if="variant === 'practice'">
              <span class="inline-flex items-center gap-1.5">
                <span class="size-2 rounded-full bg-ok" aria-hidden="true" />
                正确
              </span>
              <span class="inline-flex items-center gap-1.5">
                <span class="size-2 rounded-full bg-bad" aria-hidden="true" />
                错误
              </span>
              <span class="inline-flex items-center gap-1.5">
                <span class="size-2 rounded-full bg-warn" aria-hidden="true" />
                暂不会
              </span>
            </template>
            <template v-else>
              <span class="inline-flex items-center gap-1.5">
                <span class="size-2 rounded-full bg-path" aria-hidden="true" />
                已答
              </span>
              <span class="inline-flex items-center gap-1.5">
                <span class="size-2 rounded-full bg-warn" aria-hidden="true" />
                标记
              </span>
            </template>
            <span class="inline-flex items-center gap-1.5">
              <span class="size-2 rounded-full border border-line bg-raise" aria-hidden="true" />
              未答
            </span>
          </div>
        </div>

        <div
          v-if="variant === 'exam'"
          class="shrink-0 border-t border-line/60 px-4 pt-3 pb-3"
        >
          <p class="m-0 mb-2 text-xs text-muted">未答 {{ unanswered }} 道</p>
          <button
            class="btn btn-block min-h-11"
            type="button"
            :disabled="submitBusy"
            @click="emit('submit')"
          >
            {{ submitBusy ? '交卷中…' : '交卷' }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
