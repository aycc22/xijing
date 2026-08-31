import { createApp } from 'vue'
import { registerSW } from 'virtual:pwa-register'
import './style.css'
import App from './App.vue'
import router from './router'
import { WECHAT_OAUTH_STATE_KEY } from './lib/wechat'

registerSW({ immediate: true })

/**
 * 微信 OAuth 回调落在「无 hash 的站点根路径 + ?code=&state=」。
 * 若本地有发起登录时写入的 state，则转入 hash 回调页继续建会话。
 */
function redirectWechatOAuthIfNeeded(): boolean {
  const pendingState = sessionStorage.getItem(WECHAT_OAUTH_STATE_KEY)
  if (!pendingState) return false

  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const state = params.get('state')
  if (!code || !state) return false

  const base = import.meta.env.BASE_URL || '/'
  const target = `${window.location.origin}${base}#/auth/wechat/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`
  const cleanPath = `${window.location.origin}${base}`
  window.history.replaceState({}, '', cleanPath)
  window.location.replace(target)
  return true
}

if (!redirectWechatOAuthIfNeeded()) {
  createApp(App).use(router).mount('#app')
}
