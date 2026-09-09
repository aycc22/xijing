<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { formatErrorMessage } from '../lib/errors'

const auth = useAuth()
const router = useRouter()
const route = useRoute()

type Mode = 'signin' | 'signup' | 'forgot'

const mode = ref<Mode>('signin')
const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const displayName = ref('')
const error = ref('')
const notice = ref('')
const busy = ref(false)

const redirectAfter = computed(() =>
  typeof route.query.redirect === 'string' ? route.query.redirect : '/banks',
)

async function submit() {
  error.value = ''
  notice.value = ''
  busy.value = true
  try {
    if (mode.value === 'forgot') {
      if (!email.value.trim()) {
        error.value = '请输入邮箱'
        return
      }
      await auth.requestPasswordReset(email.value.trim())
      notice.value = '如果该邮箱已注册，你将收到一封重置密码邮件。请按邮件中的链接设置新密码。'
      return
    }
    if (mode.value === 'signin') {
      await auth.signInWithEmail(email.value.trim(), password.value)
    } else {
      if (password.value !== passwordConfirm.value) {
        error.value = '两次输入的密码不一致'
        return
      }
      await auth.signUpWithEmail(email.value.trim(), password.value, displayName.value.trim())
    }
    await auth.refreshProfile()
    if (auth.user.value) {
      await router.replace(redirectAfter.value)
    }
  } catch (e) {
    error.value = formatErrorMessage(e, '操作失败')
  } finally {
    busy.value = false
  }
}

function switchMode(next: Mode) {
  mode.value = next
  error.value = ''
  notice.value = ''
}
</script>

<template>
  <div class="mx-auto max-w-md">
    <section class="py-4 md:py-6">
      <p class="page-kicker">账号</p>
      <h1 class="page-title">
        {{ mode === 'signin' ? '登录' : mode === 'signup' ? '注册' : '重置密码' }}
      </h1>
      <p class="page-lede">
        {{
          mode === 'forgot'
            ? '输入注册邮箱，我们将发送重置链接。邮件中的链接打开后即可设置新密码。'
            : '个人备考与共享刷题，同一套账号。注册后可直接登录，无需邮箱验证。'
        }}
      </p>
    </section>

    <div v-if="mode !== 'forgot'" class="seg mb-5" role="tablist" aria-label="登录或注册">
      <button
        type="button"
        role="tab"
        class="seg-btn"
        :class="mode === 'signin' ? 'seg-btn-on' : ''"
        :aria-selected="mode === 'signin'"
        @click="switchMode('signin')"
      >
        邮箱登录
      </button>
      <button
        type="button"
        role="tab"
        class="seg-btn"
        :class="mode === 'signup' ? 'seg-btn-on' : ''"
        :aria-selected="mode === 'signup'"
        @click="switchMode('signup')"
      >
        邮箱注册
      </button>
    </div>

    <form class="surface flex flex-col gap-4 md:p-6" @submit.prevent="submit">
      <div v-if="mode === 'signup'" class="field">
        <label for="name">昵称</label>
        <input id="name" v-model="displayName" autocomplete="nickname" placeholder="可选" />
      </div>
      <div class="field">
        <label for="email">邮箱</label>
        <input id="email" v-model="email" type="email" required autocomplete="email" />
      </div>
      <div v-if="mode !== 'forgot'" class="field">
        <label for="password">密码</label>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          minlength="6"
          :autocomplete="mode === 'signup' ? 'new-password' : 'current-password'"
        />
      </div>
      <div v-if="mode === 'signup'" class="field">
        <label for="password-confirm">确认密码</label>
        <input
          id="password-confirm"
          v-model="passwordConfirm"
          type="password"
          required
          minlength="6"
          autocomplete="new-password"
        />
      </div>
      <p v-if="error" class="alert-error">{{ error }}</p>
      <p v-if="notice" class="alert-info">{{ notice }}</p>
      <button class="btn btn-block" type="submit" :disabled="busy">
        {{
          busy
            ? '处理中…'
            : mode === 'signin'
              ? '登录'
              : mode === 'signup'
                ? '注册'
                : '发送重置邮件'
        }}
      </button>
      <button
        v-if="mode === 'signin'"
        class="btn-ghost btn-block text-sm"
        type="button"
        @click="switchMode('forgot')"
      >
        忘记密码？
      </button>
      <button
        v-else-if="mode === 'forgot'"
        class="btn-ghost btn-block text-sm"
        type="button"
        @click="switchMode('signin')"
      >
        返回登录
      </button>
    </form>
  </div>
</template>
