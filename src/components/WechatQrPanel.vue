<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  loadWxLoginScript,
  saveOAuthIntent,
  wechatOpenAppId,
  wechatRedirectUri,
} from '../lib/wechat'

const props = defineProps<{
  /** 登录成功后要回到的应用内路径 */
  redirectAfter?: string
}>()

const containerId = `wechat-qr-${Math.random().toString(36).slice(2, 9)}`
const error = ref('')
const ready = ref(false)

async function renderQr() {
  error.value = ''
  ready.value = false
  const appId = wechatOpenAppId()
  if (!appId) {
    error.value = '未配置微信开放平台 AppID'
    return
  }

  try {
    await loadWxLoginScript()
    const el = document.getElementById(containerId)
    if (el) el.innerHTML = ''

    const state = saveOAuthIntent('open', props.redirectAfter)
    const redirectUri = wechatRedirectUri()

    if (!window.WxLogin) {
      throw new Error('微信 SDK 未就绪')
    }

    new window.WxLogin({
      self_redirect: false,
      id: containerId,
      appid: appId,
      scope: 'snsapi_login',
      redirect_uri: encodeURIComponent(redirectUri),
      state,
      style: 'white',
    })
    ready.value = true
  } catch (e) {
    error.value = e instanceof Error ? e.message : '二维码加载失败'
  }
}

onMounted(() => {
  void renderQr()
})

watch(
  () => props.redirectAfter,
  () => {
    void renderQr()
  },
)

onBeforeUnmount(() => {
  const el = document.getElementById(containerId)
  if (el) el.innerHTML = ''
})
</script>

<template>
  <div class="flex flex-col items-center gap-3">
    <div
      :id="containerId"
      class="flex min-h-[220px] w-full max-w-[300px] items-center justify-center overflow-hidden rounded-xl border border-line/70 bg-raise/40"
      aria-label="微信扫码登录"
    />
    <p v-if="!ready && !error" class="text-sm text-muted">正在加载二维码…</p>
    <p v-if="error" class="alert-error w-full text-center">{{ error }}</p>
    <p v-else class="text-center text-sm text-muted">使用微信扫一扫登录，无需填写邮箱</p>
    <button v-if="error" type="button" class="btn-secondary" @click="renderQr">重新加载</button>
  </div>
</template>
