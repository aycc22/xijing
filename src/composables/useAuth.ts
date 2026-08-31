import { computed, ref } from 'vue'
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { canUpload, isAdmin, type AppRole, type Profile } from '../lib/types'

const session = ref<Session | null>(null)
const profile = ref<Profile | null>(null)
const loading = ref(true)
let initialized = false

function authRedirectUrl(): string {
  const base = import.meta.env.BASE_URL || '/'
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}${base}`.replace(/\/+$/, '') + '/'
}

async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, role, created_at')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  profile.value = data as Profile | null
}

export function useAuth() {
  async function init() {
    if (initialized) return
    initialized = true
    const { data } = await supabase.auth.getSession()
    session.value = data.session
    if (data.session?.user) {
      try {
        await fetchProfile(data.session.user.id)
      } catch (e) {
        console.error(e)
      }
    }
    loading.value = false

    supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, next: Session | null) => {
      session.value = next
      if (next?.user) {
        try {
          await fetchProfile(next.user.id)
        } catch (e) {
          console.error(e)
          profile.value = null
        }
      } else {
        profile.value = null
      }
    })
  }

  async function signInWithEmail(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUpWithEmail(email: string, password: string, displayName?: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: authRedirectUrl(),
        data: { display_name: displayName || undefined },
      },
    })
    if (error) throw error
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
    signOut,
    refreshProfile,
  }
}
