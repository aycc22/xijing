import { computed, ref } from 'vue'
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { FROZEN_ACCOUNT_MESSAGE, isAccountFrozen } from '../lib/accountGuard'
import { formatErrorMessage } from '../lib/errors'
import { siteRedirectTo } from '../lib/authRecovery'
import { supabase } from '../lib/supabase'
import { canUpload, isAdmin, type AccountStatus, type AppRole, type Profile } from '../lib/types'

const session = ref<Session | null>(null)
const profile = ref<Profile | null>(null)
const loading = ref(true)
let initialized = false
let recoveryHandler: (() => void) | null = null

function normalizeProfile(row: Record<string, unknown> | null): Profile | null {
  if (!row) return null
  return {
    id: String(row.id),
    display_name: (row.display_name as string | null) ?? null,
    role: (row.role as AppRole) ?? 'learner',
    status: ((row.status as AccountStatus) ?? 'active') as AccountStatus,
    avatar_url: (row.avatar_url as string | null) ?? null,
    created_at: String(row.created_at ?? ''),
  }
}

async function fetchProfile(userId: string) {
  let { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, role, status, avatar_url, created_at')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  if (!data) {
    const { data: ensured, error: ensureError } = await supabase.rpc('ensure_my_profile')
    if (ensureError) throw ensureError
    profile.value = normalizeProfile((ensured ?? null) as Record<string, unknown> | null)
    return
  }
  profile.value = normalizeProfile(data as Record<string, unknown>)
}

async function assertNotFrozen(userId: string) {
  await fetchProfile(userId)
  if (isAccountFrozen(profile.value?.status)) {
    await supabase.auth.signOut()
    session.value = null
    profile.value = null
    throw new Error(FROZEN_ACCOUNT_MESSAGE)
  }
}

export function useAuth() {
  async function init() {
    if (initialized) return
    initialized = true
    const { data } = await supabase.auth.getSession()
    session.value = data.session
    if (data.session?.user) {
      try {
        await assertNotFrozen(data.session.user.id)
      } catch (e) {
        console.error(e)
        if (!(e instanceof Error && e.message === FROZEN_ACCOUNT_MESSAGE)) {
          try {
            await fetchProfile(data.session.user.id)
          } catch (inner) {
            console.error(inner)
          }
        }
      }
    }
    loading.value = false

    supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, next: Session | null) => {
      session.value = next
      if (event === 'PASSWORD_RECOVERY') {
        recoveryHandler?.()
      }
      if (next?.user) {
        try {
          if (event !== 'PASSWORD_RECOVERY') {
            await assertNotFrozen(next.user.id)
          } else {
            await fetchProfile(next.user.id)
          }
        } catch (e) {
          console.error(e)
          if (!(e instanceof Error && e.message === FROZEN_ACCOUNT_MESSAGE)) {
            profile.value = null
          }
        }
      } else {
        profile.value = null
      }
    })
  }

  function onPasswordRecovery(handler: () => void) {
    recoveryHandler = handler
  }

  async function signInWithEmail(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(formatErrorMessage(error, '登录失败'))
    const uid = (await supabase.auth.getUser()).data.user?.id
    if (uid) await assertNotFrozen(uid)
  }

  async function signUpWithEmail(email: string, password: string, displayName?: string) {
    const { data, error } = await supabase.functions.invoke('email-auth', {
      body: {
        action: 'register',
        email,
        password,
        display_name: displayName || undefined,
      },
    })

    const payload = data as { error?: string; ok?: boolean } | null
    if (payload?.error) {
      throw new Error(formatErrorMessage(payload.error, payload.error))
    }
    if (error) {
      throw new Error(formatErrorMessage(error, '注册服务不可用'))
    }

    await signInWithEmail(email, password)
  }

  async function requestPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: siteRedirectTo(),
    })
    if (error) throw new Error(formatErrorMessage(error, '发送重置邮件失败'))
  }

  async function updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw new Error(formatErrorMessage(error, '更新密码失败'))
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  async function refreshProfile() {
    const uid = session.value?.user?.id
    if (uid) await fetchProfile(uid)
  }

  const user = computed<User | null>(() => session.value?.user ?? null)
  const role = computed<AppRole | null>(() => profile.value?.role ?? null)
  const hasUpload = computed(() => canUpload(role.value))
  const admin = computed(() => isAdmin(role.value))

  return {
    init,
    loading,
    session,
    user,
    profile,
    role,
    hasUpload,
    admin,
    signInWithEmail,
    signUpWithEmail,
    requestPasswordReset,
    updatePassword,
    onPasswordRecovery,
    signOut,
    refreshProfile,
  }
}
