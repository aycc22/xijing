<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useAppRefresh } from '../composables/useAppRefresh'
import { useAuth } from '../composables/useAuth'
import { useInstallPrompt } from '../composables/useInstallPrompt'

const auth = useAuth()
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

function onInstallClick() {
  if (canNativeInstall.value) {
    void install()
  } else {
    openGuide()
  }
}
</script>

<template>
  <div class="relative flex h-full min-h-0 flex-col overflow-hidden">
    <!-- 签名元素：夜色里一盏提灯走出的路 -->
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
      <p class="page-lede mt-4 max-w-sm text-pretty">
        把题库装进手机。一题一答，灯火所至，即是路径。
      </p>

      <div class="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
        <RouterLink v-if="auth.user.value" class="btn btn-block sm:w-auto" to="/banks">
          进入题库
        </RouterLink>
        <RouterLink v-else class="btn btn-block sm:w-auto" to="/login">
          登录开始
        </RouterLink>
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
      <p v-if="refreshError" class="mt-2 text-sm text-bad" role="alert">
        {{ refreshError }}
      </p>
    </section>

    <aside
      v-if="showInstall"
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

    <!-- 安装步骤浮层：不占布局高度，避免撑出滚动 -->
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
            <button type="button" class="btn-secondary btn-block" @click="closeGuide()">
              知道了
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
