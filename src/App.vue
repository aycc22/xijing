<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useAuth } from './composables/useAuth'

const auth = useAuth()
const route = useRoute()

onMounted(() => auth.init())

onUnmounted(() => {
  document.documentElement.classList.remove('home-lock')
  document.body.classList.remove('home-lock')
})

const focusMode = computed(() => {
  const name = route.name
  return name === 'quiz' || name === 'result' || name === 'exam' || name === 'exam-result'
})

const isHome = computed(() => route.name === 'home')

const showBottomNav = computed(() => Boolean(auth.user.value) && !focusMode.value)

watch(
  isHome,
  (home) => {
    document.documentElement.classList.toggle('home-lock', home)
    document.body.classList.toggle('home-lock', home)
  },
  { immediate: true },
)

const theme = ref<'dark' | 'light'>(
  document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
)

watch(
  theme,
  (t) => {
    document.documentElement.dataset.theme = t
    localStorage.setItem('xj-theme', t)
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', t === 'dark' ? '#0a0e14' : '#edf0f4')
  },
  { immediate: true },
)

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
}
</script>

<template>
  <div
    class="app-shell"
    :class="[
      isHome ? 'h-dvh max-h-dvh overflow-hidden' : '',
      showBottomNav
        ? 'pb-[calc(3rem+env(safe-area-inset-bottom,0px))] md:pb-10'
        : isHome
          ? 'pb-0'
          : 'pb-10',
    ]"
  >
    <header
      class="app-header z-30 -mx-4 flex shrink-0 items-center justify-between gap-3 border-b border-line/60 bg-night/85 px-4 pb-3 backdrop-blur-md md:-mx-6 md:px-6"
      :class="isHome ? 'static' : 'sticky top-0'"
    >
      <RouterLink
        class="flex items-center gap-2.5 font-display text-[1.35rem] tracking-wide text-ink transition hover:text-spark"
        to="/"
      >
        <span class="brand-dot" aria-hidden="true"></span>
        习径
      </RouterLink>

      <div class="flex items-center gap-2">
        <nav
          v-if="auth.user.value && !focusMode"
          class="hidden items-center gap-5 md:flex"
          aria-label="主导航"
        >
          <RouterLink class="nav-link" to="/banks">题库</RouterLink>
          <RouterLink class="nav-link" to="/wrong-book">错题</RouterLink>
          <RouterLink class="nav-link" to="/history">历史</RouterLink>
          <RouterLink v-if="auth.hasUpload.value" class="nav-link" to="/upload">上传</RouterLink>
          <RouterLink v-if="auth.admin.value" class="nav-link" to="/admin">权限</RouterLink>
          <button
            type="button"
            class="nav-link cursor-pointer border-0 bg-transparent p-0"
            @click="auth.signOut()"
          >
            退出
          </button>
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
          class="btn-ghost !min-h-9 !px-2 !py-1.5 text-sm"
          to="/banks"
        >
          退出刷题
        </RouterLink>

        <button
          type="button"
          class="icon-btn"
          :aria-label="theme === 'dark' ? '切换为亮色主题' : '切换为暗色主题'"
          @click="toggleTheme"
        >
          <svg v-if="theme === 'dark'" class="size-4.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linejoin="round"
            />
          </svg>
          <svg v-else class="size-4.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.7" />
            <path
              d="M12 2.5v2M12 19.5v2M4.3 4.3l1.4 1.4M18.3 18.3l1.4 1.4M2.5 12h2M19.5 12h2M4.3 19.7l1.4-1.4M18.3 5.7l1.4-1.4"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>
    </header>

    <main class="flex min-h-0 flex-1 flex-col" :class="isHome ? 'overflow-hidden pt-2' : 'pt-3 md:pt-5'">
      <RouterView v-slot="{ Component, route: viewRoute }">
        <div
          :key="viewRoute.fullPath"
          class="page-enter"
          :class="isHome ? 'flex min-h-0 flex-1 flex-col overflow-hidden' : ''"
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
        <button type="button" class="tab-link cursor-pointer border-0 bg-transparent" @click="auth.signOut()">
          <svg class="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M10 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H10M14 16l4-4-4-4M18 12H9"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          退出
        </button>
        </div>
      </nav>
    </Teleport>
  </div>
</template>
