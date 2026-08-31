/**
 * 微信登录 Edge Function
 *
 * 用微信授权 code 换取 openid / 用户资料，在 Supabase Auth 中创建或匹配用户
 *（email_confirm=true，无需邮箱验证），并返回 magiclink token_hash 供前端 verifyOtp。
 *
 * Secrets（Dashboard → Edge Functions → Secrets）:
 * - WECHAT_OPEN_APP_ID / WECHAT_OPEN_APP_SECRET  开放平台网站应用（扫码登录）
 * - WECHAT_MP_APP_ID / WECHAT_MP_APP_SECRET      可选：公众号（微信内浏览器网页授权）
 * - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY     平台自动注入
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type WechatChannel = 'open' | 'mp'

type TokenResponse = {
  access_token?: string
  openid?: string
  unionid?: string
  errcode?: number
  errmsg?: string
}

type UserInfoResponse = {
  nickname?: string
  headimgurl?: string
  errcode?: number
  errmsg?: string
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function syntheticEmail(openid: string): string {
  const id = openid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
  if (!id) throw new Error('无效的微信 openid')
  return `wx_${id}@wechat.xijing.app`
}

async function exchangeCode(
  appId: string,
  appSecret: string,
  code: string,
): Promise<{ accessToken: string; openid: string; unionid?: string }> {
  const url = new URL('https://api.weixin.qq.com/sns/oauth2/access_token')
  url.searchParams.set('appid', appId)
  url.searchParams.set('secret', appSecret)
  url.searchParams.set('code', code)
  url.searchParams.set('grant_type', 'authorization_code')

  const res = await fetch(url)
  const data = (await res.json()) as TokenResponse
  if (data.errcode || !data.access_token || !data.openid) {
    throw new Error(data.errmsg || `微信换票失败（${data.errcode ?? 'unknown'}）`)
  }
  return {
    accessToken: data.access_token,
    openid: data.openid,
    unionid: data.unionid,
  }
}

async function fetchUserInfo(accessToken: string, openid: string) {
  const url = new URL('https://api.weixin.qq.com/sns/userinfo')
  url.searchParams.set('access_token', accessToken)
  url.searchParams.set('openid', openid)
  url.searchParams.set('lang', 'zh_CN')

  const res = await fetch(url)
  const data = (await res.json()) as UserInfoResponse
  if (data.errcode) {
    console.warn('[wechat-auth] userinfo failed:', data.errmsg)
    return { nickname: undefined as string | undefined, avatarUrl: undefined as string | undefined }
  }
  return { nickname: data.nickname, avatarUrl: data.headimgurl }
}

function isAlreadyRegistered(message: string | undefined): boolean {
  if (!message) return false
  return /already|registered|exists|duplicate/i.test(message)
}

async function ensureUserAndToken(opts: {
  openid: string
  unionid?: string
  nickname?: string
  avatarUrl?: string
  channel: WechatChannel
}) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    throw new Error('缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY')
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const email = syntheticEmail(opts.openid)
  const displayName = opts.nickname?.trim() || '微信用户'
  const metadata = {
    display_name: displayName,
    avatar_url: opts.avatarUrl ?? null,
    provider: 'wechat',
    oauth_provider: opts.channel === 'mp' ? 'wechat_mp' : 'wechat_open',
    wechat_openid: opts.openid,
    wechat_unionid: opts.unionid ?? null,
    wechat_nickname: opts.nickname ?? null,
  }

  const { error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: metadata,
  })

  const isNew = !createError
  if (createError && !isAlreadyRegistered(createError.message)) {
    throw createError
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (linkError) throw linkError

  const tokenHash = linkData.properties?.hashed_token
  if (!tokenHash) throw new Error('未能生成登录凭证')

  const userId = linkData.user.id
  if (!isNew) {
    await admin.auth.admin.updateUserById(userId, { user_metadata: metadata })
  }

  await admin
    .from('profiles')
    .update({ display_name: displayName, updated_at: new Date().toISOString() })
    .eq('id', userId)

  return { token_hash: tokenHash, is_new: isNew }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const body = (await req.json()) as {
      action?: string
      code?: string
      channel?: WechatChannel
    }

    const openAppId = Deno.env.get('WECHAT_OPEN_APP_ID') ?? ''
    const openAppSecret = Deno.env.get('WECHAT_OPEN_APP_SECRET') ?? ''
    const mpAppId = Deno.env.get('WECHAT_MP_APP_ID') ?? ''
    const mpAppSecret = Deno.env.get('WECHAT_MP_APP_SECRET') ?? ''

    const action = body.action ?? 'login'

    if (action === 'get-config') {
      return json({
        open_app_id: openAppId || null,
        mp_enabled: Boolean(mpAppId && mpAppSecret),
        mp_app_id: mpAppId || null,
      })
    }

    if (action !== 'login') {
      return json({ error: `未知 action: ${action}` }, 400)
    }

    const code = body.code?.trim()
    if (!code) return json({ error: '缺少授权码 code' }, 400)

    const channel: WechatChannel = body.channel === 'mp' ? 'mp' : 'open'
    const appId = channel === 'mp' ? mpAppId : openAppId
    const appSecret = channel === 'mp' ? mpAppSecret : openAppSecret

    if (!appId || !appSecret) {
      return json(
        {
          error:
            channel === 'mp'
              ? '未配置公众号微信登录（WECHAT_MP_APP_ID / WECHAT_MP_APP_SECRET）'
              : '未配置开放平台微信登录（WECHAT_OPEN_APP_ID / WECHAT_OPEN_APP_SECRET）',
        },
        503,
      )
    }

    const token = await exchangeCode(appId, appSecret, code)
    const info = await fetchUserInfo(token.accessToken, token.openid)
    const result = await ensureUserAndToken({
      openid: token.openid,
      unionid: token.unionid,
      nickname: info.nickname,
      avatarUrl: info.avatarUrl,
      channel,
    })

    return json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : '微信登录失败'
    console.error('[wechat-auth]', message)
    return json({ error: message }, 400)
  }
})
