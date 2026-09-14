<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAppRefresh } from '../composables/useAppRefresh'
import { useAuth } from '../composables/useAuth'
import { useInstallPrompt } from '../composables/useInstallPrompt'
import {
  computeHistoryStats,
  detailPathForSession,
  formatRelativeStudyTime,
  historyResultText,
  mergeHistorySessions,
  modeLabel,
  sessionProgressCounts,
  type HistorySession,
} from '../lib/history'
import { formatErrorMessage } from '../lib/errors'
import { hydratePracticeAnsweredCounts } from '../lib/historyAnswers'
import { supabase } from '../lib/supabase'

const auth = useAuth()
const router = useRouter()
const { refreshing, error: refreshError, refresh } = useAppRefresh()
const {
  visible: showInstall,
  canNativeInstall,
  platform,
  guideOpen,
  installing,
  install,
  openGuide,
  closeGuide,
  dismiss,
} = useInstallPrompt()

const loading = ref(false)
const error = ref('')
const recent = ref<HistorySession[]>([])
const wrongCount = ref(0)
const favoriteCount = ref(0)
const noteCount = ref(0)
const bankCount = ref(0)

const stats = computed(() => computeHistoryStats(recent.value))
const continueSession = computed(() => recent.value.find((s) => !s.finished_at && !s.expired_at) ?? null)
const continueProgress = computed(() =>
  continueSession.value ? sessionProgressCounts(continueSession.value) : { done: 0, total: 0, percent: 0 },
)

function onInstallClick() {
  if (canNativeInstall.value) {
    void install()
  } else {
    openGuide()
  }
}

function bankTitleFromJoin(raw: unknown): string {
  const bank = (Array.isArray(raw) ? raw[0] : raw) as { title?: string } | null
  return bank?.title ?? '未命名题库'
}

async function loadDashboard() {
  if (!auth.user.value) return
  loading.value = true
  error.value = ''
  try {
    const uid = auth.user.value.id
    const [practiceRes, examRes, wrongRes, favRes, noteRes, bankRes] = await Promise.all([
      supabase
        .from('attempt_sessions')
        .select(
          'id, bank_id, mode, total_count, correct_count, current_index, started_at, finished_at, expired_at, question_banks!inner(title)',
        )
        .eq('user_id', uid)
        .order('started_at', { ascending: false })
        .limit(8),
      supabase
        .from('exam_sessions')
        .select(
          'id, paper_id, total_count, correct_count, current_index, started_at, finished_at, paper_instances!inner(bank_id, question_banks!inner(title))',
        )
        .eq('user_id', uid)
        .order('started_at', { ascending: false })
        .limit(8),
      supabase.from('wrong_question_items').select('id', { count: 'exact', head: true }).eq('user_id', uid),
      supabase.from('question_favorites').select('id', { count: 'exact', head: true }).eq('user_id', uid),
      supabase.from('question_notes').select('id', { count: 'exact', head: true }).eq('user_id', uid),
      supabase.from('question_banks').select('id', { count: 'exact', head: true }).eq('is_published', true),
    ])
    const practice: HistorySession[] = await hydratePracticeAnsweredCounts(
      supabase,
      (practiceRes.data ?? []).map((row) => ({
        id: row.id,
        bank_id: row.bank_id,
        bank_title: bankTitleFromJoin(row.question_banks),
        mode: (row.mode as 'practice' | 'exam') || 'practice',
        kind: 'practice',
        paper_id: null,
        total_count: row.total_count,
        correct_count: row.correct_count,
        current_index: row.current_index ?? 0,
        started_at: row.started_at,
        finished_at: row.finished_at,
        expired_at: row.expired_at,
      })),
    )
    const exams: HistorySession[] = (examRes.data ?? []).map((row) => {
      const paper = (Array.isArray(row.paper_instances) ? row.paper_instances[0] : row.paper_instances) as {
        bank_id: string
        question_banks: unknown
      } | null
      return {
        id: row.id,
        bank_id: paper?.bank_id ?? '',
        bank_title: bankTitleFromJoin(paper?.question_banks),
        mode: 'exam' as const,
        kind: 'exam' as const,
        paper_id: row.paper_id,
        total_count: row.total_count,
        correct_count: row.correct_count,
        current_index: row.current_index ?? 0,
        started_at: row.started_at,
        finished_at: row.finished_at,
        expired_at: null,
      }
    })
    recent.value = mergeHistorySessions([...practice, ...exams]).slice(0, 5)
    wrongCount.value = wrongRes.count ?? 0
    favoriteCount.value = favRes.count ?? 0
    noteCount.value = noteRes.count ?? 0
    bankCount.value = bankRes.count ?? 0
  } catch (err) {
    error.value = formatErrorMessage(err, '加载学习概览失败')
  }
  loading.value = false
}

