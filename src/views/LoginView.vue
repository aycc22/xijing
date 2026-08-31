<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import WechatQrPanel from '../components/WechatQrPanel.vue'
import { useAuth } from '../composables/useAuth'
import { supabase } from '../lib/supabase'
import {
  buildMpOAuthUrl,
  buildOpenQrConnectUrl,
  isWechatBrowser,
  isWechatOpenLoginConfigured,
  saveOAuthIntent,
  wechatOpenAppId,
  wechatRedirectUri,
} from '../lib/wechat'

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
const wechatBusy = ref(false)

const openConfigured = isWechatOpenLoginConfigured()
const inWechat = isWechatBrowser()
const mpEnabled = ref(false)
const mpAppId = ref('')
const showQr = ref(!inWechat && openConfigured)

const redirectAfter = computed(() =>
  typeof route.query.redirect === 'string' ? route.query.redirect : '/banks',
)

const wechatAvailable = computed(() => openConfigured || mpEnabled.value)

onMounted(async () => {
  if (!openConfigured && !inWechat) return
  try {
    const { data, error: fnError } = await supabase.functions.invoke('wechat-auth', {
      body: { action: 'get-config' },
    })
    if (fnError) return
    const cfg = data as { mp_enabled?: boolean; mp_app_id?: string | null } | null
    mpEnabled.value = Boolean(cfg?.mp_enabled)
    mpAppId.value = cfg?.mp_app_id || ''
  } catch {
    // Edge Function 未部署时静默忽略，仍可用前端 AppID 扫码（后端 login 时再报错）
  }
})

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
      await router.replace(redirectAfter.value)
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : '操作失败'
  } finally {
    busy.value = false
  }
}

function startWechatRedirect(channel: 'open' | 'mp') {
  error.value = ''
  wechatBusy.value = true
  try {
    const state = saveOAuthIntent(channel, redirectAfter.value)
    const redirectUri = wechatRedirectUri()

    if (channel === 'mp') {
      if (!mpAppId.value) {
        throw new Error('未配置公众号微信登录')
      }
      window.location.href = buildMpOAuthUrl(mpAppId.value, redirectUri, state)
      return
    }

    const appId = wechatOpenAppId()
    if (!appId) throw new Error('未配置开放平台 AppID')
    window.location.href = buildOpenQrConnectUrl(appId, redirectUri, state)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '无法打开微信登录'
    wechatBusy.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-md">
    <section class="py-4 md:py-6">
      <p class="page-kicker">账号</p>
      <h1 class="page-title">{{ mode === 'signin' ? '登录' : '注册' }}</h1>
      <p class="page-lede">个人备考与共享刷题，同一套账号。微信登录无需验证邮箱。</p>
    </section>

    <div v-if="wechatAvailable" class="surface mb-5 flex flex-col gap-4 md:p-6">
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-sm font-medium text-ink">微信登录</p>
          <p class="mt-0.5 text-sm text-muted">扫码或授权后即可进入，跳过邮箱注册</p>
        </div>
      </div>

      <template v-if="inWechat">
        <button
          v-if="mpEnabled"
          type="button"
          class="btn btn-block"
          :disabled="wechatBusy"
          @click="startWechatRedirect('mp')"
        >
          {{ wechatBusy ? '跳转中…' : '使用微信一键登录' }}
        </button>
        <template v-else-if="openConfigured">
          <p class="alert-info">
            当前在微信内打开。请使用手机浏览器打开本页并扫码，或联系管理员配置公众号网页授权。
          </p>
          <button type="button" class="btn-secondary btn-block" @click="showQr = !showQr">
            {{ showQr ? '收起二维码' : '显示扫码二维码' }}
          </button>
          <WechatQrPanel v-if="showQr" :redirect-after="redirectAfter" />
        </template>
      </template>

      <template v-else>
        <div class="hidden sm:block">
          <WechatQrPanel :redirect-after="redirectAfter" />
        </div>
        <div class="flex flex-col gap-2 sm:hidden">
          <button
            type="button"
            class="btn btn-block"
            :disabled="wechatBusy || !openConfigured"
            @click="startWechatRedirect('open')"
          >
            {{ wechatBusy ? '跳转中…' : '打开微信登录' }}
          </button>
          <button type="button" class="btn-ghost btn-block text-sm" @click="showQr = !showQr">
            {{ showQr ? '收起二维码' : '显示二维码' }}
          </button>
          <WechatQrPanel v-if="showQr" :redirect-after="redirectAfter" />
        </div>
      </template>
    </div>

    <div class="seg mb-5" role="tablist" aria-label="登录或注册">
      <button
        type="button"
        role="tab"
        class="seg-btn"
        :class="mode === 'signin' ? 'seg-btn-on' : ''"
        :aria-selected="mode === 'signin'"
        @click="mode = 'signin'"
      >
        邮箱登录
      </button>
      <button
        type="button"
        role="tab"
        class="seg-btn"
        :class="mode === 'signup' ? 'seg-btn-on' : ''"
        :aria-selected="mode === 'signup'"
        @click="mode = 'signup'"
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
