<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import {
  clearOAuthIntent,
  consumeWechatCallbackSearch,
  readOAuthIntent,
} from '../lib/wechat'

const auth = useAuth()
const router = useRouter()
const error = ref('')
const status = ref('正在完成微信登录…')
let started = false

onMounted(async () => {
  if (started) return
  started = true

  try {
    await auth.init()

    // 优先读地址栏 search（微信回调落在 hash 外）；亦兼容路由 query
    const fromSearch = consumeWechatCallbackSearch()
    const route = router.currentRoute.value
    const code =
      fromSearch?.code || (typeof route.query.code === 'string' ? route.query.code : '')
    const returnedState =
      fromSearch?.state || (typeof route.query.state === 'string' ? route.query.state : '')

    if (!code || !returnedState) {
      throw new Error('缺少微信授权参数，请返回登录页重试')
    }

    const intent = readOAuthIntent()
    if (!intent.state || intent.state !== returnedState) {
      clearOAuthIntent()
      throw new Error('安全校验失败，请返回登录页重新扫码')
    }

    const channel = intent.channel
    const redirectAfter = intent.redirectAfter || '/banks'
    clearOAuthIntent()

    status.value = '正在验证微信账号…'
    await auth.signInWithWechatCode(code, channel)
    status.value = '登录成功，正在跳转…'
    await router.replace(redirectAfter)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '微信登录失败'
    status.value = ''
  }
})
</script>

<template>
  <div class="mx-auto max-w-md py-10">
    <section class="surface flex flex-col gap-4 text-center md:p-6">
      <p class="page-kicker">微信登录</p>
      <h1 class="page-title text-[1.6rem]">{{ error ? '登录未完成' : '正在登录' }}</h1>
      <p v-if="status" class="text-muted">{{ status }}</p>
      <p v-if="error" class="alert-error text-left">{{ error }}</p>
      <RouterLink v-if="error" class="btn btn-block" to="/login">返回登录</RouterLink>
    </section>
  </div>
</template>
