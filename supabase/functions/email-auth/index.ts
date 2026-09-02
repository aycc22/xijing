/**
 * 邮箱注册 Edge Function
 *
 * 使用 Admin API 创建已确认邮箱的用户，无需邮件激活链接。
 *
 * Secrets: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY（平台自动注入）
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function isAlreadyRegistered(message: string | undefined): boolean {
  if (!message) return false
  return /already|registered|exists|duplicate/i.test(message)
}

function validateEmail(email: string): string | null {
  const trimmed = email.trim()
  if (!trimmed) return '请输入邮箱'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return '邮箱格式不正确'
  return null
}

function validatePassword(password: string): string | null {
  if (!password) return '请输入密码'
  if (password.length < 6) return '密码至少 6 位'
  return null
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
      email?: string
      password?: string
      display_name?: string
    }

    if (body.action !== 'register') {
      return json({ error: `未知 action: ${body.action ?? ''}` }, 400)
    }

    const email = body.email?.trim() ?? ''
    const password = body.password ?? ''
    const displayName = body.display_name?.trim()

    const emailError = validateEmail(email)
    if (emailError) return json({ error: emailError }, 400)

    const passwordError = validatePassword(password)
    if (passwordError) return json({ error: passwordError }, 400)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceKey) {
      throw new Error('缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY')
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const metadata = displayName ? { display_name: displayName } : undefined

    const { error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    })

    if (createError) {
      if (isAlreadyRegistered(createError.message)) {
        return json({ error: '该邮箱已注册，请直接登录' }, 400)
      }
      throw createError
    }

    return json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : '注册失败'
    console.error('[email-auth]', message)
    return json({ error: message }, 400)
  }
})
