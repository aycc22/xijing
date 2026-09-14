<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import ThemeToggle from './components/ThemeToggle.vue'
import { useAuth } from './composables/useAuth'
import { usePlayerChrome } from './composables/usePlayerChrome'
import { useTheme } from './composables/useTheme'
import { examResultPath, practiceResultPath } from './lib/history'

const auth = useAuth()
const route = useRoute()
const router = useRouter()
const chrome = usePlayerChrome()
const playerCurrent = chrome.current
const playerTotal = chrome.total
const playerProgress = chrome.progress
const playerFavorited = chrome.favorited
const playerShowFavorite = chrome.showFavorite
const togglePlayerFavorite = chrome.toggleFavorite
useTheme()

onMounted(() => {
  auth.init()
  auth.onPasswordRecovery(() => {
    void router.replace('/reset-password')
  })
})

onUnmounted(() => {
  document.documentElement.classList.remove('home-lock')
  document.body.classList.remove('home-lock')
})

const focusMode = computed(() => {
  const name = route.name
  return (
    name === 'quiz' ||
    name === 'result' ||
    name === 'result-review' ||
    name === 'exam' ||
    name === 'exam-result' ||
    name === 'exam-result-review'
  )
})

const playerFocus = computed(() => {
  const name = route.name
  return (
    name === 'quiz' ||
    name === 'exam' ||
    name === 'result-review' ||
    name === 'exam-result-review'
  )
})

const isHome = computed(() => route.name === 'home')
const isHomeLanding = computed(() => isHome.value && !auth.user.value)

const showBottomNav = computed(() => Boolean(auth.user.value) && !focusMode.value)

const learnTabActive = computed(() => {
  const name = route.name
  return name === 'home' || name === 'banks' || name === 'bank-detail'
})

const focusExitTo = computed(() => {
  const sessionId = String(route.params.sessionId ?? '')
  if (route.name === 'result-review' && sessionId) return practiceResultPath(sessionId)
  if (route.name === 'exam-result-review' && sessionId) return examResultPath(sessionId)
  return '/banks'
})
const focusExitLabel = computed(() => {
  if (route.name === 'result-review' || route.name === 'exam-result-review') return '返回结果'
  if (route.name === 'result' || route.name === 'exam-result') return '返回题库'
  return '退出刷题'
})

watch(
  isHomeLanding,
  (home) => {
    document.documentElement.classList.toggle('home-lock', home)
    document.body.classList.toggle('home-lock', home)
  },
  { immediate: true },
)
</script>

