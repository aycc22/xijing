/** 微信登录前端工具（开放平台扫码 / 公众号网页授权） */

export const WECHAT_OAUTH_STATE_KEY = 'xj_wechat_oauth_state'
export const WECHAT_OAUTH_CHANNEL_KEY = 'xj_wechat_oauth_channel'
export const WECHAT_OAUTH_REDIRECT_KEY = 'xj_wechat_oauth_redirect'

export type WechatChannel = 'open' | 'mp'

declare global {
  interface Window {
    WxLogin?: new (options: {
      self_redirect?: boolean
      id: string
      appid: string
      scope: string
      redirect_uri: string
      state: string
      style?: string
      href?: string
    }) => void
  }
}

/** 是否在微信内置浏览器中 */
export function isWechatBrowser(ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''): boolean {
  return /MicroMessenger/i.test(ua)
}

/** 是否已配置前端可见的开放平台 AppID（用于展示扫码） */
export function isWechatOpenLoginConfigured(): boolean {
  const id = import.meta.env.VITE_WECHAT_OPEN_APP_ID as string | undefined
  return Boolean(id && String(id).trim())
}

export function wechatOpenAppId(): string {
  return String(import.meta.env.VITE_WECHAT_OPEN_APP_ID || '').trim()
}

/**
 * 微信 OAuth 回调地址（不含 hash）。
 * 微信会把 ?code=&state= 拼在此 URL 后；Hash 路由在应用启动时再读 search 并跳转。
 */
export function wechatRedirectUri(): string {
  const base = import.meta.env.BASE_URL || '/'
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const joined = `${origin}${base}`
  return joined.endsWith('/') ? joined : `${joined}/`
}

export function createOAuthState(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
}

export function saveOAuthIntent(channel: WechatChannel, redirectAfter?: string) {
  const state = createOAuthState()
  sessionStorage.setItem(WECHAT_OAUTH_STATE_KEY, state)
  sessionStorage.setItem(WECHAT_OAUTH_CHANNEL_KEY, channel)
  if (redirectAfter) {
    sessionStorage.setItem(WECHAT_OAUTH_REDIRECT_KEY, redirectAfter)
  } else {
    sessionStorage.removeItem(WECHAT_OAUTH_REDIRECT_KEY)
  }
  return state
}

export function readOAuthIntent(): {
  state: string | null
  channel: WechatChannel
  redirectAfter: string | null
} {
  const channelRaw = sessionStorage.getItem(WECHAT_OAUTH_CHANNEL_KEY)
  const channel: WechatChannel = channelRaw === 'mp' ? 'mp' : 'open'
  return {
    state: sessionStorage.getItem(WECHAT_OAUTH_STATE_KEY),
    channel,
    redirectAfter: sessionStorage.getItem(WECHAT_OAUTH_REDIRECT_KEY),
  }
}

export function clearOAuthIntent() {
  sessionStorage.removeItem(WECHAT_OAUTH_STATE_KEY)
  sessionStorage.removeItem(WECHAT_OAUTH_CHANNEL_KEY)
  sessionStorage.removeItem(WECHAT_OAUTH_REDIRECT_KEY)
}

/** 从当前 URL 的 search 取出微信回调参数，并清理地址栏中的 code/state */
export function consumeWechatCallbackSearch(
  search = typeof window !== 'undefined' ? window.location.search : '',
): { code: string; state: string } | null {
  const params = new URLSearchParams(search)
  const code = params.get('code')
  const state = params.get('state')
  if (!code || !state) return null

  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href)
    url.searchParams.delete('code')
    url.searchParams.delete('state')
    const next = `${url.pathname}${url.search}${url.hash}`
    window.history.replaceState({}, '', next)
  }

  return { code, state }
}

/** 开放平台网站应用扫码 / 移动端授权页 */
export function buildOpenQrConnectUrl(appId: string, redirectUri: string, state: string): string {
  const url = new URL('https://open.weixin.qq.com/connect/qrconnect')
  url.searchParams.set('appid', appId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'snsapi_login')
  url.searchParams.set('state', state)
  return `${url.toString()}#wechat_redirect`
}

/** 公众号网页授权（仅微信内浏览器） */
export function buildMpOAuthUrl(appId: string, redirectUri: string, state: string): string {
  const url = new URL('https://open.weixin.qq.com/connect/oauth2/authorize')
  url.searchParams.set('appid', appId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'snsapi_userinfo')
  url.searchParams.set('state', state)
  return `${url.toString()}#wechat_redirect`
}

const WX_LOGIN_SCRIPT = 'https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js'

export function loadWxLoginScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('非浏览器环境'))
  if (window.WxLogin) return Promise.resolve()

  const existing = document.querySelector<HTMLScriptElement>(`script[src="${WX_LOGIN_SCRIPT}"]`)
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('微信 SDK 加载失败')), { once: true })
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = WX_LOGIN_SCRIPT
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('微信 SDK 加载失败'))
    document.head.appendChild(script)
  })
}
