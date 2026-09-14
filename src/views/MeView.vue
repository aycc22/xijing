<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import ThemeToggle from '../components/ThemeToggle.vue'
import { useAuth } from '../composables/useAuth'
import { useTheme } from '../composables/useTheme'
import { formatErrorMessage } from '../lib/errors'
import type { AppRole } from '../lib/types'

const auth = useAuth()
const router = useRouter()
const { theme } = useTheme()

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
  <div>
    <section class="py-4 md:py-6">
      <p class="page-kicker">账号</p>
      <h1 class="page-title">我的</h1>
      <p class="page-lede">查看资料、切换主题或退出登录。改密走邮箱链接，不会在此页填写密码。</p>
    </section>

    <div class="flex flex-col gap-3">
      <article class="surface flex flex-col gap-3">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="m-0 text-lg font-semibold text-ink">{{ displayName }}</p>
            <p class="m-0 mt-1 break-all text-sm text-muted">{{ email || '未绑定邮箱' }}</p>
          </div>
          <span class="chip-lit shrink-0">{{ roleLabel[role] }}</span>
        </div>
      </article>

      <div class="surface flex items-center justify-between gap-3">
        <div>
          <p class="m-0 font-medium text-ink">外观</p>
          <p class="m-0 mt-1 text-sm text-muted">
            {{ theme === 'dark' ? '夜径 · 暗色' : '晨光 · 亮色' }}
          </p>
        </div>
        <ThemeToggle />
      </div>

      <p v-if="error" class="alert-error m-0">{{ error }}</p>
      <p v-if="notice" class="alert-info m-0">{{ notice }}</p>

      <button
        class="btn-secondary btn-block"
        type="button"
        :disabled="resetting || loggingOut || !email"
        @click="sendResetEmail"
      >
        {{ resetting ? '发送中…' : '发送重置密码邮件' }}
      </button>
      <button class="btn btn-block" type="button" :disabled="loggingOut || resetting" @click="logout">
        {{ loggingOut ? '退出中…' : '退出登录' }}
      </button>
    </div>
  </div>
</template>