<template>
  <div
    class="app-shell"
    :class="[
      isHomeLanding ? 'h-dvh max-h-dvh overflow-hidden' : '',
      showBottomNav
        ? 'pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] md:pb-10'
        : playerFocus
          ? 'pb-0'
          : 'pb-10',
    ]"
  >
    <header
      class="z-30 -mx-4 shrink-0 bg-night/90 px-4 backdrop-blur-md md:-mx-6 md:px-6"
      :class="[
        isHomeLanding ? 'static' : 'sticky top-0',
        playerFocus
          ? 'app-header-compact border-b-0 pb-2'
          : 'app-header border-b border-line/80 pb-3',
      ]"
    >
      <div
        class="flex items-center justify-between"
        :class="playerFocus ? 'gap-2' : 'gap-3'"
      >
        <template v-if="playerFocus">
          <RouterLink
            class="-ml-2 flex items-center gap-0.5 rounded-full py-1.5 pr-2.5 pl-1 text-[13px] text-muted transition hover:bg-raise/70 hover:text-ink"
            :to="focusExitTo"
          >
            <svg class="size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M15 6 9 12l6 6"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            {{ focusExitLabel }}
          </RouterLink>
          <p
            v-if="playerTotal"
            class="ml-auto font-mono text-[17px] leading-none font-semibold tabular-nums"
          >
            <span class="text-spark">{{ playerCurrent }}</span>
            <span class="text-[12px] font-normal text-muted">/{{ playerTotal }}</span>
          </p>
          <button
            v-if="playerShowFavorite"
            type="button"
            class="icon-btn !size-8 !rounded-full"
            :aria-label="playerFavorited ? '取消收藏' : '收藏本题'"
            @click="togglePlayerFavorite()"
          >
            <svg
              class="size-[18px]"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              :class="playerFavorited ? 'text-spark' : ''"
            >
              <path
                d="M12 4.8 14.1 9l4.7.6-3.4 3.3.9 4.6L12 15.6 7.7 17.5l.9-4.6L5.2 9.6 9.9 9 12 4.8Z"
                :fill="playerFavorited ? 'currentColor' : 'none'"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <ThemeToggle compact />
        </template>

        <template v-else>
          <RouterLink class="flex min-w-0 items-center gap-2.5 text-ink transition hover:text-spark" to="/">
            <span
              class="grid size-9 shrink-0 place-items-center rounded-xl bg-spark/12 text-[15px] font-semibold text-spark ring-1 ring-spark/25 ring-inset"
              aria-hidden="true"
            >
              习
            </span>
            <span class="min-w-0 leading-tight">
              <span class="block text-[17px] font-semibold tracking-tight">习径</span>
              <span v-if="isHome && auth.user.value" class="block text-[11px] text-muted">
                习惯成径 · 每天一点点
              </span>
            </span>
          </RouterLink>

          <div class="flex items-center gap-2">
            <nav
              v-if="auth.user.value && !focusMode"
              class="hidden items-center gap-5 md:flex"
              aria-label="主导航"
            >
              <RouterLink
                class="nav-link"
                to="/"
                active-class=""
                exact-active-class=""
                :class="learnTabActive ? 'router-link-active' : ''"
                :aria-current="learnTabActive ? 'page' : undefined"
              >
                题库
              </RouterLink>
              <RouterLink class="nav-link" to="/wrong-book">错题</RouterLink>
              <RouterLink class="nav-link" to="/history">历史</RouterLink>
              <RouterLink class="nav-link" to="/me">我的</RouterLink>
            </nav>

            <RouterLink
              v-if="!auth.user.value && route.name !== 'login' && route.name !== 'reset-password'"
              class="btn-ghost !min-h-9 !px-3 !py-1.5 text-sm"
              to="/login"
            >
              登录
            </RouterLink>

            <RouterLink
              v-else-if="focusMode"
              class="btn-ghost !min-h-9 !px-2 !py-1.5 text-sm"
              :to="focusExitTo"
            >
              {{ focusExitLabel }}
            </RouterLink>

            <ThemeToggle />
          </div>
        </template>
      </div>

      <div
        v-if="playerFocus && playerTotal"
        class="path-track path-track-thin mt-2"
        role="progressbar"
        :aria-valuenow="playerCurrent"
        aria-valuemin="1"
        :aria-valuemax="playerTotal"
        aria-label="答题进度"
      >
        <span class="path-fill" :style="{ width: playerProgress + '%' }" />
      </div>
    </header>

    <main
      class="flex min-h-0 flex-1 flex-col"
      :class="isHomeLanding ? 'overflow-hidden pt-2' : playerFocus ? 'pt-1' : 'pt-3 md:pt-5'"
    >
      <RouterView v-slot="{ Component, route: viewRoute }">
        <div
          :key="viewRoute.fullPath"
          class="page-enter"
          :class="isHomeLanding ? 'flex min-h-0 flex-1 flex-col overflow-hidden' : ''"
        >
          <component :is="Component" />
        </div>
      </RouterView>
    </main>

    <Teleport to="body">
      <nav v-if="showBottomNav" class="bottom-bar md:hidden" aria-label="底部导航">
        <div class="bottom-bar-inner">
          <RouterLink
            class="tab-link"
            to="/"
            active-class=""
            exact-active-class=""
            :class="learnTabActive ? 'router-link-active' : ''"
            :aria-current="learnTabActive ? 'page' : undefined"
          >
            <svg class="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10v16H5.5A1.5 1.5 0 0 1 4 18.5v-13ZM14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14V4Z"
                stroke="currentColor"
                stroke-width="1.6"
              />
            </svg>
            题库
          </RouterLink>
          <RouterLink class="tab-link" to="/wrong-book">
            <svg class="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 3 4.5 7v5c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V7L12 3Z"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linejoin="round"
              />
              <path d="M12 11v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              <circle cx="12" cy="8.5" r="0.75" fill="currentColor" />
            </svg>
            错题
          </RouterLink>
          <RouterLink class="tab-link" to="/history">
            <svg class="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.6" />
              <path
                d="M12 8v4.5l3 1.5"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            历史
          </RouterLink>
          <RouterLink class="tab-link" to="/me">
            <svg class="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="8" r="3.2" stroke="currentColor" stroke-width="1.6" />
              <path
                d="M5.5 19c.8-3.2 3.3-5 6.5-5s5.7 1.8 6.5 5"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
              />
            </svg>
            我的
          </RouterLink>
        </div>
      </nav>
    </Teleport>
  </div>
</template>
