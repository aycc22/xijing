import { describe, expect, it } from 'vitest'
import { authRedirectPath, hashLooksLikeSupabaseAuth } from './authRecovery'

describe('authRecovery', () => {
  it('ignores vue-router hashes', () => {
    expect(hashLooksLikeSupabaseAuth('#/login')).toBe(false)
    expect(hashLooksLikeSupabaseAuth('#/reset-password')).toBe(false)
  })

  it('detects supabase recovery fragments', () => {
    expect(hashLooksLikeSupabaseAuth('#access_token=abc&type=recovery')).toBe(true)
    expect(authRedirectPath('', '#access_token=abc&type=recovery')).toBe('/reset-password')
  })
})
