<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import ThemeToggle from './components/ThemeToggle.vue'
import { useAuth } from './composables/useAuth'
import { useTheme } from './composables/useTheme'
import { examResultPath, practiceResultPath } from './lib/history'

const auth = useAuth()
const route = useRoute()
const router = useRouter()
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

const focusExitTo = computed(() => {
  const sessionId = String(route.params.sessionId ?? '')
  if (route.name === 'result-review' && sessionId) return practiceResultPath(sessionId)
  if (route.name === 'exam-result-review' && sessionId) return examResultPath(sessionId)
  return '/banks'
})
const focusExitLabel = computed(() =>
  route.name === 'result-review' || route.name === 'exam-result-review' ? '返回结果' : '退出刷题',
)

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
        ? 'pb-[calc(3rem+env(safe-area-inset-bottom,0px))] md:pb-10'
          : 'pb-10',
    ]"
  >
    <header
      class="app-header z-30 -mx-4 flex shrink-0 items-center justify-between border-b border-line/60 bg-night/85 px-4 backdrop-blur-md md:-mx-6 md:px-6"
      :class="[
        isHomeLanding ? 'static' : 'sticky top-0',
        playerFocus ? 'app-header-compact gap-2 pb-1' : 'gap-3 pb-3',
      ]"
    >
      <RouterLink
        class="flex items-center font-display tracking-wide text-ink transition hover:text-spark"
        :class="playerFocus ? 'gap-1.5 text-sm' : 'gap-2.5 text-[1.35rem]'"
        to="/"
      >
        <span class="brand-dot" aria-hidden="true"></span>
        <span v-if="!playerFocus">习径</span>
        <span v-else class="sr-only">习径</span>
      </RouterLink>

      <div class="flex items-center gap-2">
        <nav
          v-if="auth.user.value && !focusMode"
          class="hidden items-center gap-5 md:flex"
          aria-label="主导航"
        >
          <RouterLink class="nav-link" to="/banks">题库</RouterLink>
          <RouterLink class="nav-link" to="/wrong-book">错题</RouterLink>
          <RouterLink class="nav-link" to="/favorites">收藏</RouterLink>
          <RouterLink class="nav-link" to="/notes">笔记</RouterLink>
          <RouterLink class="nav-link" to="/history">历史</RouterLink>
          <RouterLink v-if="auth.hasUpload.value" class="nav-link" to="/upload">上传</RouterLink>
          <RouterLink v-if="auth.admin.value" class="nav-link" to="/admin">权限</RouterLink>
          <RouterLink class="nav-link" to="/me">我的</RouterLink>
        </nav>

        <RouterLink
          v-if="!auth.user.value"
          class="btn-ghost !min-h-9 !px-3 !py-1.5 text-sm"
          to="/login"
        >
          登录
        </RouterLink>

        <RouterLink
          v-else-if="focusMode"
          class="btn-ghost text-sm"
          :class="playerFocus ? '!min-h-8 !px-2 !py-1' : '!min-h-9 !px-2 !py-1.5'"
          :to="focusExitTo"
        >
          {{ focusExitLabel }}
        </RouterLink>

        <ThemeToggle :compact="playerFocus" />
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
          <RouterLink class="tab-link" to="/banks">
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
            <path d="M12 8v4.5l3 1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          历史
        </RouterLink>
        <RouterLink v-if="auth.hasUpload.value" class="tab-link" to="/upload">
          <svg class="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 16V5m0 0 4 4M12 5 8 9M5 19h14"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          上传
        </RouterLink>
        <RouterLink v-if="auth.admin.value" class="tab-link" to="/admin">
          <svg class="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 3 4.5 7v5c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V7L12 3Z"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linejoin="round"
            />
          </svg>
          权限
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
