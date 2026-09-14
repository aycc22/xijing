<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import ThemeToggle from '../components/ThemeToggle.vue'
import { useAppRefresh } from '../composables/useAppRefresh'
import { useAuth } from '../composables/useAuth'
import { useTheme } from '../composables/useTheme'
import { formatErrorMessage } from '../lib/errors'
import type { AppRole } from '../lib/types'

const auth = useAuth()
const router = useRouter()
const { theme } = useTheme()
const { refreshing, error: refreshError, refresh } = useAppRefresh()

const resetting = ref(false)
const loggingOut = ref(false)
const error = ref('')
const notice = ref('')

const roleLabel: Record<AppRole, string> = {
  learner: '学习者',
  uploader: '上传者',
  admin: '管理员',
}

const displayName = computed(
  () => auth.profile.value?.display_name?.trim() || auth.user.value?.email?.split('@')[0] || '未设置',
)
const email = computed(() => auth.user.value?.email ?? '')
const role = computed(() => auth.profile.value?.role ?? 'learner')
const initial = computed(() => displayName.value.slice(0, 1).toUpperCase())

async function sendResetEmail() {
  error.value = ''
  notice.value = ''
  if (!email.value) {
    error.value = '当前账号没有可发送的邮箱'
    return
  }
  resetting.value = true
  try {
    await auth.requestPasswordReset(email.value)
    notice.value = '如果该邮箱已注册，你将收到一封重置密码邮件。请按邮件中的链接设置新密码。'
  } catch (err) {
    error.value = formatErrorMessage(err, '发送重置邮件失败')
  } finally {
    resetting.value = false
  }
}

async function logout() {
  error.value = ''
  loggingOut.value = true
  try {
    await auth.signOut()
    await router.replace('/login')
  } catch (err) {
    error.value = formatErrorMessage(err, '退出失败')
  } finally {
    loggingOut.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 pb-4">
    <article class="flex items-center gap-3.5 rounded-3xl border border-line bg-surface p-5">
      <span
        class="grid size-12 shrink-0 place-items-center rounded-2xl bg-spark/12 text-lg font-semibold text-spark ring-1 ring-spark/25 ring-inset"
        aria-hidden="true"
      >
        {{ initial }}
      </span>
      <div class="min-w-0 flex-1">
        <p class="m-0 truncate text-lg font-semibold text-ink">{{ displayName }}</p>
        <p class="m-0 mt-0.5 truncate text-sm text-muted">{{ email || '未绑定邮箱' }}</p>
      </div>
      <span class="chip-gold shrink-0">{{ roleLabel[role] }}</span>
    </article>

    <div class="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
      <div>
        <p class="m-0 font-medium text-ink">外观</p>
        <p class="m-0 mt-1 text-sm text-muted">
          {{ theme === 'dark' ? '夜径 · 暗色' : '晨光 · 亮色' }}
        </p>
      </div>
      <ThemeToggle />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <RouterLink
        v-if="auth.hasUpload.value"
        class="rounded-2xl border border-line bg-surface p-4 no-underline"
        to="/upload"
      >
        <p class="m-0 text-[15px] font-medium text-ink">上传题库</p>
        <p class="mt-0.5 m-0 text-[12px] text-muted">管理自己的题库</p>
      </RouterLink>
      <RouterLink
        v-if="auth.admin.value"
        class="rounded-2xl border border-line bg-surface p-4 no-underline"
        to="/admin"
      >
        <p class="m-0 text-[15px] font-medium text-ink">权限</p>
        <p class="mt-0.5 m-0 text-[12px] text-muted">账号与角色</p>
      </RouterLink>
      <RouterLink class="rounded-2xl border border-line bg-surface p-4 no-underline" to="/favorites">
        <p class="m-0 text-[15px] font-medium text-ink">收藏</p>
        <p class="mt-0.5 m-0 text-[12px] text-muted">收藏的题目</p>
      </RouterLink>
      <RouterLink class="rounded-2xl border border-line bg-surface p-4 no-underline" to="/notes">
        <p class="m-0 text-[15px] font-medium text-ink">笔记</p>
        <p class="mt-0.5 m-0 text-[12px] text-muted">私人笔记</p>
      </RouterLink>
    </div>

    <p v-if="error" class="alert-error m-0">{{ error }}</p>
    <p v-if="notice" class="alert-info m-0">{{ notice }}</p>
    <p v-if="refreshError" class="alert-error m-0">{{ refreshError }}</p>

    <button
      class="btn-secondary btn-block"
      type="button"
      :disabled="refreshing"
      @click="refresh()"
    >
      {{ refreshing ? '正在刷新…' : '刷新最新版' }}
    </button>
    <button
      class="btn-secondary btn-block"
      type="button"
      :disabled="resetting || loggingOut || !email"
      @click="sendResetEmail"
    >
      {{ resetting ? '发送中…' : '发送重置密码邮件' }}
    </button>
    <button
      class="btn-ghost btn-block text-bad"
      type="button"
      :disabled="loggingOut || resetting"
      @click="logout"
    >
      {{ loggingOut ? '退出中…' : '退出登录' }}
    </button>
  </div>
</template>
