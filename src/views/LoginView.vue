<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const auth = useAuth()
const router = useRouter()
const route = useRoute()

const mode = ref<'signin' | 'signup'>('signin')
const email = ref('')
const password = ref('')
const displayName = ref('')
const error = ref('')
const busy = ref(false)
const notice = ref('')

async function submit() {
  error.value = ''
  notice.value = ''
  busy.value = true
  try {
    if (mode.value === 'signin') {
      await auth.signInWithEmail(email.value.trim(), password.value)
    } else {
      await auth.signUpWithEmail(email.value.trim(), password.value, displayName.value.trim())
      notice.value = '注册成功。若邮箱需确认，请先到邮箱点开链接；确认后即可登录。'
    }
    await auth.refreshProfile()
    if (auth.user.value) {
      const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/banks'
      await router.replace(redirect)
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : '操作失败'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-md">
    <section class="py-4 md:py-6">
      <p class="page-kicker">账号</p>
      <h1 class="page-title">{{ mode === 'signin' ? '登录' : '注册' }}</h1>
      <p class="page-lede">个人备考与共享刷题，同一套账号。</p>
    </section>

    <div class="seg mb-5" role="tablist" aria-label="登录或注册">
      <button
        type="button"
        role="tab"
        class="seg-btn"
        :class="mode === 'signin' ? 'seg-btn-on' : ''"
        :aria-selected="mode === 'signin'"
        @click="mode = 'signin'"
      >
        登录
      </button>
      <button
        type="button"
        role="tab"
        class="seg-btn"
        :class="mode === 'signup' ? 'seg-btn-on' : ''"
        :aria-selected="mode === 'signup'"
        @click="mode = 'signup'"
      >
        注册
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
      <div class="field">
        <label for="password">密码</label>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          minlength="6"
          autocomplete="current-password"
        />
      </div>
      <p v-if="error" class="alert-error">{{ error }}</p>
      <p v-if="notice" class="alert-info">{{ notice }}</p>
      <button class="btn btn-block" type="submit" :disabled="busy">
        {{ busy ? '处理中…' : mode === 'signin' ? '登录' : '注册' }}
      </button>
    </form>
  </div>
</template>