watch(
  () => auth.user.value?.id,
  (id) => {
    if (id) void loadDashboard()
    else {
      recent.value = []
      wrongCount.value = 0
      favoriteCount.value = 0
      noteCount.value = 0
      bankCount.value = 0
    }
  },
)

onMounted(() => {
  if (auth.user.value) void loadDashboard()
})
</script>

<template>
  <div
    class="relative flex min-h-0 flex-col"
    :class="auth.user.value ? 'overflow-auto pb-4' : 'h-full overflow-hidden'"
  >
    <template v-if="!auth.user.value">
      <svg
        class="pointer-events-none absolute -right-8 top-2 h-36 w-52 opacity-90 md:-right-2 md:top-4 md:h-48 md:w-72"
        viewBox="0 0 220 160"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="hero-trail" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stop-color="var(--spark-deep)" stop-opacity="0" />
            <stop offset="0.55" stop-color="var(--spark-deep)" stop-opacity="0.6" />
            <stop offset="1" stop-color="var(--spark)" />
          </linearGradient>
        </defs>
        <path
          d="M12 128 C 48 40, 90 148, 128 72 C 152 28, 176 48, 204 38"
          stroke="url(#hero-trail)"
          stroke-width="2"
          stroke-linecap="round"
          stroke-dasharray="260"
          style="--dash-len: 260; animation: path-draw 1.6s 0.2s ease-out both"
        />
        <circle
          cx="204"
          cy="38"
          r="4"
          fill="var(--spark-bright)"
          style="animation: soft-pulse 2.8s ease-in-out infinite; filter: drop-shadow(0 0 6px var(--lantern-halo))"
        />
      </svg>

      <section class="relative flex min-h-0 flex-1 flex-col justify-center py-4">
        <p class="page-kicker">习惯成径</p>
        <h1 class="font-display m-0 text-[clamp(2.75rem,14vw,4.5rem)] leading-none tracking-wide text-ink">
          习径
        </h1>
        <p class="page-lede mt-4 max-w-sm text-pretty">把题库装进手机。一题一答，灯火所至，即是路径。</p>
        <div class="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
          <RouterLink class="btn btn-block sm:w-auto" to="/login">登录开始</RouterLink>
          <button
            v-if="showInstall"
            type="button"
            class="btn-secondary btn-block sm:w-auto"
            :disabled="installing"
            @click="onInstallClick"
          >
            添加到主屏幕
          </button>
          <button
            type="button"
            class="btn-secondary btn-block sm:w-auto"
            :disabled="refreshing"
            @click="refresh()"
          >
            {{ refreshing ? '正在刷新…' : '刷新最新版' }}
          </button>
        </div>
        <p v-if="refreshError" class="mt-2 text-sm text-bad" role="alert">{{ refreshError }}</p>
      </section>
    </template>

    <section v-else class="relative flex flex-col gap-4 pb-2">
      <p v-if="loading" class="text-sm text-muted">加载学习概览…</p>
      <p v-else-if="error" class="alert-error">{{ error }}</p>
      <template v-else>
        <section
          v-if="continueSession"
          aria-labelledby="continue-title"
          class="rounded-3xl border border-line bg-surface p-5 shadow-lift"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="m-0 text-[11px] font-medium tracking-[0.14em] text-spark uppercase">继续学习</p>
              <h2 id="continue-title" class="mt-1.5 m-0 truncate text-[20px] font-semibold tracking-tight text-ink">
                {{ continueSession.bank_title }}
              </h2>
              <p class="mt-1 m-0 truncate text-[13px] text-muted">
                {{ modeLabel(continueSession.mode) }} · {{ historyResultText(continueSession) }}
              </p>
            </div>
            <div class="shrink-0 text-right">
              <p class="m-0 font-mono text-[22px] leading-none font-semibold tabular-nums text-ink">
                {{ continueProgress.done
                }}<span class="text-[15px] text-muted">/{{ continueProgress.total }}</span>
              </p>
              <p class="mt-1 m-0 text-[11px] text-muted">已完成 {{ continueProgress.percent }}%</p>
            </div>
          </div>
          <div
            class="path-track path-track-thin mt-4 h-2"
            role="progressbar"
            :aria-valuenow="continueProgress.done"
            aria-valuemin="0"
            :aria-valuemax="continueProgress.total"
            aria-label="当前题库进度"
          >
            <span class="path-fill" :style="{ width: continueProgress.percent + '%' }" />
          </div>
          <div class="mt-5 flex items-center gap-3">
            <button
              type="button"
              class="btn min-h-12 flex-1"
              @click="router.push(detailPathForSession(continueSession))"
            >
              继续学习
              <svg class="size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M9 6l6 6-6 6"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            <p class="m-0 flex shrink-0 items-center gap-1.5 text-[12px] text-muted">
              <svg class="size-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.6" />
                <path
                  d="M12 8v4.5l3 1.5"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              {{ formatRelativeStudyTime(continueSession.started_at) }}
            </p>
          </div>
        </section>

        <section
          v-else
          class="rounded-3xl border border-line bg-surface p-5 shadow-lift"
          aria-labelledby="start-title"
        >
          <p class="m-0 text-[11px] font-medium tracking-[0.14em] text-spark uppercase">开始学习</p>
          <h2 id="start-title" class="mt-1.5 m-0 text-[20px] font-semibold text-ink">还没有进行中的练习</h2>
          <p class="mt-1 m-0 text-[13px] text-muted">去题库挑一套，从上次停下或第一题走起。</p>
          <RouterLink class="btn mt-5 min-h-12 w-full" to="/banks">进入题库</RouterLink>
        </section>

        <section aria-label="学习数据">
          <dl class="flex items-stretch rounded-2xl border border-line bg-raise/60 px-1 py-3">
            <div class="flex flex-1 flex-col items-center justify-center gap-1">
              <dd class="m-0 font-mono text-[17px] leading-none font-semibold tabular-nums text-ink">
                {{ stats.answered }}<span class="ml-0.5 text-[11px] font-normal text-muted">题</span>
              </dd>
              <dt class="text-[11px] text-muted">累计练习</dt>
            </div>
            <div class="flex flex-1 flex-col items-center justify-center gap-1 border-l border-line">
              <dd class="m-0 font-mono text-[17px] leading-none font-semibold tabular-nums text-ink">
                {{ stats.rate }}<span class="ml-0.5 text-[11px] font-normal text-muted">%</span>
              </dd>
              <dt class="text-[11px] text-muted">正确率</dt>
            </div>
            <div class="flex flex-1 flex-col items-center justify-center gap-1 border-l border-line">
              <dd class="m-0 font-mono text-[17px] leading-none font-semibold tabular-nums text-ink">
                {{ wrongCount }}<span class="ml-0.5 text-[11px] font-normal text-muted">题</span>
              </dd>
              <dt class="text-[11px] text-muted">错题本</dt>
            </div>
          </dl>
        </section>

        <section aria-label="快捷入口">
          <h3 class="mb-2.5 m-0 px-0.5 text-[13px] font-medium text-muted">我的学习</h3>
          <div class="grid grid-cols-2 gap-3">
            <RouterLink
              class="flex min-h-[88px] flex-col items-start gap-2.5 rounded-2xl border border-line bg-surface p-4 no-underline transition hover:border-spark/30 active:bg-raise/80"
              to="/wrong-book"
            >
              <span class="grid size-9 place-items-center rounded-xl bg-spark/10 text-spark">
                <svg class="size-[17px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.7" />
                  <path d="M15 9 9 15M9 9l6 6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
                </svg>
              </span>
              <span class="w-full">
                <span class="flex items-center justify-between">
                  <span class="text-[15px] font-medium text-ink">错题本</span>
                  <svg class="size-4 text-muted/50" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                  </svg>
                </span>
                <span class="mt-0.5 block text-[12px] text-muted">{{ wrongCount }} 题待复习</span>
              </span>
            </RouterLink>
            <RouterLink
              class="flex min-h-[88px] flex-col items-start gap-2.5 rounded-2xl border border-line bg-surface p-4 no-underline transition hover:border-spark/30 active:bg-raise/80"
              to="/favorites"
            >
              <span class="grid size-9 place-items-center rounded-xl bg-spark/10 text-spark">
                <svg class="size-[17px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 4.8 14.1 9l4.7.6-3.4 3.3.9 4.6L12 15.6 7.7 17.5l.9-4.6L5.2 9.6 9.9 9 12 4.8Z"
                    stroke="currentColor"
                    stroke-width="1.7"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>
              <span class="w-full">
                <span class="flex items-center justify-between">
                  <span class="text-[15px] font-medium text-ink">收藏</span>
                  <svg class="size-4 text-muted/50" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                  </svg>
                </span>
                <span class="mt-0.5 block text-[12px] text-muted">{{ favoriteCount }} 题</span>
              </span>
            </RouterLink>
            <RouterLink
              class="flex min-h-[88px] flex-col items-start gap-2.5 rounded-2xl border border-line bg-surface p-4 no-underline transition hover:border-spark/30 active:bg-raise/80"
              to="/notes"
            >
              <span class="grid size-9 place-items-center rounded-xl bg-spark/10 text-spark">
                <svg class="size-[17px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M7 4.5h7.5L18 8v11.5H7V4.5Z"
                    stroke="currentColor"
                    stroke-width="1.7"
                    stroke-linejoin="round"
                  />
                  <path d="M14.5 4.5V8H18M9 12h6M9 15.5h4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
                </svg>
              </span>
              <span class="w-full">
                <span class="flex items-center justify-between">
                  <span class="text-[15px] font-medium text-ink">笔记</span>
                  <svg class="size-4 text-muted/50" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                  </svg>
                </span>
                <span class="mt-0.5 block text-[12px] text-muted">{{ noteCount }} 条</span>
              </span>
            </RouterLink>
            <RouterLink
              class="flex min-h-[88px] flex-col items-start gap-2.5 rounded-2xl border border-line bg-surface p-4 no-underline transition hover:border-spark/30 active:bg-raise/80"
              to="/history"
            >
              <span class="grid size-9 place-items-center rounded-xl bg-spark/10 text-spark">
                <svg class="size-[17px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.7" />
                  <path d="M12 8v4.5l3 1.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
                </svg>
              </span>
              <span class="w-full">
                <span class="flex items-center justify-between">
                  <span class="text-[15px] font-medium text-ink">历史</span>
                  <svg class="size-4 text-muted/50" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                  </svg>
                </span>
                <span class="mt-0.5 block text-[12px] text-muted">近 {{ recent.length }} 次记录</span>
              </span>
            </RouterLink>
          </div>
        </section>

        <div class="mt-2">
          <RouterLink
            class="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-spark/30 bg-spark/8 text-[15px] font-semibold text-spark transition active:scale-[0.98]"
            to="/banks"
          >
            <svg class="size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10v16H5.5A1.5 1.5 0 0 1 4 18.5v-13ZM14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14V4Z"
                stroke="currentColor"
                stroke-width="1.6"
              />
            </svg>
            进入题库
          </RouterLink>
          <p class="mt-2.5 m-0 text-center text-[11px] text-muted">
            已发布 {{ bankCount }} 个题库
          </p>
        </div>
      </template>
    </section>

    <aside
      v-if="showInstall && !auth.user.value"
      class="relative shrink-0 border-t border-line/60 pt-4 pb-[max(0.25rem,env(safe-area-inset-bottom))]"
      aria-label="添加到主屏幕"
    >
      <div class="flex items-start justify-between gap-3">
        <button
          type="button"
          class="min-w-0 flex-1 cursor-pointer border-0 bg-transparent p-0 text-left"
          @click="onInstallClick"
        >
          <p class="m-0 text-sm font-semibold text-ink">像 App 一样打开</p>
          <p class="mt-1 text-xs leading-relaxed text-muted">
            添加到主屏幕后可全屏刷题，少一层浏览器栏。
          </p>
        </button>
        <button
          type="button"
          class="shrink-0 cursor-pointer border-0 bg-transparent p-1 text-xs text-muted transition hover:text-ink"
          aria-label="不再提示"
          @click="dismiss()"
        >
          关闭
        </button>
      </div>
    </aside>

    <Teleport to="body">
      <div
        v-if="guideOpen"
        class="fixed inset-0 z-50 flex items-end justify-center bg-deep/70 p-4 backdrop-blur-sm sm:items-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="a2hs-title"
        @click.self="closeGuide()"
      >
        <div
          class="w-full max-w-md rounded-2xl border border-line/70 bg-surface p-5 shadow-lift"
          style="animation: page-rise 0.35s ease-out both; padding-bottom: max(1.25rem, env(safe-area-inset-bottom))"
        >
          <h2 id="a2hs-title" class="font-display m-0 text-xl text-ink">添加到主屏幕</h2>
          <p class="mt-1.5 text-sm text-muted">按下面步骤操作，下次从桌面直接打开习径。</p>
          <ol v-if="platform === 'ios'" class="mt-4 list-none space-y-3 p-0 text-sm text-muted">
            <li class="flex gap-3">
              <span class="font-display w-5 shrink-0 text-lg leading-none text-spark/80">1</span>
              <span>点 Safari 底部分享按钮 <span class="text-ink">□↑</span></span>
            </li>
            <li class="flex gap-3">
              <span class="font-display w-5 shrink-0 text-lg leading-none text-spark/80">2</span>
              <span>下滑找到并点选「添加到主屏幕」</span>
            </li>
            <li class="flex gap-3">
              <span class="font-display w-5 shrink-0 text-lg leading-none text-spark/80">3</span>
              <span>确认添加，从桌面图标打开</span>
            </li>
          </ol>
          <ol v-else-if="platform === 'android'" class="mt-4 list-none space-y-3 p-0 text-sm text-muted">
            <li class="flex gap-3">
              <span class="font-display w-5 shrink-0 text-lg leading-none text-spark/80">1</span>
              <span>点浏览器右上角菜单 <span class="text-ink">⋮</span></span>
            </li>
            <li class="flex gap-3">
              <span class="font-display w-5 shrink-0 text-lg leading-none text-spark/80">2</span>
              <span>选择「安装应用」或「添加到主屏幕」</span>
            </li>
            <li class="flex gap-3">
              <span class="font-display w-5 shrink-0 text-lg leading-none text-spark/80">3</span>
              <span>确认后从桌面图标打开</span>
            </li>
          </ol>
          <ol v-else class="mt-4 list-none space-y-3 p-0 text-sm text-muted">
            <li class="flex gap-3">
              <span class="font-display w-5 shrink-0 text-lg leading-none text-spark/80">1</span>
              <span>在地址栏旁点安装图标，或打开菜单选择「安装应用」</span>
            </li>
            <li class="flex gap-3">
              <span class="font-display w-5 shrink-0 text-lg leading-none text-spark/80">2</span>
              <span>手机上用浏览器打开本站，按提示添加到主屏幕更合适</span>
            </li>
          </ol>
          <div class="mt-5 flex flex-col gap-2 sm:flex-row">
            <button
              v-if="canNativeInstall"
              type="button"
              class="btn btn-block"
              :disabled="installing"
              @click="install()"
            >
              立即安装
            </button>
            <button type="button" class="btn-secondary btn-block" @click="closeGuide()">知道了</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
